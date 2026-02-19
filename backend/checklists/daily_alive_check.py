import argparse
import json
import sys
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

sys.path.insert(0, sys.path[0] + "/..")

from conn import get_supabase_client
from db import get_connection


def get_week_string(dt: datetime) -> str:
    return dt.strftime("%G-W%V")


def parse_utm_codes(utm_code_raw) -> list[str]:
    if not utm_code_raw:
        return []
    if isinstance(utm_code_raw, str):
        utm_code_raw = utm_code_raw.strip()
        if not utm_code_raw or utm_code_raw == "[]":
            return []
        codes = json.loads(utm_code_raw)
    else:
        codes = utm_code_raw
    if not isinstance(codes, list):
        codes = [codes]
    return [c for c in codes if c]


def query_yesterday_spend(utm_codes: list[str], yesterday_str: str) -> dict[str, float]:
    conn = get_connection()
    cur = conn.cursor()

    placeholders = ",".join(["%s"] * len(utm_codes))
    sql = f"""
        SELECT regexp_replace(ad_code, '^\\[[^]]*\\]', '') AS utm_code,
               COALESCE(SUM(spend), 0) AS daily_spend
        FROM ad_performance.meta_daily_perform
        WHERE regexp_replace(ad_code, '^\\[[^]]*\\]', '') IN ({placeholders})
          AND date = %s
        GROUP BY regexp_replace(ad_code, '^\\[[^]]*\\]', '')
    """

    params = utm_codes + [yesterday_str]
    cur.execute(sql, params)

    columns = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    cur.close()

    spend_map = {}
    for row in rows:
        row_dict = dict(zip(columns, row))
        spend_map[row_dict["utm_code"]] = float(row_dict["daily_spend"])

    return spend_map


def daily_alive_check() -> dict:
    kst = ZoneInfo("Asia/Seoul")
    now_kst = datetime.now(kst)
    yesterday_kst = now_kst - timedelta(days=1)
    yesterday_str = yesterday_kst.strftime("%Y-%m-%d")

    current_week = get_week_string(now_kst)
    prev_monday = datetime.strptime(current_week + "-1", "%G-W%V-%u") - timedelta(days=7)
    previous_week = prev_monday.strftime("%G-W%V")

    print(f"[daily_alive_check] Running for yesterday={yesterday_str}, current_week={current_week}, previous_week={previous_week}")

    client = get_supabase_client()

    # Get current week checklists with UTM codes
    current_checklists = (
        client.table("checklists")
        .select("id, product_id, copy_type_id, team_id, utm_code, status, notes")
        .eq("week", current_week)
        .execute()
        .data
    )
    current_with_utm = [c for c in current_checklists if parse_utm_codes(c.get("utm_code"))]

    # Get previous week checklists with UTM codes (for re-activation pool)
    prev_checklists = (
        client.table("checklists")
        .select("id, product_id, copy_type_id, team_id, utm_code")
        .eq("week", previous_week)
        .execute()
        .data
    )
    prev_with_utm = [c for c in prev_checklists if parse_utm_codes(c.get("utm_code"))]

    # Collect ALL unique UTM codes from both weeks
    all_utm_codes = set()
    for c in current_with_utm:
        all_utm_codes.update(parse_utm_codes(c.get("utm_code")))
    for c in prev_with_utm:
        all_utm_codes.update(parse_utm_codes(c.get("utm_code")))

    if not all_utm_codes:
        print("[daily_alive_check] No UTM codes found in current or previous week checklists")
        return {"checked": 0, "removed": 0, "reactivated": 0, "details": []}

    print(f"[daily_alive_check] Checking {len(all_utm_codes)} unique UTM codes")

    # Query yesterday's spend
    spend_map = query_yesterday_spend(list(all_utm_codes), yesterday_str)

    alive_utms = {utm for utm, spend in spend_map.items() if spend > 0}
    dead_utms = all_utm_codes - alive_utms
    print(f"[daily_alive_check] Alive: {len(alive_utms)}, Dead: {len(dead_utms)}")

    # Build set of all UTMs currently assigned in current week
    current_utm_set = set()
    for c in current_with_utm:
        current_utm_set.update(parse_utm_codes(c.get("utm_code")))

    # Build triple-to-checklist mapping for current week (all checklists, not just those with UTMs)
    current_by_triple = {}
    for c in current_checklists:
        triple = (c["product_id"], c["copy_type_id"], c["team_id"])
        current_by_triple[triple] = c

    removed_count = 0
    reactivated_count = 0
    details = []

    # Step 1: Remove dead UTMs from current week checklists
    for c in current_with_utm:
        codes = parse_utm_codes(c.get("utm_code"))
        alive_codes = [code for code in codes if code in alive_utms]
        dead_codes = [code for code in codes if code not in alive_utms]

        if dead_codes:
            removed_count += len(dead_codes)
            new_utm = json.dumps(alive_codes) if alive_codes else None
            data = {
                "utm_code": new_utm,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            client.table("checklists").update(data).eq("id", c["id"]).execute()

            detail = {
                "checklist_id": c["id"],
                "action": "remove_dead",
                "removed": dead_codes,
                "remaining": alive_codes,
            }
            details.append(detail)
            print(f"  [remove] Checklist {c['id']}: removed {dead_codes}, remaining {alive_codes}")

    # Step 2: Re-activate alive UTMs from previous week
    # Rebuild current_utm_set after removals
    updated_current = (
        client.table("checklists")
        .select("id, product_id, copy_type_id, team_id, utm_code")
        .eq("week", current_week)
        .execute()
        .data
    )
    current_utm_set_after = set()
    for c in updated_current:
        current_utm_set_after.update(parse_utm_codes(c.get("utm_code")))
    # Rebuild triple mapping after removals
    current_by_triple_after = {}
    for c in updated_current:
        triple = (c["product_id"], c["copy_type_id"], c["team_id"])
        current_by_triple_after[triple] = c

    for c in prev_with_utm:
        codes = parse_utm_codes(c.get("utm_code"))
        for code in codes:
            if code in alive_utms and code not in current_utm_set_after:
                # Find matching current week checklist by triple
                triple = (c["product_id"], c["copy_type_id"], c["team_id"])
                target = current_by_triple_after.get(triple)
                if target:
                    existing_codes = parse_utm_codes(target.get("utm_code"))
                    existing_codes.append(code)
                    data = {
                        "utm_code": json.dumps(existing_codes),
                        "status": "completed",
                        "notes": "auto-carry",
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                    client.table("checklists").update(data).eq("id", target["id"]).execute()

                    # Update local tracking
                    current_utm_set_after.add(code)
                    target["utm_code"] = json.dumps(existing_codes)

                    reactivated_count += 1
                    detail = {
                        "checklist_id": target["id"],
                        "action": "reactivate",
                        "utm_code": code,
                        "triple": list(triple),
                    }
                    details.append(detail)
                    print(f"  [reactivate] UTM {code} -> Checklist {target['id']} (triple={triple})")

    summary = {
        "date": yesterday_str,
        "current_week": current_week,
        "previous_week": previous_week,
        "checked": len(all_utm_codes),
        "alive": len(alive_utms),
        "dead": len(dead_utms),
        "removed": removed_count,
        "reactivated": reactivated_count,
        "details": details,
    }

    print(f"[daily_alive_check] Summary: checked={len(all_utm_codes)}, removed={removed_count}, reactivated={reactivated_count}")
    return summary


def main():
    result = daily_alive_check()
    print(f"\nResult: checked={result['checked']}, removed={result['removed']}, reactivated={result['reactivated']}")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Daily UTM alive check - removes dead UTMs and re-activates alive ones")
    args = parser.parse_args()
    main()

import argparse
import json
import sys
from datetime import datetime, timedelta
sys.path.insert(0, sys.path[0] + "/..")

from conn import get_supabase_client
from checklists.check_alive_ads import check_alive_ads


def get_current_week() -> str:
    now = datetime.now()
    return now.strftime("%G-W%V")


def get_previous_week(week: str) -> str:
    monday = datetime.strptime(week + "-1", "%G-W%V-%u")
    prev_monday = monday - timedelta(days=7)
    return prev_monday.strftime("%G-W%V")


def init_week_checklists(week: str = None):
    """새 주차의 체크리스트를 초기화 (팀별 상품 x 유형 조합)"""
    if week is None:
        week = get_current_week()

    client = get_supabase_client()

    # 팀별 상품 조합과 유형 조회
    team_products = client.table("team_products").select("team_id, product_id").eq("active", True).execute().data
    copy_types = client.table("copy_types").select("id").is_("parent_id", None).execute().data

    # 기존 체크리스트 조회
    existing = client.table("checklists").select("product_id, copy_type_id, team_id").eq("week", week).execute().data
    existing_triples = {(item["product_id"], item["copy_type_id"], item["team_id"]) for item in existing}

    # 이전 주차 체크리스트에서 UTM 코드가 있는 항목 조회
    prev_week = get_previous_week(week)
    prev_checklists = (
        client.table("checklists")
        .select("product_id, copy_type_id, team_id, utm_code")
        .eq("week", prev_week)
        .neq("utm_code", "")
        .neq("utm_code", "[]")
        .execute()
        .data
    )
    prev_checklists = [item for item in prev_checklists if item.get("utm_code")]

    # 이전 주차의 UTM 코드 수집 및 alive 체크
    prev_by_triple = {}
    all_utm_codes = set()
    for item in prev_checklists:
        utm_code_raw = item["utm_code"]
        codes = json.loads(utm_code_raw) if isinstance(utm_code_raw, str) else utm_code_raw
        if not isinstance(codes, list):
            codes = [codes]
        triple = (item["product_id"], item["copy_type_id"], item["team_id"])
        prev_by_triple[triple] = {"utm_code": utm_code_raw, "codes": codes}
        all_utm_codes.update(codes)

    alive_results = {}
    if all_utm_codes:
        alive_results = check_alive_ads(list(all_utm_codes), week)

    # 누락된 조합만 생성
    new_checklists = []
    for tp in team_products:
        for copy_type in copy_types:
            triple = (tp["product_id"], copy_type["id"], tp["team_id"])
            if triple not in existing_triples:
                entry = {
                    "product_id": tp["product_id"],
                    "copy_type_id": copy_type["id"],
                    "team_id": tp["team_id"],
                    "status": "pending",
                    "week": week,
                    "utm_code": None,
                    "notes": None
                }
                # Auto-carry: 이전 주차의 UTM 코드 중 alive인 것만 이월
                if triple in prev_by_triple:
                    prev = prev_by_triple[triple]
                    alive_codes = [c for c in prev["codes"] if alive_results.get(c, {}).get("alive", False)]
                    if alive_codes:
                        entry["utm_code"] = json.dumps(alive_codes)
                        entry["status"] = "completed"
                        entry["notes"] = "auto-carry"
                new_checklists.append(entry)

    if new_checklists:
        response = client.table("checklists").insert(new_checklists).execute()
        print(f"Created {len(response.data)} new checklists for week {week}")
        return response.data

    print(f"No new checklists needed for week {week}")
    return []


def main(week: str = None):
    result = init_week_checklists(week)
    print(f"Initialized {len(result)} checklists")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Initialize week checklists")
    parser.add_argument("--week", help="Week to initialize (default: current week)")
    args = parser.parse_args()
    main(args.week)

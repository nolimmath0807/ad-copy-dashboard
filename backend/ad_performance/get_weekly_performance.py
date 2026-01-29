import argparse
import json
from datetime import datetime, timedelta

from db import get_connection


def generate_weeks(start_week: str, end_week: str) -> list[str]:
    weeks = []
    current = datetime.strptime(start_week + "-1", "%G-W%V-%u")
    end = datetime.strptime(end_week + "-1", "%G-W%V-%u")
    while current <= end:
        weeks.append(f"{current.isocalendar()[0]}-W{current.isocalendar()[1]:02d}")
        current += timedelta(weeks=1)
    return weeks


def week_to_date_range(week: str) -> tuple[str, str]:
    monday = datetime.strptime(week + "-1", "%G-W%V-%u")
    sunday = monday + timedelta(days=7)
    return monday.strftime("%Y-%m-%d"), sunday.strftime("%Y-%m-%d")


def get_weekly_team_performance(start_week: str, end_week: str, team_ids: list[str]) -> dict:
    conn = get_connection()
    cur = conn.cursor()

    weeks = generate_weeks(start_week, end_week)

    team_placeholders = ",".join(["%s"] * len(team_ids))
    cur.execute(
        f"""
        SELECT c.week, c.utm_code, tp.team_id
        FROM checklists c
        JOIN team_products tp ON tp.product_id = c.product_id
        WHERE c.week >= %s AND c.week <= %s
          AND c.utm_code IS NOT NULL AND c.utm_code != ''
          AND tp.team_id IN ({team_placeholders})
        """,
        [start_week, end_week] + team_ids,
    )
    rows = cur.fetchall()

    # team_id -> week -> list of utm_codes (parse JSON arrays)
    team_week_codes: dict[str, dict[str, list[str]]] = {}
    for week_val, utm_code_raw, team_id in rows:
        team_id = str(team_id)
        try:
            codes = json.loads(utm_code_raw)
            if isinstance(codes, list):
                for code in codes:
                    team_week_codes.setdefault(team_id, {}).setdefault(week_val, []).append(code)
            else:
                team_week_codes.setdefault(team_id, {}).setdefault(week_val, []).append(str(codes))
        except (json.JSONDecodeError, TypeError):
            team_week_codes.setdefault(team_id, {}).setdefault(week_val, []).append(utm_code_raw)

    # Collect all utm_codes per week for batch querying
    week_all_codes: dict[str, set[str]] = {}
    for team_data in team_week_codes.values():
        for week_val, codes in team_data.items():
            week_all_codes.setdefault(week_val, set()).update(codes)

    # Query meta_daily_perform per week
    week_perf: dict[str, dict[str, dict]] = {}
    for week_val in weeks:
        codes = list(week_all_codes.get(week_val, set()))
        if not codes:
            week_perf[week_val] = {}
            continue

        start_date, end_date = week_to_date_range(week_val)
        placeholders = ",".join(["%s"] * len(codes))
        cur.execute(
            f"""
            SELECT
                regexp_replace(ad_code, '\\(.*\\)$', '') AS utm_code,
                COALESCE(SUM(spend), 0) AS spend,
                COALESCE(SUM(impressions), 0) AS impressions,
                COALESCE(SUM(clicks), 0) AS clicks
            FROM ad_performance.meta_daily_perform
            WHERE regexp_replace(ad_code, '\\(.*\\)$', '') IN ({placeholders})
              AND date >= %s AND date < %s
            GROUP BY regexp_replace(ad_code, '\\(.*\\)$', '')
            """,
            codes + [start_date, end_date],
        )
        week_perf[week_val] = {}
        for utm_code, spend, impressions, clicks in cur.fetchall():
            week_perf[week_val][utm_code] = {
                "spend": float(spend),
                "impressions": int(impressions),
                "clicks": int(clicks),
            }

    cur.close()

    # Aggregate per team per week
    zero = {"spend": 0, "impressions": 0, "clicks": 0, "ctr": 0}
    result = {}
    for team_id in team_ids:
        team_id = str(team_id)
        result[team_id] = {}
        for week_val in weeks:
            codes = team_week_codes.get(team_id, {}).get(week_val, [])
            totals = {"spend": 0.0, "impressions": 0, "clicks": 0}
            for code in codes:
                perf = week_perf.get(week_val, {}).get(code, {})
                totals["spend"] += perf.get("spend", 0)
                totals["impressions"] += perf.get("impressions", 0)
                totals["clicks"] += perf.get("clicks", 0)

            ctr = round((totals["clicks"] / totals["impressions"]) * 100, 2) if totals["impressions"] > 0 else 0
            result[team_id][week_val] = {
                "spend": totals["spend"],
                "impressions": totals["impressions"],
                "clicks": totals["clicks"],
                "ctr": ctr,
            }

    return result


def main(start_week: str, end_week: str, team_ids: list[str]) -> dict:
    return get_weekly_team_performance(start_week, end_week, team_ids)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-week", required=True, help="e.g. 2026-W05")
    parser.add_argument("--end-week", required=True, help="e.g. 2026-W08")
    parser.add_argument("--team-ids", required=True, nargs="+", help="team IDs")
    args = parser.parse_args()

    result = main(args.start_week, args.end_week, args.team_ids)
    print(json.dumps(result, indent=2, ensure_ascii=False))

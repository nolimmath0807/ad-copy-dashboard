import argparse
import sys
from datetime import datetime, timedelta

sys.path.insert(0, sys.path[0] + "/..")

from db import get_connection


def check_alive_ads(utm_codes: list[str], week: str = None) -> dict:
    conn = get_connection()
    cur = conn.cursor()

    if week:
        monday = datetime.strptime(week + "-1", "%G-W%V-%u")
    else:
        now = datetime.now()
        monday = now - timedelta(days=now.weekday())

    sunday = monday - timedelta(days=1)
    sunday_str = sunday.strftime("%Y-%m-%d")
    monday_str = monday.strftime("%Y-%m-%d")

    placeholders = ",".join(["%s"] * len(utm_codes))

    # Query spend for Sunday and Monday separately per utm_code
    sql = f"""
        SELECT
            regexp_replace(ad_code, '^\\[[^]]*\\]', '') AS utm_code,
            date,
            COALESCE(SUM(spend), 0) AS daily_spend
        FROM ad_performance.meta_daily_perform
        WHERE regexp_replace(ad_code, '^\\[[^]]*\\]', '') IN ({placeholders})
          AND date IN (%s, %s)
        GROUP BY regexp_replace(ad_code, '^\\[[^]]*\\]', ''), date
    """

    params = utm_codes + [sunday_str, monday_str]
    cur.execute(sql, params)

    columns = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    cur.close()

    # Build per-utm spend data for each day
    spend_by_utm = {}
    for row in rows:
        row_dict = dict(zip(columns, row))
        utm = row_dict["utm_code"]
        date_str = str(row_dict["date"])
        daily_spend = float(row_dict["daily_spend"])
        if utm not in spend_by_utm:
            spend_by_utm[utm] = {}
        spend_by_utm[utm][date_str] = daily_spend

    result = {}
    for utm in utm_codes:
        utm_data = spend_by_utm.get(utm, {})
        sunday_spend = utm_data.get(sunday_str, 0)
        monday_spend = utm_data.get(monday_str, 0)
        alive = sunday_spend > 0 or monday_spend > 0
        total_spend = sunday_spend + monday_spend

        # last_spend_date: latest date with spend > 0
        last_spend_date = None
        if monday_spend > 0:
            last_spend_date = monday_str
        elif sunday_spend > 0:
            last_spend_date = sunday_str

        result[utm] = {
            "alive": alive,
            "last_spend_date": last_spend_date,
            "total_spend": total_spend,
        }

    return result


def main(utm_codes: list[str], week: str = None):
    result = check_alive_ads(utm_codes, week)
    for utm, data in result.items():
        status = "ALIVE" if data["alive"] else "DEAD"
        print(f"{utm}: {status} | last_spend={data['last_spend_date']} | total_spend={data['total_spend']}")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Check if UTM-registered ads are still alive")
    parser.add_argument("--utm-codes", nargs="+", required=True, help="UTM codes to check")
    parser.add_argument("--week", default=None, help="ISO week string like 2026-W06 (default: current week)")
    args = parser.parse_args()
    main(args.utm_codes, args.week)

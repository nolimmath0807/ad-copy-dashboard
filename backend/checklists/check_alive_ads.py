import argparse
import sys
from datetime import datetime, timedelta

sys.path.insert(0, sys.path[0] + "/..")

from db import get_connection


def check_alive_ads(utm_codes: list[str]) -> dict:
    conn = get_connection()
    cur = conn.cursor()

    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

    placeholders = ",".join(["%s"] * len(utm_codes))
    sql = f"""
        SELECT
            regexp_replace(ad_code, '^\\[[^]]*\\]', '') AS utm_code,
            MAX(date) AS last_spend_date,
            COALESCE(SUM(spend), 0) AS total_spend
        FROM ad_performance.meta_daily_perform
        WHERE regexp_replace(ad_code, '^\\[[^]]*\\]', '') IN ({placeholders})
          AND date >= %s
          AND date <= %s
          AND spend > 0
        GROUP BY regexp_replace(ad_code, '^\\[[^]]*\\]', '')
    """

    params = utm_codes + [start_date, end_date]
    cur.execute(sql, params)

    columns = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    cur.close()

    found = {}
    for row in rows:
        row_dict = dict(zip(columns, row))
        utm = row_dict["utm_code"]
        found[utm] = {
            "alive": True,
            "last_spend_date": str(row_dict["last_spend_date"]),
            "total_spend": float(row_dict["total_spend"]),
        }

    result = {}
    for utm in utm_codes:
        if utm in found:
            result[utm] = found[utm]
        else:
            result[utm] = {
                "alive": False,
                "last_spend_date": None,
                "total_spend": 0,
            }

    return result


def main(utm_codes: list[str]):
    result = check_alive_ads(utm_codes)
    for utm, data in result.items():
        status = "ALIVE" if data["alive"] else "DEAD"
        print(f"{utm}: {status} | last_spend={data['last_spend_date']} | total_spend={data['total_spend']}")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Check if UTM-registered ads are still alive")
    parser.add_argument("--utm-codes", nargs="+", required=True, help="UTM codes to check")
    args = parser.parse_args()
    main(args.utm_codes)

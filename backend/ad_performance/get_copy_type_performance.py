import argparse
import json
from db import get_connection
from ad_performance.get_meta_performance import get_performance_by_utm_codes


def get_performance_by_copy_type(month: str, team_id: str = None) -> list[dict]:
    conn = get_connection()
    cur = conn.cursor()

    if team_id:
        cur.execute(
            """
            SELECT c.utm_code, ct.code, ct.name
            FROM checklists c
            JOIN copy_types ct ON c.copy_type_id = ct.id
            JOIN team_products tp ON c.product_id = tp.product_id
            WHERE c.utm_code IS NOT NULL AND c.utm_code != ''
              AND tp.team_id = %s
            """,
            (team_id,),
        )
    else:
        cur.execute(
            """
            SELECT c.utm_code, ct.code, ct.name
            FROM checklists c
            JOIN copy_types ct ON c.copy_type_id = ct.id
            WHERE c.utm_code IS NOT NULL AND c.utm_code != ''
            """
        )

    rows = cur.fetchall()
    cur.close()

    if not rows:
        return []

    # Parse JSON utm_code arrays and flatten
    parsed_rows = []
    for utm_code_raw, copy_type_code, copy_type_name in rows:
        try:
            codes = json.loads(utm_code_raw)
            if isinstance(codes, list):
                for code in codes:
                    parsed_rows.append((code, copy_type_code, copy_type_name))
            else:
                parsed_rows.append((str(codes), copy_type_code, copy_type_name))
        except (json.JSONDecodeError, TypeError):
            parsed_rows.append((utm_code_raw, copy_type_code, copy_type_name))

    utm_codes = list({row[0] for row in parsed_rows})
    perf_map = get_performance_by_utm_codes(utm_codes, month)

    groups = {}
    seen = set()
    for utm_code, copy_type_code, copy_type_name in parsed_rows:
        if (utm_code, copy_type_code) in seen:
            continue
        seen.add((utm_code, copy_type_code))
        perf = perf_map.get(utm_code)
        if not perf:
            continue
        if copy_type_code not in groups:
            groups[copy_type_code] = {
                "copy_type_code": copy_type_code,
                "copy_type_name": copy_type_name,
                "total_spend": 0.0,
                "total_impressions": 0,
                "total_clicks": 0,
                "total_revenue": 0,
                "utm_count": 0,
            }
        g = groups[copy_type_code]
        g["total_spend"] += perf.get("spend", 0)
        g["total_impressions"] += perf.get("impressions", 0)
        g["total_clicks"] += perf.get("clicks", 0)
        g["total_revenue"] += perf.get("revenue", 0)
        g["utm_count"] += 1

    result = []
    for g in groups.values():
        g["avg_ctr"] = (
            round(g["total_clicks"] / g["total_impressions"] * 100, 2)
            if g["total_impressions"] > 0
            else 0.0
        )
        g["roas"] = (
            round(g["total_revenue"] / g["total_spend"] * 100, 0)
            if g["total_spend"] > 0
            else 0
        )
        result.append(g)

    result.sort(key=lambda x: x["total_spend"], reverse=True)
    return result


def main(month: str, team_id: str = None):
    result = get_performance_by_copy_type(month, team_id)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--month", required=True)
    parser.add_argument("--team-id", default=None)
    args = parser.parse_args()

    result = main(args.month, args.team_id)
    for row in result:
        print(row)

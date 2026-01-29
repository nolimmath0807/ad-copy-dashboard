import argparse
from db import get_connection


def get_performance_by_utm_codes(utm_codes: list[str], month: str) -> dict:
    """
    UTM 코드 목록으로 Meta 광고 성과 데이터를 조회합니다.
    ad_code에서 괄호 부분을 제거하여 UTM 코드와 매칭합니다.

    Args:
        utm_codes: UTM 코드 리스트
        month: 월 (YYYY-MM 형식)

    Returns:
        { utm_code: { spend, impressions, clicks, ctr, revenue, conversions } }
    """
    if not utm_codes:
        return {}

    conn = get_connection()
    cur = conn.cursor()

    try:
        # month에서 시작/종료 날짜 계산
        year, m = month.split('-')
        start_date = f"{year}-{m}-01"
        # 다음 달 1일 계산
        next_month = int(m) + 1
        next_year = int(year)
        if next_month > 12:
            next_month = 1
            next_year += 1
        end_date = f"{next_year}-{str(next_month).zfill(2)}-01"

        placeholders = ','.join(['%s'] * len(utm_codes))
        sql = f"""
            SELECT
                regexp_replace(ad_code, '\\(.*\\)$', '') AS utm_code,
                COALESCE(SUM(spend), 0) AS spend,
                COALESCE(SUM(impressions), 0) AS impressions,
                COALESCE(SUM(clicks), 0) AS clicks,
                CASE
                    WHEN COALESCE(SUM(impressions), 0) > 0
                    THEN ROUND((COALESCE(SUM(clicks), 0)::numeric / SUM(impressions)) * 100, 2)
                    ELSE 0
                END AS ctr
            FROM ad_performance.meta_daily_perform
            WHERE regexp_replace(ad_code, '\\(.*\\)$', '') IN ({placeholders})
              AND date >= %s
              AND date < %s
            GROUP BY regexp_replace(ad_code, '\\(.*\\)$', '')
        """

        params = utm_codes + [start_date, end_date]
        cur.execute(sql, params)

        columns = [desc[0] for desc in cur.description]
        rows = cur.fetchall()

        result = {}
        for row in rows:
            row_dict = dict(zip(columns, row))
            utm = row_dict['utm_code']
            result[utm] = {
                'spend': float(row_dict['spend']),
                'impressions': int(row_dict['impressions']),
                'clicks': int(row_dict['clicks']),
                'ctr': float(row_dict['ctr']),
                'revenue': None,
                'conversions': None,
            }

        return result
    finally:
        cur.close()


def main(utm_codes: list[str], month: str):
    result = get_performance_by_utm_codes(utm_codes, month)
    for utm, data in result.items():
        print(f"{utm}: spend={data['spend']}, impressions={data['impressions']}, clicks={data['clicks']}, ctr={data['ctr']}%")
    if not result:
        print("No matching data found.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Get Meta ad performance by UTM codes")
    parser.add_argument("--utm-codes", nargs="+", required=True, help="UTM codes to look up")
    parser.add_argument("--month", required=True, help="Month in YYYY-MM format")
    args = parser.parse_args()
    main(args.utm_codes, args.month)

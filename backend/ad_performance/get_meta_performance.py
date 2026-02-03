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
        if month == "all":
            date_filter = ""
            date_params = []
        else:
            year, m = month.split('-')
            start_date = f"{year}-{m}-01"
            # 다음 달 1일 계산
            next_month = int(m) + 1
            next_year = int(year)
            if next_month > 12:
                next_month = 1
                next_year += 1
            end_date = f"{next_year}-{str(next_month).zfill(2)}-01"
            date_filter = "AND date >= %s AND date < %s"
            date_params = [start_date, end_date]

        placeholders = ','.join(['%s'] * len(utm_codes))
        sql = f"""
            WITH meta AS (
                SELECT regexp_replace(ad_code, '^\\[[^]]*\\]', '') AS utm_code,
                    COALESCE(SUM(spend), 0) AS spend,
                    COALESCE(SUM(impressions), 0) AS impressions,
                    COALESCE(SUM(clicks), 0) AS clicks,
                    CASE WHEN COALESCE(SUM(impressions), 0) > 0
                        THEN ROUND((COALESCE(SUM(clicks), 0)::numeric / SUM(impressions)) * 100, 2)
                        ELSE 0 END AS ctr,
                    CASE WHEN COALESCE(SUM(clicks), 0) > 0
                        THEN ROUND(COALESCE(SUM(spend), 0)::numeric / SUM(clicks), 0)
                        ELSE 0 END AS cpc
                FROM ad_performance.meta_daily_perform
                WHERE regexp_replace(ad_code, '^\\[[^]]*\\]', '') IN ({placeholders})
                    {date_filter}
                GROUP BY 1
            ),
            cafe AS (
                SELECT ad_code AS utm_code,
                    COALESCE(SUM(revenue), 0) AS revenue,
                    COALESCE(SUM(conversions), 0) AS conversions
                FROM ad_performance.cafe24_daily_perform
                WHERE ad_code IN ({placeholders})
                    {date_filter}
                GROUP BY 1
            )
            SELECT m.utm_code, m.spend, m.impressions, m.clicks, m.ctr, m.cpc,
                COALESCE(c.revenue, 0) AS revenue,
                COALESCE(c.conversions, 0) AS conversions,
                CASE WHEN m.spend > 0 THEN ROUND(COALESCE(c.revenue, 0)::numeric / m.spend * 100, 0) ELSE 0 END AS roas
            FROM meta m LEFT JOIN cafe c ON m.utm_code = c.utm_code
        """

        params = utm_codes + date_params + utm_codes + date_params
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
                'cpc': float(row_dict['cpc']),
                'revenue': int(row_dict['revenue']),
                'conversions': int(row_dict['conversions']),
                'roas': int(row_dict['roas']),
            }

        return result
    finally:
        cur.close()


def main(utm_codes: list[str], month: str):
    result = get_performance_by_utm_codes(utm_codes, month)
    for utm, data in result.items():
        print(f"{utm}: spend={data['spend']}, impressions={data['impressions']}, clicks={data['clicks']}, ctr={data['ctr']}%, cpc={data['cpc']}, revenue={data['revenue']}, conversions={data['conversions']}, roas={data['roas']}%")
    if not result:
        print("No matching data found.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Get Meta ad performance by UTM codes")
    parser.add_argument("--utm-codes", nargs="+", required=True, help="UTM codes to look up")
    parser.add_argument("--month", required=True, help="Month in YYYY-MM format, or 'all' for all-time")
    args = parser.parse_args()
    main(args.utm_codes, args.month)

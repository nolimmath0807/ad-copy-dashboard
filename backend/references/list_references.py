import psycopg2.extras
from db import get_connection


def list_references(
    hook_type: str = None,
    selling_point: str = None,
    script_type: str = None,
    advertiser: str = None,
    limit: int = 50,
    offset: int = 0
) -> list:
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    sql = """
        SELECT
            s.id as script_id,
            a.advertiser_name,
            s.script_text,
            sa.hook_type,
            sa.hook_first_line,
            sa.cta_type,
            sa.selling_point,
            sa.script_type,
            sa.line_count,
            sa.char_count
        FROM ad_reference_dash.ad_script_analysis sa
        JOIN ad_reference_dash.ad_scripts s ON sa.script_id = s.id
        JOIN ad_reference_dash.ads a ON s.ad_id = a.id
        WHERE s.status = 'completed'
    """
    params = []

    if hook_type is not None:
        sql += " AND sa.hook_type = %s"
        params.append(hook_type)

    if selling_point is not None:
        sql += " AND sa.selling_point = %s"
        params.append(selling_point)

    if script_type is not None:
        sql += " AND sa.script_type = %s"
        params.append(script_type)

    if advertiser is not None:
        sql += " AND a.advertiser_name ILIKE %s"
        params.append(f"%{advertiser}%")

    sql += " LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    cur.execute(sql, params)
    rows = cur.fetchall()
    cur.close()

    return [dict(row) for row in rows]


def get_reference_filters() -> dict:
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    base_join = """
        FROM ad_reference_dash.ad_script_analysis sa
        JOIN ad_reference_dash.ad_scripts s ON sa.script_id = s.id
        JOIN ad_reference_dash.ads a ON s.ad_id = a.id
        WHERE s.status = 'completed'
    """

    cur.execute(f"SELECT DISTINCT sa.hook_type {base_join} AND sa.hook_type IS NOT NULL ORDER BY sa.hook_type")
    hook_types = [row["hook_type"] for row in cur.fetchall()]

    cur.execute(f"SELECT DISTINCT sa.selling_point {base_join} AND sa.selling_point IS NOT NULL ORDER BY sa.selling_point")
    selling_points = [row["selling_point"] for row in cur.fetchall()]

    cur.execute(f"SELECT DISTINCT sa.script_type {base_join} AND sa.script_type IS NOT NULL ORDER BY sa.script_type")
    script_types = [row["script_type"] for row in cur.fetchall()]

    cur.execute(f"SELECT DISTINCT a.advertiser_name {base_join} AND a.advertiser_name IS NOT NULL ORDER BY a.advertiser_name")
    advertisers = [row["advertiser_name"] for row in cur.fetchall()]

    cur.close()

    return {
        "hook_types": hook_types,
        "selling_points": selling_points,
        "script_types": script_types,
        "advertisers": advertisers,
    }

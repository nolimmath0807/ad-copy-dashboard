import psycopg2.extras
from db import get_connection


def list_assets(product_id: str) -> list:
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        'SELECT * FROM product_assets WHERE product_id = %s ORDER BY asset_key',
        (product_id,)
    )
    rows = cur.fetchall()
    cur.close()
    return [dict(row) for row in rows]


def create_asset(product_id: str, data: dict) -> dict:
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        '''INSERT INTO product_assets (product_id, asset_key, asset_value, asset_label)
           VALUES (%s, %s, %s, %s)
           RETURNING *''',
        (product_id, data["asset_key"], data["asset_value"], data.get("asset_label"))
    )
    row = cur.fetchone()
    cur.close()
    return dict(row)


def update_asset(asset_id: str, data: dict) -> dict:
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    set_clauses = ", ".join(f"{k} = %s" for k in data)
    values = list(data.values()) + [asset_id]
    cur.execute(
        f'UPDATE product_assets SET {set_clauses} WHERE id = %s RETURNING *',
        values
    )
    row = cur.fetchone()
    cur.close()
    return dict(row)


def delete_asset(asset_id: str) -> None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute('DELETE FROM product_assets WHERE id = %s', (asset_id,))
    cur.close()

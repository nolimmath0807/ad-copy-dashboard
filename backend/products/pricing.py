import psycopg2.extras
from db import get_connection


def list_pricing(product_id: str) -> list:
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        'SELECT * FROM "product_pricing" WHERE "product_id" = %s ORDER BY "is_main" DESC, "option_name"',
        (product_id,)
    )
    rows = cur.fetchall()
    cur.close()
    return [dict(row) for row in rows]


def create_pricing(product_id: str, data: dict) -> dict:
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        '''INSERT INTO "product_pricing"
           ("product_id", "option_name", "price", "original_price", "discount_rate", "daily_price", "is_main")
           VALUES (%s, %s, %s, %s, %s, %s, %s)
           RETURNING *''',
        (
            product_id,
            data["option_name"],
            data["price"],
            data["original_price"],
            data["discount_rate"],
            data["daily_price"],
            data.get("is_main", False),
        )
    )
    row = cur.fetchone()
    cur.close()
    return dict(row)


def update_pricing(pricing_id: str, data: dict) -> dict:
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    set_clauses = ", ".join(f'"{k}" = %s' for k in data)
    values = list(data.values()) + [pricing_id]
    cur.execute(
        f'UPDATE "product_pricing" SET {set_clauses} WHERE "id" = %s RETURNING *',
        values
    )
    row = cur.fetchone()
    cur.close()
    return dict(row)


def delete_pricing(pricing_id: str) -> None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute('DELETE FROM "product_pricing" WHERE "id" = %s', (pricing_id,))
    cur.close()

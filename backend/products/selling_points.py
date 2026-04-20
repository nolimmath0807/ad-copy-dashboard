import psycopg2.extras
from db import get_connection, serialize_row


def list_selling_points(product_id: str) -> list:
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        'SELECT * FROM "product_selling_points" WHERE "product_id" = %s ORDER BY "created_at"',
        (product_id,)
    )
    rows = cur.fetchall()
    cur.close()
    return [serialize_row(dict(row)) for row in rows]


def create_selling_point(product_id: str, data: dict) -> dict:
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute(
        '''
        INSERT INTO "product_selling_points"
            ("product_id", "label", "headline", "mechanism", "key_ingredients",
             "target_symptoms", "competitor_alt", "is_active")
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING *
        ''',
        (
            product_id,
            data.get("label"),
            data.get("headline"),
            data.get("mechanism"),
            data.get("key_ingredients"),
            data.get("target_symptoms"),
            data.get("competitor_alt"),
            data.get("is_active", True),
        )
    )
    row = cur.fetchone()
    cur.close()
    return serialize_row(dict(row))


def update_selling_point(sp_id: str, data: dict) -> dict:
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    set_clauses = []
    set_values = []
    for col, val in data.items():
        set_clauses.append(f'"{col}" = %s')
        set_values.append(val)

    sql = (
        f'UPDATE "product_selling_points" SET {", ".join(set_clauses)} '
        f'WHERE "id" = %s RETURNING *'
    )
    cur.execute(sql, set_values + [sp_id])
    row = cur.fetchone()
    cur.close()
    return serialize_row(dict(row))


def delete_selling_point(sp_id: str) -> None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute('DELETE FROM "product_selling_points" WHERE "id" = %s', (sp_id,))
    cur.close()

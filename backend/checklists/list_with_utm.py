import argparse
import sys
sys.path.insert(0, sys.path[0] + "/..")

from db import get_db_client


def list_checklists_with_utm():
    client = get_db_client()
    from db import get_connection
    import psycopg2.extras
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cur.execute('''
            SELECT c.*,
                   row_to_json(p.*) as product,
                   row_to_json(ct.*) as copy_type
            FROM checklists c
            LEFT JOIN products p ON c.product_id = p.id
            LEFT JOIN copy_types ct ON c.copy_type_id = ct.id
            WHERE c.utm_code IS NOT NULL
              AND c.utm_code != ''
              AND c.utm_code != '[]'
            ORDER BY c.updated_at DESC
        ''')
        rows = cur.fetchall()
        from db import serialize_row
        return [serialize_row(dict(row)) for row in rows]
    finally:
        cur.close()


def main():
    results = list_checklists_with_utm()
    print(f"Found {len(results)} checklists with UTM codes")
    for r in results:
        print(f"  {r.get('product', {}).get('name', '?')} - {r.get('copy_type', {}).get('code', '?')} - {r.get('utm_code')}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="List checklists with UTM codes")
    args = parser.parse_args()
    main()

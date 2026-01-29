import argparse
import sys
sys.path.insert(0, sys.path[0] + "/..")

from db import get_connection, serialize_row
import psycopg2.extras


def list_checklists_with_utm():
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        # Step 1: Get filtered checklists
        cur.execute("""
            SELECT * FROM checklists
            WHERE utm_code IS NOT NULL
              AND utm_code != ''
              AND utm_code != '[]'
            ORDER BY updated_at DESC
        """)
        rows = [dict(row) for row in cur.fetchall()]

        if not rows:
            return []

        # Step 2: Batch fetch products
        product_ids = list(set(r["product_id"] for r in rows if r.get("product_id")))
        if product_ids:
            placeholders = ",".join(["%s"] * len(product_ids))
            cur.execute(f'SELECT * FROM products WHERE id IN ({placeholders})', product_ids)
            products_map = {row["id"]: dict(row) for row in cur.fetchall()}
        else:
            products_map = {}

        # Step 3: Batch fetch copy_types
        ct_ids = list(set(r["copy_type_id"] for r in rows if r.get("copy_type_id")))
        if ct_ids:
            placeholders = ",".join(["%s"] * len(ct_ids))
            cur.execute(f'SELECT * FROM copy_types WHERE id IN ({placeholders})', ct_ids)
            ct_map = {row["id"]: dict(row) for row in cur.fetchall()}
        else:
            ct_map = {}

        # Step 4: Merge
        for row in rows:
            row["product"] = products_map.get(row.get("product_id"))
            row["copy_type"] = ct_map.get(row.get("copy_type_id"))

        return [serialize_row(row) for row in rows]
    finally:
        cur.close()


def main():
    results = list_checklists_with_utm()
    print(f"Found {len(results)} checklists with UTM codes")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="List checklists with UTM codes")
    args = parser.parse_args()
    main()

import argparse
import uuid
from db import get_connection


def main(dry_run: bool):
    conn = get_connection()
    cur = conn.cursor()

    # Step 1: Add team_id column
    print("=== Step 1: Add team_id column ===")
    sql_add_col = "ALTER TABLE checklists ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id);"
    print(f"  SQL: {sql_add_col}")
    if not dry_run:
        cur.execute(sql_add_col)

    # Step 1b: Drop old unique constraint first (to allow duplicates during migration)
    sql_drop = "ALTER TABLE checklists DROP CONSTRAINT IF EXISTS checklists_product_id_copy_type_id_week_key;"
    print(f"  SQL: {sql_drop}")
    if not dry_run:
        cur.execute(sql_drop)

    # Step 2: Migrate existing rows
    print("\n=== Step 2: Migrate existing checklist rows ===")
    cur.execute("SELECT * FROM checklists;")
    cols = [desc[0] for desc in cur.description]
    rows = [dict(zip(cols, row)) for row in cur.fetchall()]
    print(f"  Total checklists: {len(rows)}")

    updated = 0
    duplicated = 0
    orphaned = 0

    for row in rows:
        cur.execute(
            "SELECT team_id FROM team_products WHERE product_id = %s;",
            (row["product_id"],)
        )
        team_ids = [r[0] for r in cur.fetchall()]

        if len(team_ids) == 0:
            orphaned += 1
            print(f"  ORPHAN: checklist {row['id']} (product {row['product_id']})")
        elif len(team_ids) == 1:
            updated += 1
            if not dry_run:
                cur.execute(
                    "UPDATE checklists SET team_id = %s WHERE id = %s;",
                    (team_ids[0], row["id"])
                )
        else:
            # First team: update existing row
            updated += 1
            if not dry_run:
                cur.execute(
                    "UPDATE checklists SET team_id = %s WHERE id = %s;",
                    (team_ids[0], row["id"])
                )
            # Other teams: insert duplicates
            for team_id in team_ids[1:]:
                duplicated += 1
                new_id = str(uuid.uuid4())
                if not dry_run:
                    cur.execute(
                        """INSERT INTO checklists (id, product_id, copy_type_id, week, status, notes, utm_code, team_id, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);""",
                        (new_id, row["product_id"], row["copy_type_id"], row["week"],
                         row["status"], row["notes"], row["utm_code"], team_id,
                         row["created_at"], row["updated_at"])
                    )
                print(f"  DUPLICATE: checklist for product {row['product_id']} -> team {team_id} (new id: {new_id})")

    print(f"\n  Updated: {updated}, Duplicated: {duplicated}, Orphaned: {orphaned}")

    # Step 3: Delete orphans and set NOT NULL
    print("\n=== Step 3: Delete orphans, set NOT NULL ===")
    sql_delete = "DELETE FROM checklists WHERE team_id IS NULL;"
    sql_not_null = "ALTER TABLE checklists ALTER COLUMN team_id SET NOT NULL;"
    print(f"  SQL: {sql_delete}")
    print(f"  SQL: {sql_not_null}")
    if not dry_run:
        cur.execute(sql_delete)
        print(f"  Deleted {cur.rowcount} orphan rows")
        cur.execute(sql_not_null)

    # Step 4: Add new unique constraint
    print("\n=== Step 4: Add new unique constraint ===")
    sql_add = "ALTER TABLE checklists ADD CONSTRAINT checklists_product_copy_type_week_team_key UNIQUE (product_id, copy_type_id, week, team_id);"
    print(f"  SQL: {sql_add}")
    if not dry_run:
        cur.execute(sql_add)

    cur.close()

    mode = "DRY RUN" if dry_run else "EXECUTED"
    print(f"\n=== Migration complete ({mode}) ===")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate checklists table to add team_id")
    parser.add_argument("--dry-run", action="store_true", help="Show what would happen without executing")
    args = parser.parse_args()

    main(dry_run=args.dry_run)

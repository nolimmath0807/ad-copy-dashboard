import argparse
from db import get_connection


def main(dry_run: bool = False):
    conn = get_connection()
    conn.autocommit = False
    cur = conn.cursor()
    schema = 'ad_copy_dashboard'

    print("[1/4] Adding role column to users table...")
    cur.execute(f"""
        ALTER TABLE {schema}.users
        ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
    """)
    print("  -> role column added (default: 'user')")

    print("[2/4] Migrating is_admin=true -> role='admin'...")
    cur.execute(f"""
        UPDATE {schema}.users
        SET role = 'admin'
        WHERE is_admin = true;
    """)
    print(f"  -> {cur.rowcount} users updated to admin")

    print("[3/4] Setting remaining users to role='user'...")
    cur.execute(f"""
        UPDATE {schema}.users
        SET role = 'user'
        WHERE role IS NULL OR (is_admin = false OR is_admin IS NULL);
    """)
    print(f"  -> {cur.rowcount} users set to 'user'")

    print("[4/4] Dropping is_admin column...")
    cur.execute(f"""
        ALTER TABLE {schema}.users
        DROP COLUMN IF EXISTS is_admin;
    """)
    print("  -> is_admin column dropped")

    if dry_run:
        conn.rollback()
        print("\n[DRY RUN] All changes rolled back.")
    else:
        conn.commit()
        print("\nMigration completed successfully.")

    cur.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate is_admin to role column")
    parser.add_argument("--dry-run", action="store_true", help="Roll back instead of commit")
    args = parser.parse_args()

    main(dry_run=args.dry_run)

import argparse
from db import get_connection


def main(dry_run: bool = False):
    conn = get_connection()
    conn.autocommit = False
    cur = conn.cursor()

    print("[1/1] Renaming schema from ad-copy-dashboard to ad_copy_dashboard...")
    cur.execute('ALTER SCHEMA "ad-copy-dashboard" RENAME TO ad_copy_dashboard;')
    print("  -> schema renamed")

    if dry_run:
        conn.rollback()
        print("\n[DRY RUN] All changes rolled back.")
    else:
        conn.commit()
        print("\nMigration completed successfully.")

    cur.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Rename schema from ad-copy-dashboard to ad_copy_dashboard")
    parser.add_argument("--dry-run", action="store_true", help="Roll back instead of commit")
    args = parser.parse_args()

    main(dry_run=args.dry_run)

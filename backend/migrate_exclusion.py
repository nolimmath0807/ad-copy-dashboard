import argparse
from db import get_connection


def main(dry_run: bool = False):
    conn = get_connection()
    conn.autocommit = False
    cur = conn.cursor()

    print("[1/2] Adding 'active' column to team_products...")
    cur.execute("ALTER TABLE team_products ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;")
    print("  -> done")

    print("[2/2] Adding 'excluded' column to checklists...")
    cur.execute("ALTER TABLE checklists ADD COLUMN IF NOT EXISTS excluded BOOLEAN DEFAULT false;")
    print("  -> done")

    if dry_run:
        conn.rollback()
        print("\n[DRY RUN] All changes rolled back.")
    else:
        conn.commit()
        print("\nMigration completed successfully.")

    cur.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Add active/excluded columns for exclusion feature")
    parser.add_argument("--dry-run", action="store_true", help="Roll back instead of commit")
    args = parser.parse_args()

    main(dry_run=args.dry_run)

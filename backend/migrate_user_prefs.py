import argparse
from db import get_connection

SQL = """
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) UNIQUE,
  preferences jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
""".strip()


def main(dry_run: bool):
    if dry_run:
        print("[DRY RUN] Would execute:\n")
        print(SQL)
        return

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SQL)
    conn.commit()
    cur.close()
    conn.close()
    print("Migration complete: user_preferences table created.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate: create user_preferences table")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    main(dry_run=args.dry_run)

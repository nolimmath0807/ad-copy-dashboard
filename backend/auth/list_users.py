import argparse
import json
import sys
sys.path.insert(0, sys.path[0] + "/..")

from conn import get_supabase_client


def list_users():
    client = get_supabase_client()
    response = client.table("users").select("*, teams(*)").order("created_at", desc=True).execute()
    return response.data


def main():
    users = list_users()
    print(json.dumps(users, indent=2, ensure_ascii=False))
    return users


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="List all users")
    args = parser.parse_args()
    main()

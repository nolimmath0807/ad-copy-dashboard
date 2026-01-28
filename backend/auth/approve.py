import argparse
import json
import sys
sys.path.insert(0, sys.path[0] + "/..")

from conn import get_supabase_client


def approve_user(user_id: str):
    client = get_supabase_client()
    response = client.table("users").update({"is_approved": True}).eq("id", user_id).execute()
    return response.data[0]


def main(user_id: str):
    user = approve_user(user_id)
    print(json.dumps(user, indent=2, ensure_ascii=False))
    return user


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Approve a user")
    parser.add_argument("--id", required=True, help="User ID")
    args = parser.parse_args()
    main(args.id)

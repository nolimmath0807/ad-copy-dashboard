import argparse
import sys
sys.path.insert(0, sys.path[0] + "/..")

from conn import get_supabase_client


def update_user_name(user_id: str, name: str):
    client = get_supabase_client()
    response = client.table("users").update({"name": name}).eq("id", user_id).execute()
    return response.data[0]


def reset_user_password(user_id: str, new_password: str):
    client = get_supabase_client()
    response = client.table("users").update({"password": new_password}).eq("id", user_id).execute()
    return response.data[0]


def main(user_id: str, name: str = None, password: str = None):
    if name:
        result = update_user_name(user_id, name)
        print(f"Updated name to: {name}")
    if password:
        result = reset_user_password(user_id, password)
        print(f"Password reset for user {user_id}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update user info (admin only)")
    parser.add_argument("--user-id", required=True)
    parser.add_argument("--name", help="New name")
    parser.add_argument("--password", help="New password")
    args = parser.parse_args()
    main(args.user_id, args.name, args.password)

import argparse
import sys
sys.path.insert(0, sys.path[0] + "/..")

from conn import get_supabase_client


def update_user_role(user_id: str, role: str):
    if role not in ("user", "leader", "admin"):
        raise ValueError(f"Invalid role: {role}")
    client = get_supabase_client()
    response = client.table("users").update({"role": role}).eq("id", user_id).execute()
    return response.data[0]


def main(user_id: str, role: str):
    result = update_user_role(user_id, role)
    print(f"Updated user {user_id} role to {role}")
    print(result)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update user role")
    parser.add_argument("--user-id", required=True, help="User ID")
    parser.add_argument("--role", required=True, choices=["user", "leader", "admin"], help="New role")
    args = parser.parse_args()
    main(args.user_id, args.role)

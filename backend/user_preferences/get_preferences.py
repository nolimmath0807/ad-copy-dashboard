import argparse
from db import get_db_client


def get_preferences(user_id: str) -> dict:
    client = get_db_client()
    result = client.table("user_preferences").select("*").eq("user_id", user_id).single().execute()
    if result.data:
        return result.data
    return {"user_id": user_id, "preferences": {}}


def main(user_id: str):
    result = get_preferences(user_id)
    print(result)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", required=True)
    args = parser.parse_args()
    main(args.user_id)

import argparse
import json
from db import get_db_client


def update_preferences(user_id: str, preferences: dict) -> dict:
    client = get_db_client()
    # Try update first
    existing = client.table("user_preferences").select("id").eq("user_id", user_id).single().execute()
    if existing.data:
        result = client.table("user_preferences").update({
            "preferences": json.dumps(preferences),
            "updated_at": "now()"
        }).eq("user_id", user_id).execute()
        return result.data[0] if result.data else {}
    else:
        result = client.table("user_preferences").insert({
            "user_id": user_id,
            "preferences": json.dumps(preferences)
        }).execute()
        return result.data[0] if result.data else {}


def main(user_id: str, preferences_json: str):
    prefs = json.loads(preferences_json)
    result = update_preferences(user_id, prefs)
    print(result)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", required=True)
    parser.add_argument("--preferences", required=True, help="JSON string")
    args = parser.parse_args()
    main(args.user_id, args.preferences)

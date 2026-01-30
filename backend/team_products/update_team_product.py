import argparse
import json
import sys
sys.path.insert(0, sys.path[0] + "/..")

from conn import get_supabase_client


def update_team_product(id: int, data: dict) -> dict:
    client = get_supabase_client()
    response = client.table("team_products").update(data).eq("id", id).execute()
    return response.data[0]


def main(id: int, active: bool):
    data = {"active": active}
    result = update_team_product(id, data)
    print(json.dumps(result, indent=2, ensure_ascii=False, default=str))
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update a team product")
    parser.add_argument("--id", type=int, required=True, help="Team product ID")
    parser.add_argument("--active", required=True, choices=["true", "false"], help="Active status")
    args = parser.parse_args()
    main(args.id, args.active == "true")

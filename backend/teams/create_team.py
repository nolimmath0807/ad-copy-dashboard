import argparse
import json
import sys
sys.path.insert(0, sys.path[0] + "/..")

from conn import get_supabase_client


def create_team(name: str):
    client = get_supabase_client()
    response = client.table("teams").insert({"name": name}).execute()
    return response.data[0]


def main(name: str):
    team = create_team(name)
    print(json.dumps(team, indent=2, ensure_ascii=False))
    return team


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a new team")
    parser.add_argument("--name", required=True, help="Team name")
    args = parser.parse_args()
    main(args.name)

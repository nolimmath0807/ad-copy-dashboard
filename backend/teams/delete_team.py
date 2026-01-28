import argparse
import sys
sys.path.insert(0, sys.path[0] + "/..")

from conn import get_supabase_client


def delete_team(team_id: str):
    client = get_supabase_client()
    client.table("teams").delete().eq("id", team_id).execute()


def main(team_id: str):
    delete_team(team_id)
    print(f"Team {team_id} deleted")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Delete a team")
    parser.add_argument("--id", required=True, help="Team ID")
    args = parser.parse_args()
    main(args.id)

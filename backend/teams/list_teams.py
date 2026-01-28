import argparse
import sys
sys.path.insert(0, sys.path[0] + "/..")

from conn import get_supabase_client


def list_teams():
    client = get_supabase_client()
    response = client.table("teams").select("*").order("created_at", desc=True).execute()
    return response.data


def main():
    teams = list_teams()
    for team in teams:
        print(team)
    return teams


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="List all teams")
    args = parser.parse_args()
    main()

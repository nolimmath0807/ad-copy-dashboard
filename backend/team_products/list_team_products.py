import argparse
import sys
sys.path.insert(0, sys.path[0] + "/..")

from conn import get_supabase_client


def list_team_products(team_id: str = None):
    client = get_supabase_client()
    query = client.table("team_products").select("*, teams(*), products(*)")
    if team_id:
        query = query.eq("team_id", team_id)
    response = query.order("created_at", desc=True).execute()
    return response.data


def main(team_id: str = None):
    result = list_team_products(team_id)
    print(f"Found {len(result)} team-product assignments")
    for item in result:
        team_name = item.get("teams", {}).get("name", "N/A")
        product_name = item.get("products", {}).get("name", "N/A")
        print(f"  - {team_name} -> {product_name}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="List team-product assignments")
    parser.add_argument("--team-id", help="Filter by team ID")
    args = parser.parse_args()
    main(args.team_id)

import argparse
import sys
sys.path.insert(0, sys.path[0] + "/..")

from conn import get_supabase_client


def get_team_products_by_team(team_id: str):
    client = get_supabase_client()
    response = client.table("team_products").select("product_id").eq("team_id", team_id).execute()
    return [item["product_id"] for item in response.data]


def main(team_id: str):
    product_ids = get_team_products_by_team(team_id)
    print(f"Team {team_id} has {len(product_ids)} assigned products:")
    for pid in product_ids:
        print(f"  - {pid}")
    return product_ids


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Get product IDs assigned to a team")
    parser.add_argument("--team-id", required=True, help="Team ID")
    args = parser.parse_args()
    main(args.team_id)

import argparse
import json
import sys
sys.path.insert(0, sys.path[0] + "/..")

from conn import get_supabase_client


def create_team_product(team_id: str, product_id: str):
    client = get_supabase_client()
    response = client.table("team_products").insert({
        "team_id": team_id,
        "product_id": product_id
    }).execute()
    return response.data[0]


def main(team_id: str, product_id: str):
    result = create_team_product(team_id, product_id)
    print(json.dumps(result, indent=2, ensure_ascii=False, default=str))
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Assign a product to a team")
    parser.add_argument("--team-id", required=True, help="Team ID")
    parser.add_argument("--product-id", required=True, help="Product ID")
    args = parser.parse_args()
    main(args.team_id, args.product_id)

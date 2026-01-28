import argparse
import sys
sys.path.insert(0, sys.path[0] + "/..")

from conn import get_supabase_client


def delete_team_product(team_product_id: str):
    client = get_supabase_client()
    client.table("team_products").delete().eq("id", team_product_id).execute()


def main(team_product_id: str):
    delete_team_product(team_product_id)
    print(f"Team-product assignment {team_product_id} deleted")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Delete a team-product assignment")
    parser.add_argument("--id", required=True, help="Team-product assignment ID")
    args = parser.parse_args()
    main(args.id)

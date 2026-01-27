import argparse
import sys
sys.path.insert(0, sys.path[0] + "/..")

from conn import get_supabase_client


def list_products():
    client = get_supabase_client()
    response = client.table("products").select("*").order("created_at", desc=True).execute()
    return response.data


def main(limit: int):
    products = list_products()
    if limit > 0:
        products = products[:limit]
    for product in products:
        print(product)
    return products


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="List all products")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of products (0 for all)")
    args = parser.parse_args()

    main(args.limit)

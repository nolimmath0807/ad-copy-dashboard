import argparse
import sys
sys.path.insert(0, sys.path[0] + "/..")

from conn import get_supabase_client


def get_product(product_id: str):
    client = get_supabase_client()
    response = client.table("products").select("*").eq("id", product_id).single().execute()
    return response.data


def main(product_id: str):
    product = get_product(product_id)
    print(product)
    return product


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Get a product by ID")
    parser.add_argument("--product-id", required=True, help="Product ID to retrieve")
    args = parser.parse_args()

    main(args.product_id)

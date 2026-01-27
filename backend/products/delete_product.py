import argparse
import json
import sys
sys.path.insert(0, sys.path[0] + "/..")

from conn import get_supabase_client


def delete_product(product_id: str):
    client = get_supabase_client()
    client.table("products").delete().eq("id", product_id).execute()
    return {"success": True}


def main(product_id: str):
    result = delete_product(product_id)
    print(json.dumps(result))
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Delete a product")
    parser.add_argument("--product-id", required=True, help="Product ID to delete")
    args = parser.parse_args()

    main(args.product_id)

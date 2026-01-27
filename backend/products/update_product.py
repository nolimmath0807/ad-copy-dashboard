import argparse
import json
import sys
sys.path.insert(0, sys.path[0] + "/..")

from conn import get_supabase_client


def update_product(product_id: str, data: dict):
    client = get_supabase_client()
    response = client.table("products").update(data).eq("id", product_id).execute()
    return response.data[0]


def main(product_id: str, name: str, description: str, price: float, image_url: str):
    data = {}
    if name:
        data["name"] = name
    if description:
        data["description"] = description
    if price is not None:
        data["price"] = price
    if image_url:
        data["image_url"] = image_url

    product = update_product(product_id, data)
    print(json.dumps(product, indent=2, ensure_ascii=False))
    return product


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update a product")
    parser.add_argument("--product-id", required=True, help="Product ID to update")
    parser.add_argument("--name", default="", help="New product name")
    parser.add_argument("--description", default="", help="New product description")
    parser.add_argument("--price", type=float, default=None, help="New product price")
    parser.add_argument("--image-url", default="", help="New product image URL")
    args = parser.parse_args()

    main(args.product_id, args.name, args.description, args.price, args.image_url)

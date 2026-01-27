import argparse
import json
import sys
sys.path.insert(0, sys.path[0] + "/..")

from conn import get_supabase_client


def create_product(data: dict):
    client = get_supabase_client()
    response = client.table("products").insert(data).execute()
    return response.data[0]


def main(name: str, description: str, price: float, image_url: str):
    data = {
        "name": name,
        "description": description,
        "price": price,
        "image_url": image_url,
    }
    product = create_product(data)
    print(json.dumps(product, indent=2, ensure_ascii=False))
    return product


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a new product")
    parser.add_argument("--name", required=True, help="Product name")
    parser.add_argument("--description", required=True, help="Product description")
    parser.add_argument("--price", type=float, required=True, help="Product price")
    parser.add_argument("--image-url", default="", help="Product image URL")
    args = parser.parse_args()

    main(args.name, args.description, args.price, args.image_url)

import argparse
import json
import sys
sys.path.insert(0, "/Users/las/Development/project/ad-copy-dashboard/backend")

from conn import get_supabase_client


def create_copy(data: dict):
    client = get_supabase_client()
    response = client.table("generated_copies").insert(data).execute()
    return response.data[0]


def main(product_id: str, copy_type_id: str, content: str, version: int = None):
    data = {
        "product_id": product_id,
        "copy_type_id": copy_type_id,
        "content": content,
    }
    if version is not None:
        data["version"] = version

    copy = create_copy(data)
    print(f"Created copy: {copy['id']}")
    print(json.dumps(copy, indent=2, default=str))
    return copy


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a new generated copy")
    parser.add_argument("--product-id", required=True, help="Product ID")
    parser.add_argument("--copy-type-id", required=True, help="Copy type ID")
    parser.add_argument("--content", required=True, help="Copy content")
    parser.add_argument("--version", type=int, help="Version number (optional)")
    args = parser.parse_args()

    main(args.product_id, args.copy_type_id, args.content, args.version)

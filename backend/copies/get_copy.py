import argparse
import sys
sys.path.insert(0, "/Users/las/Development/project/ad-copy-dashboard/backend")

from conn import get_supabase_client


def get_copy(copy_id: str):
    client = get_supabase_client()
    response = client.table("copies").select("*, products(*), copy_types(*)").eq("id", copy_id).single().execute()
    return response.data


def main(copy_id: str):
    copy = get_copy(copy_id)
    print(f"Copy ID: {copy['id']}")
    print(f"Content: {copy.get('content', '')}")
    print(f"Product: {copy.get('products', {})}")
    print(f"Copy Type: {copy.get('copy_types', {})}")
    return copy


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Get a specific generated copy")
    parser.add_argument("--copy-id", required=True, help="Copy ID to retrieve")
    args = parser.parse_args()

    main(args.copy_id)

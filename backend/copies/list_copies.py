import argparse
import sys
sys.path.insert(0, "/Users/las/Development/project/ad-copy-dashboard/backend")

from conn import get_supabase_client


def list_copies(product_id: str = None, copy_type_id: str = None):
    client = get_supabase_client()
    query = client.table("copies").select("*, products(*), copy_types(*)")
    if product_id:
        query = query.eq("product_id", product_id)
    if copy_type_id:
        query = query.eq("copy_type_id", copy_type_id)
    response = query.order("created_at", desc=True).execute()
    return response.data


def main(product_id: str = None, copy_type_id: str = None):
    copies = list_copies(product_id, copy_type_id)
    print(f"Found {len(copies)} copies")
    for copy in copies:
        print(f"  - {copy['id']}: {copy.get('content', '')[:50]}...")
    return copies


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="List generated copies")
    parser.add_argument("--product-id", help="Filter by product ID")
    parser.add_argument("--copy-type-id", help="Filter by copy type ID")
    args = parser.parse_args()

    main(args.product_id, args.copy_type_id)

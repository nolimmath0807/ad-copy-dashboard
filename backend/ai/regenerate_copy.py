import argparse
import sys

sys.path.insert(0, "/Users/las/Development/project/ad-copy-dashboard/backend")
from conn import get_supabase_client
from ai.generate_copy import generate_ad_copy


def regenerate_copy(copy_id: str) -> dict:
    client = get_supabase_client()

    existing = (
        client.table("copies")
        .select("product_id, copy_type_id")
        .eq("id", copy_id)
        .single()
        .execute()
        .data
    )

    return generate_ad_copy(existing["product_id"], existing["copy_type_id"])


def main(copy_id: str):
    result = regenerate_copy(copy_id)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Regenerate an existing ad copy")
    parser.add_argument("--copy-id", required=True, help="Existing copy ID to regenerate")
    args = parser.parse_args()

    result = main(args.copy_id)
    print(result)

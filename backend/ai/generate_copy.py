import argparse
import sys

sys.path.insert(0, "/Users/las/Development/project/ad-copy-dashboard/backend")
from conn import get_supabase_client
from ai.gemini_client import generate_copy as gemini_generate


def generate_ad_copy(product_id: str, copy_type_id: str, custom_prompt: str = None) -> dict:
    client = get_supabase_client()

    product = (
        client.table("products").select("*").eq("id", product_id).single().execute().data
    )

    copy_type = (
        client.table("copy_types")
        .select("*")
        .eq("id", copy_type_id)
        .single()
        .execute()
        .data
    )

    content = gemini_generate(product, copy_type, custom_prompt)

    existing = (
        client.table("generated_copies")
        .select("version")
        .eq("product_id", product_id)
        .eq("copy_type_id", copy_type_id)
        .order("version", desc=True)
        .limit(1)
        .execute()
    )
    version = (existing.data[0]["version"] + 1) if existing.data else 1

    new_copy = {
        "product_id": product_id,
        "copy_type_id": copy_type_id,
        "content": content,
        "version": version,
    }
    response = client.table("generated_copies").insert(new_copy).execute()
    return response.data[0]


def main(product_id: str, copy_type_id: str):
    result = generate_ad_copy(product_id, copy_type_id)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate ad copy using AI")
    parser.add_argument("--product-id", required=True, help="Product ID")
    parser.add_argument("--copy-type-id", required=True, help="Copy type ID")
    args = parser.parse_args()

    result = main(args.product_id, args.copy_type_id)
    print(result)

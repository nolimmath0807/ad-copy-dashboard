import argparse
import sys
sys.path.append('..')
from conn import get_supabase_client


def get_copy_type(copy_type_id: str):
    client = get_supabase_client()
    response = client.table("copy_types").select("*").eq("id", copy_type_id).single().execute()
    return response.data


def main(copy_type_id: str):
    result = get_copy_type(copy_type_id)
    print(result)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Get a copy type by ID")
    parser.add_argument("--copy-type-id", required=True, help="Copy type ID")
    args = parser.parse_args()

    main(args.copy_type_id)

import argparse
import sys
sys.path.append('..')
from conn import get_supabase_client


def delete_copy_type(copy_type_id: str):
    client = get_supabase_client()
    client.table("copy_types").delete().eq("id", copy_type_id).execute()
    return {"success": True}


def main(copy_type_id: str):
    result = delete_copy_type(copy_type_id)
    print(result)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Delete a copy type")
    parser.add_argument("--copy-type-id", required=True, help="Copy type ID to delete")
    args = parser.parse_args()

    main(args.copy_type_id)

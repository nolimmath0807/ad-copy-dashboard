import argparse
import sys
sys.path.insert(0, "/Users/las/Development/project/ad-copy-dashboard/backend")

from conn import get_supabase_client


def delete_copy(copy_id: str):
    client = get_supabase_client()
    client.table("copies").delete().eq("id", copy_id).execute()
    return {"success": True}


def main(copy_id: str):
    result = delete_copy(copy_id)
    print(f"Deleted copy: {copy_id}")
    print(f"Result: {result}")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Delete a generated copy")
    parser.add_argument("--copy-id", required=True, help="Copy ID to delete")
    args = parser.parse_args()

    main(args.copy_id)

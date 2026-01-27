import argparse
import json
import sys
sys.path.insert(0, "/Users/las/Development/project/ad-copy-dashboard/backend")

from conn import get_supabase_client


def update_copy(copy_id: str, data: dict):
    client = get_supabase_client()
    response = client.table("generated_copies").update(data).eq("id", copy_id).execute()
    return response.data[0]


def main(copy_id: str, content: str = None, version: int = None):
    data = {}
    if content is not None:
        data["content"] = content
    if version is not None:
        data["version"] = version

    copy = update_copy(copy_id, data)
    print(f"Updated copy: {copy['id']}")
    print(json.dumps(copy, indent=2, default=str))
    return copy


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update a generated copy")
    parser.add_argument("--copy-id", required=True, help="Copy ID to update")
    parser.add_argument("--content", help="New content")
    parser.add_argument("--version", type=int, help="New version number")
    args = parser.parse_args()

    main(args.copy_id, args.content, args.version)

import argparse
import json
import sys
sys.path.append('..')
from conn import get_supabase_client


def update_copy_type(copy_type_id: str, data: dict):
    client = get_supabase_client()
    response = client.table("copy_types").update(data).eq("id", copy_type_id).execute()
    return response.data[0]


def main(copy_type_id: str, data_json: str):
    data = json.loads(data_json)
    result = update_copy_type(copy_type_id, data)
    print(result)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update a copy type")
    parser.add_argument("--copy-type-id", required=True, help="Copy type ID")
    parser.add_argument("--data", required=True, help="JSON data to update")
    args = parser.parse_args()

    main(args.copy_type_id, args.data)

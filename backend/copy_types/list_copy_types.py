import argparse
import sys
sys.path.append('..')
from conn import get_supabase_client


def list_copy_types():
    client = get_supabase_client()
    response = client.table("copy_types").select("*").order("code").execute()
    return response.data


def main():
    result = list_copy_types()
    for item in result:
        print(f"{item['code']}: {item['name']}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="List all copy types")
    parser.parse_args()

    main()

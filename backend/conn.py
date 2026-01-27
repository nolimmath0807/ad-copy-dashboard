import argparse
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

_supabase_client: Client | None = None


def get_supabase_client() -> Client:
    global _supabase_client
    if _supabase_client is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_KEY"]
        _supabase_client = create_client(url, key)
    return _supabase_client


def main(test: bool):
    client = get_supabase_client()
    print(f"Supabase client created: {type(client)}")

    if test:
        response = client.table("ad_copies").select("*").limit(1).execute()
        print(f"Connection test successful. Response: {response}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Supabase connection module")
    parser.add_argument("--test", action="store_true", help="Test the connection")
    args = parser.parse_args()

    main(args.test)

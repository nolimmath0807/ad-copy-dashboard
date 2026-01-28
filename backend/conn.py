import argparse
from db import get_db_client


def get_supabase_client():
    """
    호환성을 위해 함수명 유지
    실제로는 PostgreSQL 클라이언트 반환
    """
    return get_db_client()


def main(test: bool):
    client = get_supabase_client()
    print(f"Database client created: {type(client)}")

    if test:
        response = client.table("teams").select("*").execute()
        print(f"Connection test successful. Teams: {response.data}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Database connection module")
    parser.add_argument("--test", action="store_true", help="Test the connection")
    args = parser.parse_args()

    main(args.test)

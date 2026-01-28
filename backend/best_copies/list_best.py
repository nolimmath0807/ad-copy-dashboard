import argparse
import sys

sys.path.insert(0, "/Users/las/Development/project/ad-copy-dashboard/backend")
from conn import get_supabase_client


def list_best_copies(month: str = None) -> list:
    client = get_supabase_client()
    query = client.table("best_copies").select(
        "*, copies(*, products(*), copy_types(*))"
    )
    if month:
        query = query.eq("month", month)
    response = query.order("ad_spend", desc=True).execute()
    return response.data


def main(month: str = None):
    result = list_best_copies(month)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="List best copies")
    parser.add_argument("--month", help="Filter by month (e.g., 2025-01)")
    args = parser.parse_args()

    result = main(args.month)
    print(result)

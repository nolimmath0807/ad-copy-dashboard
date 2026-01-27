import argparse
import sys

sys.path.insert(0, "/Users/las/Development/project/ad-copy-dashboard/backend")
from conn import get_supabase_client


def create_best_copy(data: dict) -> dict:
    client = get_supabase_client()
    response = client.table("best_copies").insert(data).execute()
    return response.data[0]


def main(copy_id: str, month: str, ad_spend: float):
    data = {"copy_id": copy_id, "month": month, "ad_spend": ad_spend}
    result = create_best_copy(data)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a best copy entry")
    parser.add_argument("--copy-id", required=True, help="Generated copy ID")
    parser.add_argument("--month", required=True, help="Month (e.g., 2025-01)")
    parser.add_argument("--ad-spend", type=float, required=True, help="Ad spend amount")
    args = parser.parse_args()

    result = main(args.copy_id, args.month, args.ad_spend)
    print(result)

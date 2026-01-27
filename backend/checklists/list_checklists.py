import argparse
import sys
sys.path.insert(0, sys.path[0] + "/..")

from conn import get_supabase_client


def list_checklists(week: str = None):
    client = get_supabase_client()
    query = client.table("checklists").select("*, products(*), copy_types(*)")
    if week:
        query = query.eq("week", week)
    response = query.execute()
    return response.data


def main(week: str = None):
    result = list_checklists(week)
    print(f"Found {len(result)} checklists")
    for item in result:
        print(f"  - {item['products']['name']} x {item['copy_types']['code']}: {item['status']} (week: {item.get('week', 'N/A')})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="List checklists")
    parser.add_argument("--week", help="Filter by week (e.g., 2026-W04)")
    args = parser.parse_args()
    main(args.week)

import argparse
import sys
sys.path.insert(0, sys.path[0] + "/..")

from conn import get_supabase_client
from team_products.get_team_products_by_team import get_team_products_by_team


def list_checklists(week: str = None, team_id: str = None):
    client = get_supabase_client()
    query = client.table("checklists").select("*, products(*), copy_types(*)")
    if week:
        query = query.eq("week", week)

    if team_id:
        product_ids = get_team_products_by_team(team_id)
        if product_ids:
            query = query.in_("product_id", product_ids)
        else:
            return []

    response = query.execute()
    return response.data


def main(week: str = None, team_id: str = None):
    result = list_checklists(week, team_id)
    print(f"Found {len(result)} checklists")
    for item in result:
        print(f"  - {item['products']['name']} x {item['copy_types']['code']}: {item['status']} (week: {item.get('week', 'N/A')})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="List checklists")
    parser.add_argument("--week", help="Filter by week (e.g., 2026-W04)")
    parser.add_argument("--team-id", help="Filter by team ID (only show products assigned to this team)")
    args = parser.parse_args()
    main(args.week, args.team_id)

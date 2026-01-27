import argparse
import sys
sys.path.insert(0, "/Users/las/Development/project/ad-copy-dashboard/backend")

from conn import get_supabase_client


def update_checklist(checklist_id: str, data: dict):
    client = get_supabase_client()
    data["updated_at"] = "now()"
    response = client.table("checklists").update(data).eq("id", checklist_id).execute()
    return response.data[0]


def main(checklist_id: str, status: str, notes: str):
    data = {}
    if status:
        data["status"] = status
    if notes:
        data["notes"] = notes

    result = update_checklist(checklist_id, data)
    print(f"Updated checklist {checklist_id}")
    print(f"New status: {result.get('status')}")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update a checklist")
    parser.add_argument("--id", required=True, dest="checklist_id", help="Checklist ID to update")
    parser.add_argument("--status", choices=["pending", "in_progress", "completed"], help="New status")
    parser.add_argument("--notes", default="", help="Notes to add")
    args = parser.parse_args()

    main(args.checklist_id, args.status, args.notes)

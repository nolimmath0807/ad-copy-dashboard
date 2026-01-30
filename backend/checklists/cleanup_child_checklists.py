import argparse
import sys
sys.path.insert(0, sys.path[0] + "/..")

from db import get_db_client


def cleanup_child_checklists(dry_run=True):
    client = get_db_client()

    # 자식 copy_type ID 목록 조회 (parent_id가 NOT NULL인 것)
    all_types = client.table("copy_types").select("id, parent_id").execute().data
    child_ids = [ct["id"] for ct in all_types if ct.get("parent_id") is not None]

    if not child_ids:
        print("No child copy types found. Nothing to clean up.")
        return

    print(f"Found {len(child_ids)} child copy type IDs")

    # 해당 copy_type_id를 가진 체크리스트 조회
    checklists = client.table("checklists").select("id, copy_type_id, week, team_id").in_("copy_type_id", child_ids).execute().data
    print(f"Found {len(checklists)} checklist records to delete")

    if dry_run:
        print("[DRY RUN] No records deleted. Run with --execute to delete.")
        return

    if checklists:
        checklist_ids = [c["id"] for c in checklists]
        client.table("checklists").delete().in_("id", checklist_ids).execute()
        print(f"Deleted {len(checklist_ids)} checklist records")


def main(dry_run):
    cleanup_child_checklists(dry_run)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Clean up checklists for child copy types")
    parser.add_argument("--execute", action="store_true", help="Actually delete (default is dry run)")
    args = parser.parse_args()
    main(dry_run=not args.execute)

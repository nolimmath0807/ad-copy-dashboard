import argparse
import sys
sys.path.insert(0, "/Users/las/Development/project/ad-copy-dashboard/backend")

from conn import get_supabase_client


def get_checklist_stats():
    client = get_supabase_client()
    response = client.table("checklists").select("status").execute()
    data = response.data
    total = len(data)
    completed = len([d for d in data if d["status"] == "completed"])
    in_progress = len([d for d in data if d["status"] == "in_progress"])
    pending = len([d for d in data if d["status"] == "pending"])
    return {
        "total": total,
        "completed": completed,
        "in_progress": in_progress,
        "pending": pending,
        "completion_rate": round(completed / total * 100, 1) if total > 0 else 0
    }


def main(verbose: bool):
    stats = get_checklist_stats()
    if verbose:
        print("Checklist Statistics:")
        print(f"  Total: {stats['total']}")
        print(f"  Completed: {stats['completed']}")
        print(f"  In Progress: {stats['in_progress']}")
        print(f"  Pending: {stats['pending']}")
        print(f"  Completion Rate: {stats['completion_rate']}%")
    else:
        print(stats)
    return stats


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Get checklist statistics")
    parser.add_argument("--verbose", action="store_true", help="Print formatted output")
    args = parser.parse_args()

    main(args.verbose)

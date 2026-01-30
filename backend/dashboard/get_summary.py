import argparse
from collections import defaultdict
from conn import get_supabase_client


def get_dashboard_summary(week: str = None):
    client = get_supabase_client()

    # 1. Get all copy_types for parent/child mapping
    copy_types_resp = client.table("copy_types").select("id, parent_id, code").execute()
    copy_types = copy_types_resp.data
    parent_map = {}  # child_id -> parent_id
    for ct in copy_types:
        if ct.get("parent_id"):
            parent_map[ct["id"]] = ct["parent_id"]

    # 2. Generation matrix: group copies by product_id, copy_type_id
    copies_resp = client.table("copies").select("id, product_id, copy_type_id").execute()
    all_copies = copies_resp.data

    raw_counts = defaultdict(lambda: defaultdict(int))
    for c in all_copies:
        raw_counts[c["product_id"]][c["copy_type_id"]] += 1

    # Roll up child counts into parent
    rolled_counts = defaultdict(lambda: defaultdict(int))
    for product_id, type_counts in raw_counts.items():
        for copy_type_id, count in type_counts.items():
            effective_id = parent_map.get(copy_type_id, copy_type_id)
            rolled_counts[product_id][effective_id] += count

    generation_matrix = [
        {"product_id": pid, "copy_type_id": ctid, "count": count}
        for pid, type_counts in rolled_counts.items()
        for ctid, count in type_counts.items()
    ]

    # 3. Total generations
    total_generations = len(all_copies)

    # 4. Recent copies (last 5)
    # Get products lookup for matrix display and recent copies
    products_resp = client.table("products").select("id, name").execute()
    products_map = {p["id"]: p["name"] for p in products_resp.data}

    # copy_types code lookup (reuse copy_types queried above)
    ct_code_map = {ct["id"]: ct["code"] for ct in copy_types}

    recent_raw = (
        client.table("copies")
        .select("*")
        .order("created_at", desc=True)
        .limit(5)
        .execute()
    )
    recent_copies = [
        {
            "id": c["id"],
            "created_at": c["created_at"],
            "products": {"name": products_map.get(c["product_id"], "")},
            "copy_types": {"code": ct_code_map.get(c["copy_type_id"], "")},
        }
        for c in recent_raw.data
    ]

    # 5. Checklist stats
    checklist_query = client.table("checklists").select("id, utm_code, product_id")
    if week:
        checklist_query = checklist_query.eq("week", week)
    checklists_resp = checklist_query.execute()
    checklists = checklists_resp.data

    total = len(checklists)
    filled = sum(
        1 for cl in checklists
        if cl.get("utm_code") and cl["utm_code"] not in (None, "", "[]", [])
    )
    completion_rate = round(filled * 100 / total) if total > 0 else 0

    checklist_stats = {
        "total": total,
        "filled": filled,
        "completion_rate": completion_rate,
    }

    # 6. Team checklist stats
    # Get team_products mapping: product_id -> team_id
    tp_resp = client.table("team_products").select("team_id, product_id").execute()
    product_to_team = {}
    for tp in tp_resp.data:
        product_to_team[tp["product_id"]] = tp["team_id"]

    team_stats = defaultdict(lambda: {"total": 0, "filled": 0})
    for cl in checklists:
        team_id = product_to_team.get(cl.get("product_id"))
        if not team_id:
            continue
        team_stats[team_id]["total"] += 1
        if cl.get("utm_code") and cl["utm_code"] not in (None, "", "[]", []):
            team_stats[team_id]["filled"] += 1

    team_checklist_stats = {}
    for team_id, stats in team_stats.items():
        t, f = stats["total"], stats["filled"]
        team_checklist_stats[team_id] = {
            "total": t,
            "filled": f,
            "completion_rate": round(f * 100 / t) if t > 0 else 0,
        }

    return {
        "generation_matrix": generation_matrix,
        "total_generations": total_generations,
        "recent_copies": recent_copies,
        "checklist_stats": checklist_stats,
        "team_checklist_stats": team_checklist_stats,
    }


def main(week: str = None):
    result = get_dashboard_summary(week)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Get dashboard summary")
    parser.add_argument("--week", default=None, help="Week string for checklist filtering")
    args = parser.parse_args()

    result = main(args.week)
    print(result)

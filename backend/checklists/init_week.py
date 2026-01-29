import argparse
import sys
from datetime import datetime
sys.path.insert(0, sys.path[0] + "/..")

from conn import get_supabase_client


def get_current_week() -> str:
    now = datetime.now()
    return now.strftime("%G-W%V")


def init_week_checklists(week: str = None):
    """새 주차의 체크리스트를 초기화 (팀별 상품 x 유형 조합)"""
    if week is None:
        week = get_current_week()

    client = get_supabase_client()

    # 팀별 상품 조합과 유형 조회
    team_products = client.table("team_products").select("team_id, product_id").execute().data
    copy_types = client.table("copy_types").select("id").is_("parent_id", None).execute().data

    # 기존 체크리스트 조회
    existing = client.table("checklists").select("product_id, copy_type_id, team_id").eq("week", week).execute().data
    existing_triples = {(item["product_id"], item["copy_type_id"], item["team_id"]) for item in existing}

    # 누락된 조합만 생성
    new_checklists = []
    for tp in team_products:
        for copy_type in copy_types:
            triple = (tp["product_id"], copy_type["id"], tp["team_id"])
            if triple not in existing_triples:
                new_checklists.append({
                    "product_id": tp["product_id"],
                    "copy_type_id": copy_type["id"],
                    "team_id": tp["team_id"],
                    "status": "pending",
                    "week": week
                })

    if new_checklists:
        response = client.table("checklists").insert(new_checklists).execute()
        print(f"Created {len(response.data)} new checklists for week {week}")
        return response.data

    print(f"No new checklists needed for week {week}")
    return []


def main(week: str = None):
    result = init_week_checklists(week)
    print(f"Initialized {len(result)} checklists")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Initialize week checklists")
    parser.add_argument("--week", help="Week to initialize (default: current week)")
    args = parser.parse_args()
    main(args.week)

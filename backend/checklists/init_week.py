import argparse
import sys
from datetime import datetime
sys.path.insert(0, sys.path[0] + "/..")

from conn import get_supabase_client


def get_current_week() -> str:
    now = datetime.now()
    return now.strftime("%G-W%V")


def init_week_checklists(week: str = None):
    """새 주차의 체크리스트를 초기화 (모든 상품 x 유형 조합)"""
    if week is None:
        week = get_current_week()

    client = get_supabase_client()

    # 이미 해당 주차 데이터가 있는지 확인
    existing = client.table("checklists").select("id").eq("week", week).limit(1).execute()
    if existing.data:
        print(f"Week {week} already has checklists")
        return existing.data

    # 모든 상품과 유형 조회
    products = client.table("products").select("id").execute().data
    copy_types = client.table("copy_types").select("id").execute().data

    # 새 체크리스트 생성
    new_checklists = []
    for product in products:
        for copy_type in copy_types:
            new_checklists.append({
                "product_id": product["id"],
                "copy_type_id": copy_type["id"],
                "status": "pending",
                "week": week
            })

    if new_checklists:
        response = client.table("checklists").insert(new_checklists).execute()
        print(f"Created {len(response.data)} checklists for week {week}")
        return response.data

    return []


def main(week: str = None):
    result = init_week_checklists(week)
    print(f"Initialized {len(result)} checklists")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Initialize week checklists")
    parser.add_argument("--week", help="Week to initialize (default: current week)")
    args = parser.parse_args()
    main(args.week)

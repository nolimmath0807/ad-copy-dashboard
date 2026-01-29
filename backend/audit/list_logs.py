import argparse
from db import get_db_client


def list_audit_logs(table_name=None, user_id=None, limit=100, offset=0):
    client = get_db_client()
    query = client.table("audit_logs").select("*")
    if table_name:
        query = query.eq("table_name", table_name)
    if user_id:
        query = query.eq("user_id", user_id)
    query = query.order("created_at", desc=True).limit(limit)
    result = query.execute()
    return result.data


def main(table_name, user_id, limit):
    logs = list_audit_logs(table_name, user_id, limit)
    for log in logs:
        print(f"[{log['created_at']}] {log['user_name'] or 'system'} {log['action']} {log['table_name']} {log['record_id']}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="List audit logs")
    parser.add_argument("--table", default=None)
    parser.add_argument("--user-id", default=None)
    parser.add_argument("--limit", type=int, default=100)
    args = parser.parse_args()
    main(args.table, args.user_id, args.limit)

import argparse
import json
from db import get_db_client


def write_audit_log(user_id, action, table_name, record_id, changes=None):
    try:
        client = get_db_client()
        user_name = None
        if user_id:
            user_result = client.table("users").select("name").eq("id", user_id).single().execute()
            if user_result.data:
                user_name = user_result.data.get("name")

        log_data = {
            "user_id": user_id,
            "user_name": user_name,
            "action": action,
            "table_name": table_name,
            "record_id": str(record_id) if record_id else None,
            "changes": json.dumps(changes) if changes else None,
        }
        client.table("audit_logs").insert(log_data).execute()
    except Exception as e:
        print(f"[audit] Failed to write audit log: {e}")


def main(action, table_name, record_id):
    write_audit_log(None, action, table_name, record_id, {"test": True})
    print("Audit log written")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Write audit log")
    parser.add_argument("--action", required=True)
    parser.add_argument("--table", required=True)
    parser.add_argument("--record-id", default=None)
    args = parser.parse_args()
    main(args.action, args.table, args.record_id)

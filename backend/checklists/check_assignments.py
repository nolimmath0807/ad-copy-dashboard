import sys
sys.path.insert(0, sys.path[0] + "/..")
from db import get_db_client

client = get_db_client()
products = client.table("products").select("id, name").execute().data
teams = client.table("teams").select("id, name").execute().data
tp = client.table("team_products").select("team_id, product_id").execute().data

team_map = {t["id"]: t["name"] for t in teams}
prod_map = {p["id"]: p["name"] for p in products}

print("=== All Products ===")
for p in products:
    print(f"  {p['name']}")

print()
print("=== Team-Product Assignments ===")
for t in tp:
    print(f"  {team_map.get(t['team_id'], t['team_id'])} -> {prod_map.get(t['product_id'], t['product_id'])}")

# Check which products are NOT assigned to any team
assigned_ids = {t["product_id"] for t in tp}
unassigned = [p for p in products if p["id"] not in assigned_ids]
if unassigned:
    print()
    print("=== Unassigned Products (no team) ===")
    for p in unassigned:
        print(f"  {p['name']}")

import argparse
import json
import sys
sys.path.insert(0, sys.path[0] + "/..")

from conn import get_supabase_client


def register_user(email: str, password: str, name: str, team_id: str):
    client = get_supabase_client()

    # 이메일 중복 확인
    existing = client.table("users").select("id").eq("email", email).execute()
    if existing.data:
        raise Exception("이미 등록된 이메일입니다")

    # users 테이블에 직접 저장
    user_data = {
        "email": email,
        "password": password,  # 실제 서비스에서는 해시 필요
        "name": name,
        "team_id": team_id,
        "is_approved": False,
        "role": "user"
    }

    response = client.table("users").insert(user_data).execute()
    user = response.data[0]

    # 비밀번호 제외하고 반환
    del user["password"]
    return user


def main(email: str, password: str, name: str, team_id: str):
    user = register_user(email, password, name, team_id)
    print(json.dumps(user, indent=2, ensure_ascii=False))
    return user


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Register a new user")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--team-id", required=True)
    args = parser.parse_args()
    main(args.email, args.password, args.name, args.team_id)

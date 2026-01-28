import argparse
import json
import secrets
import sys
sys.path.insert(0, sys.path[0] + "/..")

from conn import get_supabase_client


def login_user(email: str, password: str):
    client = get_supabase_client()

    # 사용자 조회
    response = client.table("users").select("*, teams(*)").eq("email", email).execute()

    if not response.data:
        raise Exception("이메일 또는 비밀번호가 올바르지 않습니다")

    user = response.data[0]

    # 비밀번호 확인
    if user["password"] != password:
        raise Exception("이메일 또는 비밀번호가 올바르지 않습니다")

    # 간단한 토큰 생성 (실제 서비스에서는 JWT 사용)
    token = secrets.token_urlsafe(32)

    # 비밀번호 제외
    del user["password"]

    return {
        "user": user,
        "session": {
            "access_token": f"{user['id']}:{token}",
            "refresh_token": secrets.token_urlsafe(32)
        }
    }


def main(email: str, password: str):
    result = login_user(email, password)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Login user")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()
    main(args.email, args.password)

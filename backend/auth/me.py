import argparse
import json
import sys
sys.path.insert(0, sys.path[0] + "/..")

from conn import get_supabase_client


def get_current_user(access_token: str):
    client = get_supabase_client()

    # 토큰에서 user_id 추출 (형식: user_id:random_token)
    try:
        user_id = access_token.split(":")[0]
    except:
        raise Exception("Invalid token")

    # users 테이블에서 사용자 조회
    response = client.table("users").select("*, teams(*)").eq("id", user_id).execute()

    if not response.data:
        raise Exception("User not found")

    user = response.data[0]

    # 비밀번호 제외
    if "password" in user:
        del user["password"]

    return user


def main(access_token: str):
    user = get_current_user(access_token)
    print(json.dumps(user, indent=2, ensure_ascii=False))
    return user


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Get current user info")
    parser.add_argument("--token", required=True, help="Access token")
    args = parser.parse_args()
    main(args.token)

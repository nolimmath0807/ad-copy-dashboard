import argparse
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from google import genai
from dotenv import load_dotenv

load_dotenv()

SIMILARITY_CHECK_PROMPT = """
당신은 광고 원고 유형 분석 전문가입니다.

새로운 원고 유형이 기존 원고 유형들과 얼마나 유사한지 분석해주세요.

## 새로운 원고 유형
- 핵심 콘셉트: {new_core_concept}
- 설명: {new_description}
- 예시 원고: {new_example_copy}

## 기존 원고 유형 목록
{existing_types_text}

## 분석 기준
1. 핵심 콘셉트의 유사성 (의도, 목적, 접근 방식)
2. 설명의 유사성 (설명하는 방식, 특징)
3. 예시 원고의 유사성 (어조, 구조, 표현 방식)

## 응답 형식
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.
유사도가 80% 이상인 유형만 포함하세요.

```json
{{
  "similar_types": [
    {{
      "code": "유형코드",
      "name": "유형명",
      "similarity_percent": 85,
      "reason": "유사한 이유 설명"
    }}
  ]
}}
```

유사도가 80% 이상인 유형이 없으면:
```json
{{
  "similar_types": []
}}
```
"""


def check_copy_type_similarity(new_data: dict, existing_types: list[dict]) -> dict:
    if not existing_types:
        return {"is_similar": False, "similar_types": []}

    existing_types_text = ""
    for t in existing_types:
        existing_types_text += f"""
- 코드: {t.get("code", "")}
  이름: {t.get("name", "")}
  핵심 콘셉트: {t.get("core_concept", "")}
  설명: {t.get("description", "")}
  예시 원고: {t.get("example_copy", "")}
"""

    prompt = SIMILARITY_CHECK_PROMPT.format(
        new_core_concept=new_data.get("core_concept", ""),
        new_description=new_data.get("description", ""),
        new_example_copy=new_data.get("example_copy", ""),
        existing_types_text=existing_types_text,
    )

    api_key = os.environ["GEMINI_API_KEY"]
    client = genai.Client(api_key=api_key)

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
    )

    response_text = response.text.strip()

    # Handle markdown code blocks in response
    if "```json" in response_text:
        response_text = response_text.split("```json")[1].split("```")[0].strip()
    elif "```" in response_text:
        response_text = response_text.split("```")[1].split("```")[0].strip()

    try:
        parsed = json.loads(response_text)
        similar_types = parsed.get("similar_types", [])
        return {
            "is_similar": len(similar_types) > 0,
            "similar_types": similar_types,
        }
    except (json.JSONDecodeError, KeyError):
        return {"is_similar": False, "similar_types": []}


def main(core_concept: str, description: str, example_copy: str):
    new_data = {
        "core_concept": core_concept,
        "description": description,
        "example_copy": example_copy,
    }
    # For CLI testing, use empty existing types
    result = check_copy_type_similarity(new_data, [])
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Check copy type similarity using Gemini AI")
    parser.add_argument("--core-concept", required=True, help="Core concept of the new copy type")
    parser.add_argument("--description", required=True, help="Description of the new copy type")
    parser.add_argument("--example-copy", required=True, help="Example copy of the new copy type")
    args = parser.parse_args()

    result = main(args.core_concept, args.description, args.example_copy)
    print(json.dumps(result, ensure_ascii=False, indent=2))

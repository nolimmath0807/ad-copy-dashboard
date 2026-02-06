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

새로운 원고 유형이 기존 원고 유형들과 얼마나 유사한지 **2단계 분석**을 수행하세요.

## 새로운 원고 유형
- 핵심 콘셉트: {new_core_concept}
- 설명: {new_description}
- 예시 원고: {new_example_copy}

## 기존 원고 유형 목록
{existing_types_text}

## 2단계 유사도 검사 기준

### 1단계: 구조 유사도 (structure_similarity)
원고의 **전체 구조/뼈대**가 동일한지 판단합니다.
- 문장 배치 순서, 단락 구성, 흐름 패턴이 같은가?
- 상품명/브랜드명/키워드만 바꾸고 나머지 틀은 그대로인 베리에이션인가?
- 구조가 완전히 다르면 낮은 점수 (30% 이하)

### 2단계: 설득 기조 유사도 (persuasion_similarity)
원고 구조가 다르더라도 **무엇으로 설득하는지**가 같은지 판단합니다.
- 소비자의 어떤 심리/니즈를 자극하는가?
- 어떤 논리 구조로 설득하는가?
- 핵심 소구점(appeal point)이 동일한가?

### 최종 유사도 계산
- 구조 유사도 70% 이상 → 최종 유사도 = 구조 유사도
- 구조 유사도 70% 미만 → 최종 유사도 = 설득 기조 유사도 × 0.8

## 응답 형식
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.
최종 유사도(similarity_percent) 80% 이상인 유형만 포함하세요.

```json
{{
  "similar_types": [
    {{
      "code": "유형코드",
      "name": "유형명",
      "structure_similarity": 85,
      "persuasion_similarity": 90,
      "similarity_percent": 85,
      "reason": "1차(구조): [이유] / 2차(설득기조): [이유]"
    }}
  ]
}}
```

유사한 유형이 없으면 similar_types를 빈 배열로 두세요.
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
        model="gemini-2.5-flash",
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

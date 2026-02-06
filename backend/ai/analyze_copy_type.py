import argparse
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from google import genai
from dotenv import load_dotenv

load_dotenv()


ANALYZE_PROMPT = """
당신은 광고 원고 유형 분석 전문가입니다.

## 작업
아래 "신규 원고"를 분석하여:
1. 이 원고의 유형 코드(code), 이름(name), 핵심 콘셉트(core_concept), 설명(description)을 추출하세요.
2. 기존 원고 유형 목록과 **2단계 유사도 검사**를 수행하세요.

## 신규 원고
{script_text}

## 기존 원고 유형 목록
{existing_types_text}

## 2단계 유사도 검사 기준

### 1단계: 구조 유사도 (structure_similarity)
원고의 **전체 구조/뼈대**가 동일한지 판단합니다.
- 문장 배치 순서, 단락 구성, 흐름 패턴이 같은가?
- 상품명/브랜드명/키워드만 바꾸고 나머지 틀은 그대로인 베리에이션인가?
- 예: "A 상품이 고민이시라면?" → "B 상품이 고민이시라면?" 는 구조가 동일(95%+)
- 구조가 완전히 다르면 낮은 점수 (30% 이하)

### 2단계: 설득 기조 유사도 (persuasion_similarity)
원고 구조가 다르더라도 **무엇으로 설득하는지**가 같은지 판단합니다.
- 소비자의 어떤 심리/니즈를 자극하는가? (공포, 호기심, 사회적 증거, 긴급성 등)
- 어떤 논리 구조로 설득하는가? (문제제기→해결, 비교→우위, 후기→신뢰 등)
- 핵심 소구점(appeal point)이 동일한가?
- 예: 구조는 다르지만 둘 다 "사용 후기로 신뢰감 형성" → 설득 기조 유사(80%+)

### 최종 유사도 계산
- 구조 유사도 70% 이상 → 최종 유사도 = 구조 유사도 (구조가 같으면 확정적으로 유사)
- 구조 유사도 70% 미만 → 최종 유사도 = 설득 기조 유사도 × 0.8 (구조가 다르면 설득 기조로 판단, 가중치 적용)

## 코드 작성 규칙
- code는 알파벳 대문자 + 숫자 조합 (예: A1, B3, C2)
- 기존 코드와 중복되지 않아야 합니다
- 기존 코드 목록: {existing_codes}

## 응답 형식
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.

```json
{{
  "extracted": {{
    "code": "추천 코드",
    "name": "추천 유형명",
    "core_concept": "핵심 콘셉트 요약",
    "description": "이 유형에 대한 설명"
  }},
  "similar_types": [
    {{
      "code": "기존유형코드",
      "name": "기존유형명",
      "structure_similarity": 85,
      "persuasion_similarity": 90,
      "similarity_percent": 85,
      "reason": "1차(구조): [구조 유사 이유] / 2차(설득기조): [설득 유사 이유]"
    }}
  ]
}}
```

구조 유사도(structure_similarity) 80% 이상인 유형만 similar_types에 포함하세요.
유사한 유형이 없으면 similar_types를 빈 배열로 두세요.
"""


def analyze_and_check(script_text: str, existing_types: list[dict]) -> dict:
    if not script_text.strip():
        return {"extracted": None, "is_similar": False, "similar_types": []}

    existing_types_text = ""
    existing_codes = []
    for t in existing_types:
        existing_codes.append(t.get("code", ""))
        existing_types_text += f"""
- 코드: {t.get("code", "")}
  이름: {t.get("name", "")}
  핵심 콘셉트: {t.get("core_concept", "")}
  설명: {t.get("description", "")}
  예시 원고: {(t.get("example_copy", "") or "")[:500]}
"""

    if not existing_types:
        existing_types_text = "(없음)"

    prompt = ANALYZE_PROMPT.format(
        script_text=script_text,
        existing_types_text=existing_types_text,
        existing_codes=", ".join(existing_codes) if existing_codes else "(없음)",
    )

    api_key = os.environ["GEMINI_API_KEY"]
    client = genai.Client(api_key=api_key)

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    response_text = response.text.strip()

    # Handle markdown code blocks
    if "```json" in response_text:
        response_text = response_text.split("```json")[1].split("```")[0].strip()
    elif "```" in response_text:
        response_text = response_text.split("```")[1].split("```")[0].strip()

    try:
        parsed = json.loads(response_text)
        similar_types = parsed.get("similar_types", [])
        extracted = parsed.get("extracted", {})

        # Enrich similar_types with id from existing_types
        code_to_id = {t.get("code"): t.get("id") for t in existing_types}
        for st in similar_types:
            st["id"] = code_to_id.get(st.get("code"), "")

        return {
            "extracted": extracted,
            "is_similar": len(similar_types) > 0,
            "similar_types": similar_types,
        }
    except (json.JSONDecodeError, KeyError):
        return {"extracted": None, "is_similar": False, "similar_types": []}


def main(script_text: str):
    result = analyze_and_check(script_text, [])
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Analyze copy type script and check similarity")
    parser.add_argument("--script", required=True, help="The script text to analyze")
    args = parser.parse_args()
    main(args.script)

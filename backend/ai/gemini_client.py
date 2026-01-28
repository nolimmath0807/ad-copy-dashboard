import argparse
import os

from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

COPY_GENERATION_PROMPT = """
당신은 광고 원고 변환 전문가입니다.

## 핵심 규칙 (반드시 준수)
1. 아래 "원본 원고"의 문장 구조, 어투, 흐름을 **그대로 유지**하세요.
2. 원본 원고에서 **상품명, 성분, 기전, 효능** 부분만 새로운 상품 정보로 교체하세요.
3. 원본의 감정적 표현, 후킹 문구, 말투는 **절대 변경하지 마세요**.
4. 새로운 문장을 추가하거나 원본에 없는 내용을 창작하지 마세요.
5. 원본 원고의 길이와 최대한 비슷하게 유지하세요.

## 출력 형식 규칙
- 문단과 문단 사이에는 **빈 줄 하나**를 넣어 구분하세요.
- 2~3문장마다 줄바꿈하여 가독성을 높이세요.
- 긴 문장은 적절히 끊어서 읽기 쉽게 만드세요.

## 새로운 상품 정보 (이 정보로 교체)
- 품명: {name}
- 영문명: {english_name}
- USP (핵심 셀링포인트): {usp}
- 기전 (작용 원리): {mechanism}
- 형태: {shape}

## 원본 원고 (구조 유지, 상품 정보만 교체)
{example_copy}

---

위 원본 원고를 기반으로, 상품 관련 정보(이름, 성분, 기전, 효능)만 새로운 상품 정보로 교체한 원고를 출력하세요.
원본의 문체, 구조, 감정적 표현은 그대로 유지하세요.
줄바꿈을 명확하게 하여 가독성 좋게 출력하세요.
반드시 하나의 완성된 원고만 출력하세요. 여러 버전이나 반복 출력은 절대 하지 마세요.
구분선(---) 없이 깔끔하게 하나의 원고만 작성하세요.
"""


def generate_copy(product_info: dict, copy_type_info: dict, custom_prompt: str = None) -> str:
    api_key = os.environ["GEMINI_API_KEY"]

    client = genai.Client(api_key=api_key)

    prompt = COPY_GENERATION_PROMPT.format(
        name=product_info.get("name", ""),
        english_name=product_info.get("english_name", ""),
        usp=product_info.get("usp", ""),
        mechanism=product_info.get("mechanism", ""),
        shape=product_info.get("shape", ""),
        example_copy=copy_type_info.get("example_copy", ""),
    )

    if custom_prompt:
        prompt += f"\n\n## 추가 요청사항\n{custom_prompt}"

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
    )

    return response.text


def main(product_name: str, product_usp: str, copy_type_name: str):
    product_info = {
        "name": product_name,
        "usp": product_usp,
        "appeal_points": [],
        "mechanism": "",
        "features": [],
        "english_name": "",
        "shape": "",
        "herb_keywords": [],
    }
    copy_type_info = {
        "name": copy_type_name,
        "core_concept": "테스트",
        "description": "테스트 설명",
        "example_copy": "예시 원고입니다.",
    }

    result = generate_copy(product_info, copy_type_info)
    print("생성된 원고:")
    print(result)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Gemini AI 원고 생성")
    parser.add_argument("--product-name", required=True, help="상품명")
    parser.add_argument("--product-usp", required=True, help="상품 USP")
    parser.add_argument("--copy-type-name", required=True, help="원고 유형명")
    args = parser.parse_args()

    main(args.product_name, args.product_usp, args.copy_type_name)

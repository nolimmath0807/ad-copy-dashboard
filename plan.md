# Ad-Copy-Dashboard 개선

## Overview
체크리스트 UX를 개선하여 1) 신규 상품 추가 시 기본 UTM 코드를 설정할 수 있도록 하고, 2) 주차 표시를 날짜 범위로 변경하여 직관성을 높입니다.

## Key Files
| File | Action | Description |
|------|--------|-------------|
| `frontend/src/pages/Products.tsx` | Modify | 상품 생성/수정 폼에 UTM 코드 필드 추가 |
| `frontend/src/types/index.ts` | Modify | Product 인터페이스에 default_utm_code 추가 |
| `frontend/src/lib/api-client.ts` | Modify | ProductCreate에 default_utm_code 추가 |
| `backend/products/create_product.py` | Modify | default_utm_code 필드 처리 |
| `backend/products/update_product.py` | Modify | default_utm_code 필드 처리 |
| `backend/api.py` | Modify | ProductCreate/ProductUpdate 모델에 필드 추가 |
| `frontend/src/pages/Checklist.tsx` | Modify | 주차 표시를 날짜 범위 형식으로 변경 |

## Implementation Steps

### Issue 1: 신규상품 UTM 코드 입력 기능

1. **Backend: Product 모델에 default_utm_code 필드 추가**
   - `backend/api.py`의 ProductCreate, ProductUpdate 모델 수정
   - `backend/products/create_product.py`, `update_product.py` 수정
   - Database 스키마에 default_utm_code 컬럼 추가 필요

2. **Frontend: 상품 폼에 UTM 코드 입력란 추가**
   - `frontend/src/types/index.ts`에 default_utm_code 추가
   - `frontend/src/pages/Products.tsx`에 입력 필드 추가
   - 생성/수정 다이얼로그 모두에 적용

### Issue 2: 주차 표시를 날짜 범위로 변경

3. **Frontend: 주차 → 날짜 범위 변환 함수 추가**
   - ISO week를 시작일~종료일로 변환하는 유틸리티 함수 작성
   - 형식: "1월 27일 ~ 2월 2일"

4. **Frontend: Checklist 페이지 UI 수정**
   - 주차 선택 드롭다운에 날짜 범위 표시
   - 내부적으로는 YYYY-W## 형식 유지 (API 호환성)

## Dependencies
- 없음 (기존 라이브러리로 충분)

## Risks & Mitigations
- **DB 스키마 변경**: Supabase에서 products 테이블에 default_utm_code 컬럼 추가 필요
- **기존 데이터 호환성**: nullable 필드로 추가하여 기존 데이터 영향 없음

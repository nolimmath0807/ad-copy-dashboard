# 체크리스트 팀-상품 제외 필터

## Overview
관리자가 특정 팀-상품 조합을 체크리스트에서 제외할 수 있는 기능 구현. 두 가지 레벨의 제외를 지원한다:
1. **영구 제외** (`team_products.active`): 비활성화하면 매주 자동 제외
2. **주차별 제외** (`checklists.excluded`): 특정 주차에만 제외, 완료율에서 빠짐

## Key Files
| File | Action | Description |
|------|--------|-------------|
| `backend/migrate_exclusion.py` | Create | DB 마이그레이션 (active + excluded 컬럼) |
| `backend/team_products/update_team_product.py` | Create | team_product active 토글 |
| `backend/checklists/init_week.py` | Modify | active=false 팀-상품 제외 |
| `backend/checklists/list_checklists.py` | Modify | excluded 필터 옵션 |
| `backend/api.py` | Modify | 엔드포인트 추가/수정 |
| `frontend/src/pages/Checklist.tsx` | Modify | 제외 토글 UI + 완료율 계산 수정 |
| `frontend/src/lib/api-client.ts` | Modify | API 클라이언트 수정 |
| `frontend/src/types/index.ts` | Modify | 타입 추가 |

## Implementation Steps

### Phase 1: DB 마이그레이션 (병렬)

1. **migrate_exclusion.py 생성**
   - `ALTER TABLE team_products ADD COLUMN active BOOLEAN DEFAULT true;`
   - `ALTER TABLE checklists ADD COLUMN excluded BOOLEAN DEFAULT false;`
   - dry-run 지원
   - Related file: `backend/migrate_exclusion.py`

### Phase 2: Backend API (병렬)

2. **update_team_product.py 생성**
   - `update_team_product(id, data)` - active 필드 업데이트
   - Related file: `backend/team_products/update_team_product.py`

3. **init_week.py 수정**
   - team_products 조회 시 `active=true`인 것만 필터링
   - Related file: `backend/checklists/init_week.py`

4. **api.py 수정**
   - `PUT /api/team-products/{id}` 엔드포인트 추가 (active 토글)
   - `PUT /api/checklists/{id}` excluded 필드 지원 추가
   - Related file: `backend/api.py`

### Phase 3: Frontend UI (병렬)

5. **types/index.ts 수정**
   - TeamProduct에 `active` 필드 추가
   - Checklist에 `excluded` 필드 추가
   - ChecklistUpdate에 `excluded` 필드 추가
   - Related file: `frontend/src/types/index.ts`

6. **api-client.ts 수정**
   - teamProductsApi에 `update` 메서드 추가
   - Related file: `frontend/src/lib/api-client.ts`

7. **Checklist.tsx 수정**
   - 관리자: 매트릭스 셀 우클릭 또는 아이콘으로 excluded 토글
   - excluded 항목: 회색 배경 + 취소선 + "제외됨" 표시
   - 완료율 계산에서 excluded 항목 제외
   - 통계 영역에 "제외: N개" 표시
   - Related file: `frontend/src/pages/Checklist.tsx`

## Parallel Execution Plan

### Summary
| Phase | Tasks | Parallel | Sequential |
|-------|-------|----------|------------|
| Phase 1: DB Migration | 1 | 1 | 0 |
| Phase 2: Backend API | 3 | 3 | 0 |
| Phase 3: Frontend UI | 3 | 3 | 0 |
| **Total** | **7** | **7** | **0** |

### Phase 1: DB Migration
**Purpose:** active + excluded 컬럼 추가
**Dependencies:** None

| Task | Description | Parallel |
|------|-------------|----------|
| T001 | migrate_exclusion.py 생성 + 실행 | Yes |

### Phase 2: Backend API
**Purpose:** 제외 로직 Backend 구현
**Dependencies:** Phase 1

| Task | Description | Parallel |
|------|-------------|----------|
| T002 | update_team_product.py + api.py 엔드포인트 | Yes |
| T003 | init_week.py active 필터 | Yes |
| T004 | api.py checklists excluded 지원 | Yes |

### Phase 3: Frontend UI
**Purpose:** 제외 기능 UI
**Dependencies:** Phase 2

| Task | Description | Parallel |
|------|-------------|----------|
| T005 | types + api-client 수정 | Yes |
| T006 | Checklist.tsx excluded 토글 UI | Yes |
| T007 | Checklist.tsx 완료율 계산 수정 | Yes |

## Risks & Mitigations
- **기존 데이터 호환**: active/excluded 모두 DEFAULT 값으로 기존 동작 유지
- **권한**: excluded 토글은 관리자만 가능하도록 프론트에서 제어

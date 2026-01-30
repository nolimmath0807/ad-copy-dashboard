# DB 스키마 이름 변경: ad-copy-dashboard → ad_copy_dashboard

## Overview
PostgreSQL 스키마 이름을 `ad-copy-dashboard`에서 `ad_copy_dashboard`로 변경한다. 하이픈이 포함된 식별자는 SQL에서 항상 따옴표가 필요하므로, 언더스코어로 교체하여 사용 편의성을 높인다.

## Key Files
| File | Action | Description |
|------|--------|-------------|
| `backend/migrate_schema_name.py` | Create | ALTER SCHEMA RENAME 마이그레이션 스크립트 |
| `backend/.env` | Modify | DB_SCHEMA 값 변경 |
| `backend/migrate_role.py` | Modify | 하드코딩된 스키마 이름 변경 |

## Implementation Steps

### Phase 1: DB 마이그레이션 스크립트
1. **migrate_schema_name.py 생성**
   - `ALTER SCHEMA "ad-copy-dashboard" RENAME TO ad_copy_dashboard;` 실행
   - dry-run 옵션 지원
   - 기존 `db.py`의 `get_connection()` 활용
   - Related file: `backend/migrate_schema_name.py`

### Phase 2: 코드 참조 변경 (병렬)
2. **backend/.env 수정**
   - `DB_SCHEMA=ad-copy-dashboard` → `DB_SCHEMA=ad_copy_dashboard`
   - Related file: `backend/.env`

3. **migrate_role.py 수정**
   - `schema = '"ad-copy-dashboard"'` → `schema = 'ad_copy_dashboard'`
   - 따옴표 불필요해지므로 단순화
   - Related file: `backend/migrate_role.py`

## Parallel Execution Plan

### Summary
| Phase | Tasks | Parallel | Sequential |
|-------|-------|----------|------------|
| Phase 1: DB Migration | 1 | 1 | 0 |
| Phase 2: Code References | 2 | 2 | 0 |
| **Total** | **3** | **3** | **0** |

### Phase 1: DB Migration
**Purpose:** DB 스키마 이름 변경 마이그레이션 스크립트 생성
**Dependencies:** None

| Task | Description | Parallel |
|------|-------------|----------|
| T001 | migrate_schema_name.py 생성 | Yes |

### Phase 2: Code References
**Purpose:** 코드에서 참조하는 스키마 이름 업데이트
**Dependencies:** Phase 1

| Task | Description | Parallel |
|------|-------------|----------|
| T002 | backend/.env DB_SCHEMA 값 변경 | Yes |
| T003 | migrate_role.py 스키마 이름 변경 | Yes |

## Risks & Mitigations
- **DB 연결 중단**: 마이그레이션은 dry-run으로 먼저 검증 후 실행
- **기존 세션 영향**: search_path가 구 스키마를 참조할 수 있으므로 마이그레이션 후 앱 재시작 필요

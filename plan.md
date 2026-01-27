# 광고 원고 자동화 시스템 (Ad Copy Automation Dashboard)

## Overview

건강기능식품 광고 원고를 자동 생성하고 관리하는 웹 대시보드 시스템입니다. Gemini API를 활용하여 7개+ 유형의 광고 원고를 자동 생성하고, 상품별 원고 운영 현황을 체크리스트로 관리합니다.

## 핵심 기능

| 기능 | 설명 |
|------|------|
| 상품 관리 | CRUD + 확장 가능 (현재 3개 → 30개+) |
| 원고 유형 관리 | CRUD + 확장 가능 (현재 7개 → 무제한) |
| AI 원고 생성 | Gemini API로 상품×유형 조합 자동 생성 |
| 체크리스트 | 상품×유형 매트릭스 운영 현황 관리 |
| 베스트 원고 | 광고비 기준 월간 베스트 선정 |

## 기술 스택

- **Backend**: Python 3.12 + FastAPI + uv
- **Database**: Supabase (PostgreSQL)
- **AI**: Gemini API
- **Frontend**: React 19 + Vite 7 + TypeScript + Tailwind CSS 4
- **UI**: shadcn/ui (new-york style)

## Database Schema

### products (상품 정보)
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    usp TEXT,
    appeal_points TEXT[],
    mechanism TEXT,
    features TEXT[],
    english_name VARCHAR(100),
    shape VARCHAR(255),
    herb_keywords TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### copy_types (원고 유형 - 확장 가능)
```sql
CREATE TABLE copy_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    core_concept TEXT,
    example_copy TEXT,
    prompt_template TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### generated_copies (생성된 원고)
```sql
CREATE TABLE generated_copies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    copy_type_id UUID REFERENCES copy_types(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    version INT DEFAULT 1,
    is_best BOOLEAN DEFAULT FALSE,
    ad_spend DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(product_id, copy_type_id, version)
);
```

### checklists (체크리스트)
```sql
CREATE TABLE checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    copy_type_id UUID REFERENCES copy_types(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(product_id, copy_type_id)
);
```

### best_copies (월간 베스트)
```sql
CREATE TABLE best_copies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    copy_id UUID REFERENCES generated_copies(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL,
    ad_spend DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(copy_id, month)
);
```

## API Endpoints

### Products
- `GET /api/products` - 전체 상품 목록
- `GET /api/products/{id}` - 상품 상세
- `POST /api/products` - 상품 생성
- `PUT /api/products/{id}` - 상품 수정
- `DELETE /api/products/{id}` - 상품 삭제

### Copy Types
- `GET /api/copy-types` - 전체 유형 목록
- `GET /api/copy-types/{id}` - 유형 상세
- `POST /api/copy-types` - 유형 생성
- `PUT /api/copy-types/{id}` - 유형 수정
- `DELETE /api/copy-types/{id}` - 유형 삭제

### Generated Copies
- `GET /api/copies` - 원고 목록 (필터 지원)
- `POST /api/copies/generate` - AI 원고 생성
- `PUT /api/copies/{id}` - 원고 수정
- `DELETE /api/copies/{id}` - 원고 삭제

### Checklists
- `GET /api/checklists` - 체크리스트 매트릭스
- `GET /api/checklists/stats` - 완료율 통계
- `PUT /api/checklists/{id}` - 상태 업데이트

### Best Copies
- `GET /api/best-copies` - 베스트 목록
- `POST /api/best-copies` - 베스트 등록

### AI
- `POST /api/ai/generate` - Gemini로 원고 생성
- `POST /api/ai/regenerate/{id}` - 원고 재생성

## Project Structure

```
ad-copy-dashboard/
├── api.yaml
├── backend/
│   ├── .env
│   ├── pyproject.toml
│   ├── api.py
│   ├── conn.py
│   ├── products/
│   ├── copy_types/
│   ├── copies/
│   ├── checklists/
│   ├── best_copies/
│   └── ai/
└── frontend/
    ├── .env
    └── src/
        ├── components/
        │   ├── ui/
        │   ├── layout/
        │   ├── products/
        │   ├── copy-types/
        │   ├── copies/
        │   ├── checklists/
        │   └── best/
        ├── pages/
        ├── lib/
        └── types/
```

## Pages

1. **Dashboard** - 통계 + 체크리스트 미리보기 + 최근 원고
2. **Products** - 상품 CRUD
3. **CopyTypes** - 원고 유형 CRUD (확장 가능)
4. **CopyGenerator** - AI 원고 생성
5. **Checklist** - 상품×유형 매트릭스
6. **BestCopies** - 월간 베스트 순위

## 초기 데이터

### 상품 (3개)
- 미스블랙 (MISSBLACK) - 새치유산균
- 아이틱스 (I-TIX) - 비문증
- 마그네핏 (Magnetfit) - 관절염

### 원고 유형 (7개, 확장 가능)
| 코드 | 이름 | 핵심 콘셉트 |
|------|------|-------------|
| A | 규제/대법원/단종 공포 | 마지막 고함량 기회 |
| B | 이익단체 반발/성분 제한 | 업계 로비로 폐기 |
| C | 역설적 경고/구매 제한 | 효과 너무 세서 금지 |
| D | 전문가 양심 고백 | 의사가 직접 권함 |
| E | 임상데이터/환불보장 | 전재산 걸겠다 |
| F | 타겟별 증상 공감 | 40대 여성 전용 |
| G | 리얼 후기/결과 중심 | 2주만에 변화 |

## Environment Variables

### Backend (.env)
```
SUPABASE_URL=https://uwvldlgnsevnmjprypso.supabase.co
SUPABASE_KEY=eyJhbGci...
GEMINI_API_KEY=AIzaSy...
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
```

## Implementation Phases

### Phase 1: Foundation
- api.yaml 작성
- backend/conn.py, ai/gemini_client.py
- frontend/lib/api-client.ts, types/

### Phase 2: Backend (병렬)
- products/, copy_types/, copies/, checklists/, best_copies/, ai/
- api.py 통합

### Phase 3: Frontend (병렬)
- UI 컴포넌트 (shadcn/ui)
- Layout 컴포넌트
- Feature 컴포넌트
- Pages

### Phase 4: Testing & Deploy
- 통합 테스트
- 초기 데이터 입력
- 배포

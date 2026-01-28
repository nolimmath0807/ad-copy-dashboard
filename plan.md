# 회원가입/인증 시스템 구현

## Overview
Supabase Auth를 활용한 회원가입/로그인 시스템 구축. 팀 목록은 DB에서 관리하여 동적으로 추가/수정 가능. 관리자 승인 후 서비스 이용 가능.

## Database Schema (Supabase SQL Editor)
```sql
-- 팀 테이블 (동적 관리)
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 초기 팀 데이터
INSERT INTO teams (name) VALUES
  ('퍼포AI 1팀'),
  ('퍼포AI 2팀'),
  ('퍼포AI 3팀'),
  ('퍼포AI 4팀'),
  ('구글팀');

-- 사용자 테이블
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  team_id UUID REFERENCES teams(id),
  is_approved BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Key Files
| File | Action | Description |
|------|--------|-------------|
| `backend/auth/register.py` | Create | 회원가입 처리 |
| `backend/auth/login.py` | Create | 로그인 처리 |
| `backend/auth/me.py` | Create | 현재 사용자 정보 조회 |
| `backend/auth/approve.py` | Create | 관리자 승인 처리 |
| `backend/auth/list_users.py` | Create | 사용자 목록 조회 (관리자) |
| `backend/teams/list_teams.py` | Create | 팀 목록 조회 |
| `backend/teams/create_team.py` | Create | 팀 추가 (관리자) |
| `backend/teams/delete_team.py` | Create | 팀 삭제 (관리자) |
| `backend/api.py` | Modify | Auth + Teams 엔드포인트 추가 |
| `frontend/src/pages/Login.tsx` | Create | 로그인 페이지 |
| `frontend/src/pages/Register.tsx` | Create | 회원가입 페이지 |
| `frontend/src/pages/Pending.tsx` | Create | 승인 대기 페이지 |
| `frontend/src/pages/AdminUsers.tsx` | Create | 사용자 승인 관리 |
| `frontend/src/pages/AdminTeams.tsx` | Create | 팀 관리 페이지 |
| `frontend/src/contexts/AuthContext.tsx` | Create | 인증 상태 관리 |
| `frontend/src/components/ProtectedRoute.tsx` | Create | 인증 보호 라우트 |
| `frontend/src/App.tsx` | Modify | 라우팅 + 인증 보호 |
| `frontend/src/types/index.ts` | Modify | User, Team 타입 추가 |
| `frontend/src/lib/api-client.ts` | Modify | Auth, Teams API 추가 |

## Implementation Steps

### Phase 1: Backend - Auth & Teams API
1. **teams 모듈 생성** - list_teams.py, create_team.py, delete_team.py
2. **auth 모듈 생성** - register.py, login.py, me.py, approve.py, list_users.py
3. **api.py 수정** - Auth, Teams 엔드포인트 추가

### Phase 2: Frontend - Auth UI
4. **types/index.ts 수정** - User, Team 인터페이스 추가
5. **api-client.ts 수정** - authApi, teamsApi 추가
6. **AuthContext.tsx 생성** - 인증 상태 관리
7. **ProtectedRoute.tsx 생성** - 인증 보호 컴포넌트
8. **Login.tsx 생성** - 로그인 페이지
9. **Register.tsx 생성** - 회원가입 페이지 (팀 선택)
10. **Pending.tsx 생성** - 승인 대기 페이지

### Phase 3: Frontend - Admin UI
11. **AdminUsers.tsx 생성** - 사용자 승인 관리
12. **AdminTeams.tsx 생성** - 팀 관리 페이지
13. **App.tsx 수정** - 라우팅 구조 변경
14. **Sidebar.tsx 수정** - 관리자 메뉴 추가

## 인증 플로우
1. 사용자 회원가입 (이메일, 비밀번호, 이름, 팀 선택)
2. Supabase Auth 계정 생성 + users 테이블 저장
3. is_approved = false 상태로 대기
4. 관리자가 AdminUsers 페이지에서 승인
5. 승인된 사용자만 서비스 이용 가능

## 페이지 접근 권한
| 페이지 | 비로그인 | 미승인 | 승인됨 | 관리자 |
|--------|---------|--------|--------|--------|
| /login | ✅ | ❌ | ❌ | ❌ |
| /register | ✅ | ❌ | ❌ | ❌ |
| /pending | ❌ | ✅ | ❌ | ❌ |
| 일반 페이지 | ❌ | ❌ | ✅ | ✅ |
| /admin/* | ❌ | ❌ | ❌ | ✅ |

## Dependencies
- @supabase/supabase-js (Frontend - Supabase Auth 클라이언트)

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | 회원가입 |
| POST | /api/auth/login | 로그인 |
| GET | /api/auth/me | 현재 사용자 정보 |
| GET | /api/auth/users | 사용자 목록 (관리자) |
| PUT | /api/auth/approve/{id} | 사용자 승인 (관리자) |
| GET | /api/teams | 팀 목록 |
| POST | /api/teams | 팀 추가 (관리자) |
| DELETE | /api/teams/{id} | 팀 삭제 (관리자) |

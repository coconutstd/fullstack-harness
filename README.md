# fullstack-harness

**Next.js + Nest.js + PostgreSQL 풀스택 앱을 에이전트 팀으로 빌드하는 Claude Code 하네스.**

이 저장소의 핵심은 `apps/` 의 예제 코드가 아니라 `.claude/` 의 **하네스**다.
기능(feature)을 폴더로 격리하고 JSON으로 관리하며, Phase마다 필요한 팀만 구성/교체하고,
오케스트레이터(`feature-pm`)가 능동↔감독 역할을 오가며 Next.js↔Nest.js 경계면 버그 없이 앱을 완성한다.

`apps/web`(Next.js), `apps/api`(Nest.js)는 이 하네스가 `auth`(회원가입/로그인) 기능을 실제로 돌려 만든 **산출물 예시**다.

---

## 왜 하네스인가

풀스택 개발은 프론트/백엔드/DB가 **경계면(계약)** 에서 어긋나며 버그가 난다.
이 하네스는 그 문제를 다음으로 푼다.

- **기능 폴더 격리** — 각 기능의 요구사항·설계·진행상황을 `_workspace/features/<feature>/` 아래 JSON으로 관리해 컨텍스트 위생을 확보한다.
- **계약 우선(contract-first)** — Phase 2에서 API 계약 JSON을 정답지로 확정하고, 구현은 이를 따른다.
- **실시간 경계 검증** — `boundary-verifier`가 계약↔백엔드 응답↔프론트 훅 타입을 모듈 완성 직후 교차검증한다.
- **Phase별 팀 교체** — 설계팀(팀A)과 구현·검증팀(팀B)을 나눠, 각 단계에 필요한 에이전트만 활성화한다.

---

## 5-Phase 실행 모델

`feature-pm`(오케스트레이터, 리더/메인 루프)이 전 과정을 구동하며, Phase에 따라 역할을 바꾼다.

| Phase | 이름 | 활성 에이전트 | feature-pm 역할 |
|-------|------|--------------|----------------|
| ① | 요구사항 분해 | `feature-pm` 단독 | **능동** — 요청을 기능 단위로 분해, `requirements.json` 작성 |
| ② | 팬아웃 설계 | `api-designer` · `ui-designer` · `db-migrator` (팀A) | **능동** — 병렬 설계 지시·수합 |
| ③ | 구현 + QA | `backend-impl` · `frontend-impl` + `boundary-verifier` (팀B) | **감독** — 구현 위임, 경계 검증 상주 |
| ④ | 생성–검증 루프 | 팀B 유지 | **감독** — 경계 리포트 기반 수정 반복 |
| ⑤ | 통합 + 테스트 | `test-suite` (서브에이전트) | **능동** — 단위·통합·E2E로 스펙 검증 |

- Phase 1·2·5 → feature-pm이 **능동적 실행자**
- Phase 3·4 → feature-pm이 **감독자** (구현은 팀B에 위임)

---

## 8인 로스터

전원 `model: opus`. `feature-pm`은 팀 멤버로 스폰되지 않는 리더(메인 루프)다.

| 에이전트 | 역할 | 활성 Phase |
|----------|------|-----------|
| `feature-pm` | 오케스트레이터(PM). 요구사항 분해·팀 교체·역할 전환 총괄 | 전 과정 |
| `api-designer` | Next.js↔Nest.js REST API 계약을 JSON으로 정의 | ② |
| `ui-designer` | App Router 화면 구조·라우팅·상태/빈/에러 뷰 설계 | ② |
| `db-migrator` | PostgreSQL/Prisma 스키마·마이그레이션·상태전이맵 설계(설계까지만) | ② |
| `backend-impl` | Nest.js 모듈/컨트롤러/서비스/DTO 구현 + Prisma 마이그레이션 실행 | ③④ |
| `frontend-impl` | App Router 페이지/컴포넌트/API 클라이언트/훅 타입 안전 구현 | ③④ |
| `boundary-verifier` | 경계면(계약↔응답↔훅 타입) 실시간 교차검증 | ③④ |
| `test-suite` | 단위·통합·E2E 테스트 작성·실행, acceptanceCriteria 검증 | ⑤ |

---

## 9개 스킬

각 에이전트가 자신의 Phase에서 사용하는 실행 지침.

| 스킬 | 사용 주체 / Phase |
|------|------------------|
| `fullstack-orchestrator` | feature-pm — 전체 5-Phase 오케스트레이션 진입점 |
| `requirements-decomposition` | feature-pm — Phase 1 요구사항 분해 |
| `api-design` | api-designer — Phase 2 |
| `ui-design` | ui-designer — Phase 2 |
| `db-migration` | db-migrator — Phase 2 |
| `nestjs-backend` | backend-impl — Phase 3~4 |
| `nextjs-frontend` | frontend-impl — Phase 3~4 |
| `boundary-verification` | boundary-verifier — Phase 3~4 |
| `test-suite` | test-suite — Phase 5 |

---

## 저장소 구조

```
.
├── CLAUDE.md                  # 하네스 헌장(목표·트리거·Phase 구성·변경 이력)
├── .claude/
│   ├── agents/                # 8인 에이전트 정의 (*.md)
│   ├── skills/                # 9개 스킬 (<skill>/SKILL.md)
│   └── settings.json          # 에이전트 팀 런타임 설정
├── _workspace/                # (gitignore) 하네스 런타임 산출물 — 기능별 JSON
│   └── features/auth/         #   00_requirements · 01_api_contract · 01_ui_spec
│                              #   01_db_schema · 03_boundary_report · 04_test_report ...
└── apps/                      # 하네스 산출물 예시 (auth 기능)
    ├── web/                   #   Next.js App Router (signup/login/dashboard)
    └── api/                   #   Nest.js (auth 모듈 · Prisma · JWT)
```

> `_workspace/`는 기능별 작업 산출물이라 `.gitignore` 처리된다. 하네스가 각 Phase에서 생성하는
> requirements/contract/spec/report JSON이 여기 쌓이며, 이것이 에이전트 간 **단일 진실 공급원**이다.

---

## 사용법

### 하네스 트리거

Claude Code에서 이 저장소를 열고 앱 개발을 요청하면 `fullstack-orchestrator` 스킬이 5-Phase를 구동한다.

```
새 앱: "할 일 관리 앱 만들어줘" / "게시판 기능 추가해줘"
수정: "로그인 버그 고쳐줘" / "프론트만 다시 구현해줘"
```

단순 개념 질문은 하네스 없이 직접 응답한다.

### 산출물 예시 앱 실행

```bash
# 1) DB 기동 (Postgres 16)
cd apps/api && cp .env.example .env
npm install && npm run db:up && npm run prisma:migrate

# 2) 백엔드 (:3001)
npm run start:dev

# 3) 프론트엔드 (:3000)
cd ../web && npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
npm run dev
```

- Web → http://localhost:3000 · API → http://localhost:3001
- 테스트: `apps/api` → `npm test` / `npm run test:e2e`, `apps/web` → `npm test`

---

## 하네스 재구성

에이전트/스킬을 추가·교체하거나 다른 도메인으로 확장하려면 `harness` 메타 스킬을 사용한다.
변경 시 `CLAUDE.md`의 **변경 이력** 표에 날짜·내용·대상·사유를 기록한다.

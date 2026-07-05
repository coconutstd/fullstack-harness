# fullstack-harness

**Next.js + Nest.js + PostgreSQL 풀스택 앱을 에이전트 팀으로 빌드하고 리뷰하는 Claude Code 하네스.**

이 저장소의 핵심은 `apps/` 의 예제 코드가 아니라 `.claude/` 의 **하네스**다.
같은 스택 위에서 **두 개의 하네스**가 동작한다.

- **빌드 하네스** (`fullstack-orchestrator`) — 기능(feature)을 폴더로 격리하고 JSON으로 관리하며, Phase마다 필요한 팀만 구성/교체하고, 오케스트레이터(`feature-pm`)가 능동↔감독 역할을 오가며 Next.js↔Nest.js 경계면 버그 없이 앱을 완성한다.
- **리뷰 하네스** (`review-orchestrator`) — 변경(diff)·PR·모듈을 여러 전문 리뷰어로 **블라인드 병렬** 검토하고, 각 지적을 적대적으로 검증해 오탐을 걷어낸 뒤 심각도순 리포트를 낸다.

`apps/web`(Next.js), `apps/api`(Nest.js)는 빌드 하네스가 `auth`(회원가입/로그인) 기능을 실제로 돌려 만든 **산출물 예시**이자, 리뷰 하네스가 검토한 대상이다.

---

## 왜 빌드 하네스인가

풀스택 개발은 프론트/백엔드/DB가 **경계면(계약)** 에서 어긋나며 버그가 난다.
빌드 하네스는 그 문제를 다음으로 푼다.

- **기능 폴더 격리** — 각 기능의 요구사항·설계·진행상황을 `_workspace/features/<feature>/` 아래 JSON으로 관리해 컨텍스트 위생을 확보한다.
- **계약 우선(contract-first)** — Phase 2에서 API 계약 JSON을 정답지로 확정하고, 구현은 이를 따른다.
- **실시간 경계 검증** — `boundary-verifier`가 계약↔백엔드 응답↔프론트 훅 타입을 모듈 완성 직후 교차검증한다.
- **Phase별 팀 교체** — 설계팀(팀A)과 구현·검증팀(팀B)을 나눠, 각 단계에 필요한 에이전트만 활성화한다.

---

## 빌드 하네스 — 5-Phase 실행 모델

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

## 빌드 하네스 — 8인 로스터

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

## 빌드 하네스 — 9개 스킬

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

## 리뷰 하네스 — 5-Phase 파이프라인

`review-lead`(리더/메인 루프)가 구동한다. Phase 2의 리뷰어는 서로의 지적을 보지 못하는
**블라인드 병렬**로 실행되어 관점 수렴을 막고 커버리지를 넓힌다(팀 채팅 없음).

| Phase | 이름 | 활성 에이전트 | review-lead 역할 |
|-------|------|--------------|-----------------|
| ① | 스코프 확정 | `review-lead` 단독 | **능동** — 대상(diff/PR/파일) 확정 |
| ② | 팬아웃 리뷰 | `correctness` · `security` · `boundary` · `design`-reviewer (블라인드 병렬) | **감독** — 4개 관점 병렬 스폰 |
| ③ | 취합·중복제거 | `review-lead` 단독 | **능동** — 지적 수합·dedup |
| ④ | 적대적 검증 | `finding-verifier` | **감독** — 오탐 반증(CONFIRMED/PLAUSIBLE/REFUTED) |
| ⑤ | 종합 리포트 | `review-lead` 단독 | **능동** — 심각도순 `report.md` |

---

## 리뷰 하네스 — 6인 로스터

전원 `model: opus`. `review-lead`는 팀 멤버로 스폰되지 않는 리더(메인 루프)다.

| 에이전트 | 역할 | 활성 Phase |
|----------|------|-----------|
| `review-lead` | 오케스트레이터(리더). 스코프 확정·팬아웃·검증·리포트 종합 | 전 과정 |
| `correctness-reviewer` | 로직 버그·엣지케이스·null/undefined·에러 삼킴·경계·동시성 | ② |
| `security-reviewer` | 인증/인가 누락·인젝션·시크릿 노출·IDOR·XSS | ② |
| `boundary-reviewer` | Next.js↔Nest.js 경계면(응답 shape·래핑·casing·엔드포인트 매핑) | ② |
| `design-reviewer` | 단순화 여지·중복(DRY)·비효율(N+1)·죽은 코드·네이밍 | ② |
| `finding-verifier` | 각 지적을 적대적으로 반증해 오탐 제거 | ④ |

---

## 리뷰 하네스 — 6개 스킬

| 스킬 | 사용 주체 / Phase |
|------|------------------|
| `review-orchestrator` | review-lead — 전체 리뷰 파이프라인 진입점 |
| `correctness-review` | correctness-reviewer — Phase 2 |
| `security-review` | security-reviewer — Phase 2 |
| `boundary-review` | boundary-reviewer — Phase 2 |
| `design-review` | design-reviewer — Phase 2 |
| `finding-verification` | finding-verifier — Phase 4 |

---

## 저장소 구조

```
.
├── CLAUDE.md                  # 두 하네스 헌장(목표·트리거·Phase 구성·변경 이력)
├── .claude/
│   ├── agents/                # 14인 에이전트 정의 (빌드 8 + 리뷰 6, *.md)
│   ├── skills/                # 15개 스킬 (빌드 9 + 리뷰 6, <skill>/SKILL.md)
│   └── settings.json          # 에이전트 팀 런타임 설정
├── _workspace/                # 하네스 런타임 산출물 (대부분 .gitignore)
│   ├── features/auth/         #   빌드 산출물(예시로 커밋) — 00_requirements · 01_api_contract
│   │                          #   · 01_ui_spec · 01_db_schema · 03_boundary_report · 04_test_report
│   └── review/                #   리뷰 산출물(gitignore) — 00_scope · 10_findings_* · 20_merged
│                              #   · 30_verified · report.md
└── apps/                      # 하네스 산출물 예시 (auth 기능)
    ├── web/                   #   Next.js App Router (signup/login/dashboard)
    └── api/                   #   Nest.js (auth 모듈 · Prisma · JWT)
```

> `_workspace/`는 하네스가 각 Phase에서 생성하는 requirements/contract/spec/findings/report JSON이
> 쌓이는 곳으로, 에이전트 간 **단일 진실 공급원**이다. 기본적으로 `.gitignore` 처리되며,
> `features/auth/`만 빌드 하네스 **산출물 예시**로 커밋해 둔다(리뷰 산출물 `review/`는 미커밋).

---

## 사용법

### 하네스 트리거

Claude Code에서 이 저장소를 열고 요청 도메인에 따라 두 하네스 중 하나가 구동된다.

```
# 빌드 하네스 (fullstack-orchestrator)
새 앱: "할 일 관리 앱 만들어줘" / "게시판 기능 추가해줘"
수정: "로그인 버그 고쳐줘" / "프론트만 다시 구현해줘"

# 리뷰 하네스 (review-orchestrator)
리뷰: "이 diff 리뷰해줘" / "auth 모듈 봐줘" / "PR #12 검토해줘" / "보안 점검해줘"
후속: "지적 반영했으니 다시 리뷰" / "이 파일만 다시"
```

만들기 = `fullstack-orchestrator`, 검토 = `review-orchestrator`로 별개 도메인이다.
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

---
name: fullstack-orchestrator
description: "Next.js + Nest.js + PostgreSQL 풀스택 앱을 feature-pm이 5단계로 구축하는 오케스트레이터. 앱 만들기·풀스택 개발·웹 서비스 구현·기능 추가·API+화면 함께 만들기 요청 시 반드시 사용. 후속 작업: 앱 수정, 기능 추가, 부분 재구현, 버그 수정, 업데이트, 보완, 다시 빌드, 이전 결과 개선, 프론트/백엔드만 다시 요청 시에도 반드시 이 스킬을 사용."
---

# Fullstack Orchestrator — feature-pm의 5-Phase 하이브리드

feature-pm(오케스트레이터, 리더)이 사용하는 전체 워크플로우. **핵심 목표: 기능을 폴더로 격리하고 JSON으로 관리하며, Phase마다 필요한 팀만 구성/교체하고, PM이 능동↔감독 역할을 오가며 Next.js↔Nest.js 경계면 버그 없이 앱을 완성한다.**

## 실행 모드: 하이브리드 (Phase별 상이)

| Phase | 이름 | 패턴 | PM 모드 | 활성 (팀/서브) |
|-------|------|------|---------|--------------|
| 1 | 요구사항 분해 | 계층적 위임(분해) | **능동적** | feature-pm 단독 (팀 없음) |
| 2 | 팬아웃 설계 | 팬아웃 | **능동적** | 팀A: api-designer · ui-designer · db-migrator |
| 3 | 구현 + QA | 팬아웃+실시간검증 | **감독자** | 팀B: backend-impl · frontend-impl · boundary-verifier |
| 4 | 생성-검증 루프 | 생성-검증 | **감독자** | 팀B 유지 (같은 팀) |
| 5 | 통합 + 테스트 | 파이프라인/통합 | **능동적** | test-suite (서브에이전트, 팀 아님) |

> **PM 역할 리듬(핵심):** 1·2·5는 PM이 직접 이끄는 **능동적** 모드, 3·4는 한 걸음 물러난 **감독자** 모드. 감독자 모드에서는 TaskGet으로 모니터링만 하고 막힘/충돌 시에만 개입한다.
> **팀 교체:** Phase 경계에서 TeamDelete 후 다음 팀 TeamCreate. 팀B는 Phase 3→4에 유지(생성-검증 루프에 구현자가 살아있어야 함). 팀원 전원 `model:"opus"`.

## 워크스페이스 (기능 격리)
```
_workspace/features/{기능}/00_requirements.json  01_api_contract.json  01_ui_spec.json
  01_db_schema.prisma  01_db_migration_plan.md  02_backend_progress.json
  02_frontend_progress.json  03_boundary_report.json  04_test_report.json
```
기능마다 독립 폴더. 새 기능은 새 폴더로 완전 격리(컨텍스트 위생). 한 번에 한 기능을 Phase 2~5로 처리하고, 다기능이면 의존성 순서로 순회.

## 워크플로우

### Phase 0: 컨텍스트 확인 (후속 작업)
1. `_workspace/features/` 존재 여부 + 대상 기능 폴더 존재 여부 확인.
2. 모드 결정:
   - **미존재** → 초기 구축. Phase 1로.
   - **기능 폴더 존재 + 부분 수정 요청** → 부분 재실행. 해당 기능 폴더의 산출물을 읽고, 영향 Phase의 팀만 재구성. (예: "로그인 화면만 수정" → 팀B의 frontend-impl + boundary-verifier)
   - **새 기능 요청** → `features/{새기능}/` 새 폴더 생성 후 Phase 1(기존 기능 폴더는 건드리지 않음).
3. 부분 재실행 시 계약 변경 여부를 먼저 판단. 계약이 바뀌면 하류 전원(backend/frontend/boundary)에 전파.

### Phase 1: 요구사항 분해 — PM 능동적, 팀 없음
`requirements-decomposition` 스킬을 따른다.
1. 사용자 요청을 독립 기능 단위로 분해.
2. 각 기능을 `features/{기능}/00_requirements.json`으로 작성(JSON 스키마 준수).
3. 기능 간 의존성 기록, 처리 순서 결정.

### Phase 2: 팬아웃 설계 — PM 능동적, 팀A
1. `TeamCreate(team_name:"design-team", members:[api-designer, ui-designer, db-migrator])` (전원 opus).
2. `TaskCreate`: `api-계약`(api-designer) · `ui-명세`(ui-designer) · `db-스키마`(db-migrator). 셋 다 `00_requirements.json` 입력.
3. **PM 능동적**: 세 designer가 병렬 설계하되, 엔티티 필드명·화면-엔드포인트 매핑 충돌을 PM이 중재·확정. 세 산출물의 필드명이 일치하는지 확인.
4. 산출: `01_api_contract.json`, `01_ui_spec.json`, `01_db_schema.prisma` + `01_db_migration_plan.md`.
5. `TeamDelete`(design-team). 산출물은 폴더에 보존.

### Phase 3: 구현 + QA — PM 감독자, 팀B
1. `TeamCreate(team_name:"build-team", members:[backend-impl, frontend-impl, boundary-verifier])`.
2. `TaskCreate`: `백엔드-구현`(backend-impl) · `프론트-구현`(frontend-impl) · `경계면-검증`(boundary-verifier, 모듈 단위 상시).
3. **PM 감독자**: 물러나서 TaskGet 모니터링. 개입은 막힘/충돌/판정 필요 시만.
4. 자체 조율:
   - backend-impl: 스키마 반영 + `prisma migrate` 실행 → 모듈 구현 → 완료 시 frontend/boundary에 SendMessage.
   - frontend-impl: 계약 타입으로 구현 → 완료 알림 받으면 실연동.
   - boundary-verifier: 모듈 완료 알림마다 즉시 경계면 교차검증 → 불일치는 양쪽에 통보.

### Phase 4: 생성-검증 루프 — PM 감독자, 팀B 유지
1. 팀B를 그대로 유지(구현자가 있어야 수정 가능).
2. boundary-verifier 발견 이슈 → 담당(backend/frontend) 수정 → 재검증. **최대 3회** 반복.
3. **PM 감독자**: 루프 횟수 상한(3회) 관리. 계약 결함 판정 시 api-designer를 잠시 소환하거나 계약 갱신 후 양쪽 재배포.
4. 경계면이 모두 pass 되면 `TeamDelete`(build-team).

### Phase 5: 통합 + 테스트 — PM 능동적, test-suite 서브에이전트
1. **팀이 아니라 서브에이전트**: PM이 `Agent(subagent_type:"test-suite", model:"opus")`로 호출(단일 에이전트라 팀 불필요).
2. test-suite가 `test-suite` 스킬로 자동화 테스트 작성·실행 → `04_test_report.json`.
3. **PM 능동적**: 결과 종합. 심각 결함으로 재구현 필요 시 팀B를 재구성(Phase 3~4 재진입).
4. 통과 시 기능 완료.

### 정리 및 보고
1. 모든 팀 정리 확인(잔여 팀 TeamDelete).
2. `_workspace/` 보존(감사 추적).
3. 사용자 보고: 구현 기능, 실행 방법(`prisma migrate`/`npm run`), 경계면·테스트 결과, 알려진 제약.
4. **피드백 요청** — "팀 구성·Phase 흐름·PM 역할 배분에 바꾸고 싶은 점이 있나요?" (진화 트리거)

## 데이터 흐름
```
[PM 능동] Phase1: 00_requirements.json (기능 폴더 격리)
   ↓
[PM 능동] Phase2 팀A(팬아웃): 01_api_contract.json / 01_ui_spec.json / 01_db_schema.prisma
   ↓ (TeamDelete → TeamCreate)
[PM 감독] Phase3-4 팀B: backend∥frontend 구현 ← boundary-verifier 실시간검증 → 03_boundary_report.json
   ↓ (TeamDelete)
[PM 능동] Phase5 서브: test-suite → 04_test_report.json → 동작하는 앱
```

## 에러 핸들링
| 상황 | 전략 |
|------|------|
| 팀원 실패/중지 | PM 감지 → 재시작/재할당. 과반 실패 시 사용자 보고 |
| 계약 변경 한쪽만 전파 | PM/boundary-verifier가 감지 → 나머지 쪽 즉시 전파 |
| 생성-검증 루프 3회 초과 | 중단, 잔여 이슈 "알려진 제약"으로 명시 |
| 마이그레이션 위험 작업 | backend-impl이 PM에 선보고 후 실행 |
| 기능 맥락 오염 | PM이 폴더 격리 재확인, 잘못 섞인 산출물 복원 |
| PM 과잉 개입(감독자 Phase) | 감독자 모드에서는 SendMessage 최소화 — 팀 자체 조율 존중 |

## 테스트 시나리오
### 정상 흐름
1. "할 일 관리 앱" 요청 → Phase 1: `features/task/00_requirements.json` 작성.
2. Phase 2 팀A: `/tasks` CRUD 계약(GET은 `wrapped:true`), UI 명세, Prisma 스키마 확정 → 팀 해체.
3. Phase 3 팀B: backend가 마이그레이션 실행+모듈 구현, frontend가 화면 구현, boundary가 `GET /tasks` 래핑 일치 확인. PM은 감독만.
4. Phase 4: 경계면 이슈 0 → 팀 해체.
5. Phase 5: PM이 test-suite 서브에이전트 호출, acceptanceCriteria 통과.
6. 보고 + 피드백 요청.

### 에러 흐름
1. Phase 3에서 backend가 `GET /tasks`를 순수 배열로 반환(계약 `wrapped:true` 위반).
2. boundary-verifier가 점진 검증에서 포착 → backend+frontend 양쪽에 "계약 위반: 래핑 누락" 통보.
3. Phase 4 루프에서 backend가 `{items,total}`로 수정 → 재검증 통과(1/3회).
4. `03_boundary_report.json`에 이슈+해결 기록.

## 후속 작업 처리
- description에 후속 키워드 포함(기능 추가/수정/버그/재빌드/프론트만·백엔드만).
- Phase 0에서 초기/부분/새 기능 판별. 새 기능은 새 폴더로 격리.
- 부분 재실행은 영향 Phase의 팀만 재구성. 계약 변경 시 하류 전원 전파.

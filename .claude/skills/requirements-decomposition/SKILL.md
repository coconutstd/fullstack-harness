---
name: requirements-decomposition
description: "사용자 요청을 기능(feature) 단위로 분해하고 각 기능을 JSON 요구사항으로 관리하는 스킬. 기능별 폴더 격리로 컨텍스트 위생을 확보한다. 요구사항 분석·기능 분해·스코프 정의 시, feature-pm이 Phase 1에서 반드시 사용."
---

# Requirements Decomposition — 기능 분해 & 컨텍스트 위생

feature-pm이 Phase 1(능동적 모드)에서 사용한다. 사용자 요청을 **기능 단위로 분해**하고, 각 기능을 **JSON**으로 관리하며, **폴더로 격리**한다. 기능이 섞이지 않는 것이 전체 파이프라인 품질의 출발점이다.

## 왜 JSON인가 · 왜 폴더 격리인가
- **JSON**: 요구사항이 기계 판독 가능해야 하류 에이전트(api/ui/db-designer)가 필드를 정확히 참조하고, test-suite가 `acceptanceCriteria`를 실행 검증할 수 있다. 산문(markdown)은 해석 편차를 낳는다.
- **폴더 격리**: 한 기능의 맥락이 다른 기능에 새면(컨텍스트 오염) 계약 충돌·중복·혼선이 생긴다. 기능마다 독립 폴더를 두면 각 기능을 깨끗한 맥락에서 Phase 2~5로 처리할 수 있다.

## 워크스페이스 구조 (기능 격리)
```
_workspace/
└── features/
    ├── login/
    │   ├── 00_requirements.json      ← 이 스킬의 산출물
    │   ├── 01_api_contract.json      (api-designer)
    │   ├── 01_ui_spec.json           (ui-designer)
    │   ├── 01_db_schema.prisma       (db-migrator)
    │   ├── 01_db_migration_plan.md   (db-migrator)
    │   ├── 02_backend_progress.json  (backend-impl)
    │   ├── 02_frontend_progress.json (frontend-impl)
    │   ├── 03_boundary_report.json   (boundary-verifier)
    │   └── 04_test_report.json       (test-suite)
    └── password-reset/               ← 새 기능은 새 폴더로 완전 격리
        └── 00_requirements.json
```

**규칙:** 새 기능은 반드시 새 폴더(`features/{kebab-case-name}/`). 기존 기능 폴더에 다른 기능의 산출물을 섞지 않는다. 한 번에 한 기능 폴더를 처리한다.

## 분해 절차
1. 사용자 요청에서 **독립적으로 배포 가능한 기능 단위**를 식별한다(예: 로그인, 비밀번호 재설정, 대시보드).
2. 기능 간 **의존성**을 파악한다(비밀번호 재설정은 로그인/유저 엔티티에 의존). `dependencies`에 기록.
3. 각 기능마다 `features/{기능}/00_requirements.json`을 작성한다.
4. 다기능이면 의존성 순서로 처리 순서를 정하고, 각 기능을 순차로 Phase 2~5에 태운다(계층적 위임).

## 요구사항 JSON 스키마
```json
{
  "feature": "login",
  "description": "이메일/비밀번호 로그인과 세션 발급",
  "userStories": [
    { "as": "사용자", "iWant": "이메일과 비밀번호로 로그인", "soThat": "내 데이터에 접근" }
  ],
  "screens": [
    { "path": "/login", "purpose": "로그인 폼", "auth": false }
  ],
  "entities": [
    { "name": "User", "fields": [
      { "name": "id", "type": "uuid", "pk": true },
      { "name": "email", "type": "string", "unique": true },
      { "name": "passwordHash", "type": "string" },
      { "name": "createdAt", "type": "datetime" }
    ]}
  ],
  "endpoints": [
    { "method": "POST", "path": "/auth/login", "purpose": "로그인", "auth": false }
  ],
  "stateMachine": null,
  "acceptanceCriteria": [
    "올바른 자격증명으로 200과 JWT를 받는다",
    "틀린 비밀번호는 401을 받는다"
  ],
  "assumptions": ["JWT 만료 24h로 가정"],
  "dependencies": []
}
```

**필드 규칙:**
- `entities`의 필드명은 하류에서 그대로 쓰이므로 신중히 확정한다(camelCase 권장, DB 매핑은 db-migrator가 처리).
- `stateMachine`이 필요한 도메인은 `{ "states": [...], "transitions": [{ "from": "...", "to": "...", "trigger": "..." }] }`로 채운다. 아니면 `null`.
- `acceptanceCriteria`는 test-suite가 실행 검증할 수 있도록 **관찰 가능한 결과**로 쓴다.

## 산출 체크리스트
- [ ] 각 기능이 독립 폴더 `features/{기능}/`에 격리됨
- [ ] `00_requirements.json`이 스키마를 준수하고 파싱 가능
- [ ] 기능 간 의존성이 `dependencies`에 기록됨
- [ ] entities 필드명이 최종 확정됨(하류 정합의 기준)

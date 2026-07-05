---
name: test-suite
description: "통합/E2E 테스트 작성·실행 스킬. 완성된 기능에 자동화 테스트를 붙이고 라우팅·상태전이·기능 스펙(acceptanceCriteria)을 실행으로 검증. 테스트 작성·통합 검증·E2E·최종 품질 확인 시, test-suite가 Phase 5에서 사용."
---

# Test Suite — 실행으로 검증

test-suite가 Phase 5(통합+테스트)에서 서브에이전트로 호출되어 사용한다. boundary-verifier가 정적 교차검증으로 확인한 경계면 위에서, **실제 실행되는 테스트**로 기능 완결성을 검증한다.

## 역할 경계 (중복 회피)
- **경계면 shape**은 boundary-verifier가 이미 봤다(`03_boundary_report.json` 참고). 당신은 **실행 동작**에 집중.
- 당신의 영역: 기능 스펙 충족, 라우팅 실제 이동, 상태 전이 시나리오, 프론트→백엔드→DB 통합 흐름.

## 실행 검증 대상 (홀리스틱)

| 대상 | 방법 | 정답지 |
|------|------|--------|
| 기능 스펙 | `acceptanceCriteria`별 테스트 작성·통과 | `00_requirements.json` |
| 라우팅 | 네비게이션 E2E(링크 클릭 → 도달 확인) | `01_ui_spec.json` routes |
| 상태 전이 | 전이 시나리오 통과 / 죽은·무단 전이 탐지 | `01_db_migration_plan.md` 상태맵 |
| 통합 흐름 | 프론트→API→DB E2E | 계약 + 요구사항 |

## 테스트 계층
1. **백엔드**: Nest.js 단위(서비스) + e2e(`@nestjs/testing`, supertest) — 엔드포인트가 계약대로 응답하는지 실호출.
2. **프론트**: 컴포넌트 테스트(폼 검증·상태) + 훅 동작.
3. **풀스택 E2E**(가능 시): 실제 서버+DB 구동 후 시나리오(로그인→대시보드 등).

## 절차
1. `00_requirements.json`의 `acceptanceCriteria`를 테스트 케이스로 1:1 변환.
2. 상태 있는 도메인은 상태 전이 맵의 각 전이에 시나리오 테스트 + 무단 전이 거부 테스트.
3. `01_ui_spec.json`의 `navigatesTo`를 네비게이션 E2E로 검증(404 없는지).
4. 마이그레이션 적용된 DB에 통합 흐름 구동.
5. **실행하고 결과를 있는 그대로 기록**. 실패를 통과로 포장하지 않는다.

## 원칙
- **실행이 진실이다.** "테스트가 있다"가 아니라 "통과한다"를 확인한다.
- **시나리오 기반.** 하드코딩된 우연이 아니라 관찰 가능한 결과(acceptanceCriteria)로 작성.
- **재현 가능.** 실패 시 재현 절차를 리포트에 남긴다.

## 리포트 → `04_test_report.json`
```json
{
  "feature": "login",
  "suites": [
    { "name": "auth e2e", "type": "backend-e2e", "passed": 5, "failed": 1,
      "failures": [{ "case": "틀린 비번 401", "expected": 401, "actual": 500,
        "repro": "POST /auth/login {wrong}", "severity": "functional" }] }
  ],
  "acceptanceCoverage": "6/7 충족",
  "unverified": ["E2E 환경 미구성 항목"]
}
```

## 팀 통신 (Phase 5)
- 서브에이전트로 결과를 PM(능동적 모드)에 반환.
- 심각한 결함으로 재구현 필요 시 PM에 보고 → PM이 구현팀(Phase 3~4 팀) 재소환 판단.
- 실행 불가 항목은 "unverified"로 명시(통과 처리 금지).

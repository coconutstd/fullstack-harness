# CLAUDE.md

## 하네스: 풀스택 애플리케이션 개발 (Next.js + Nest.js + PostgreSQL)

**목표:** 기능을 폴더로 격리하고 JSON으로 관리하며, Phase마다 필요한 팀만 구성/교체하고, feature-pm이 능동↔감독 역할을 오가며 Next.js↔Nest.js 경계면 버그 없이 앱을 완성한다.

**트리거:** 앱 만들기·풀스택 개발·웹 서비스 구현·기능 추가·API+화면 함께 만들기, 그리고 기존 앱 수정·부분 재구현·버그 수정·업데이트 요청 시 `fullstack-orchestrator` 스킬을 사용하라. 단순 질문(개념 설명 등)은 직접 응답 가능.

**실행 모드:** 하이브리드 5-Phase. feature-pm(오케스트레이터, 리더)이 전 과정 구동. Phase 1·2·5 능동적 / 3·4 감독자. Phase별 팀 교체(팀A 설계 → 팀B 구현·검증 → Phase5 test-suite 서브). 8인 로스터, 팀원 전원 `model:"opus"`.

**Phase × 활성:** ①요구사항분해(pm단독) ②팬아웃설계(api/ui/db-designer) ③구현+QA(backend/frontend-impl+boundary-verifier) ④생성-검증루프(팀B유지) ⑤통합+테스트(test-suite 서브).

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-07-05 | 초기 구성 (4인 팀 + 5개 스킬) | 전체 | Next.js+Nest.js+PostgreSQL 풀스택 하네스 신규 구축 |
| 2026-07-05 | 8인 로스터 + 5-Phase 하이브리드로 전면 재편 | 전체 | 계층적위임+팬아웃+파이프라인+생성검증 Phase별 조합, feature-pm 능동↔감독 전환, 요구사항 JSON·기능 폴더 격리, boundary-verifier 분리 도입 |

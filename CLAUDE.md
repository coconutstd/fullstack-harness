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

## 하네스: 코드 리뷰 (Next.js + Nest.js + PostgreSQL)

**목표:** 변경(diff)·PR·모듈을 여러 전문 리뷰어로 **블라인드 병렬** 검토하고, 각 지적을 적대적으로 검증해 오탐을 걷어낸 뒤, 심각도순 리포트를 낸다.

**트리거:** 코드 리뷰·PR 리뷰·diff 검토·변경 검토·'이 코드/함수/모듈 봐줘'·버그/보안 점검, 그리고 재검토·지적 반영 후 다시·부분 재리뷰 요청 시 `review-orchestrator` 스킬을 사용하라. 단순 개념 질문은 직접 응답 가능. (빌드 하네스와 별개 도메인 — 만들기=`fullstack-orchestrator`, 검토=`review-orchestrator`.)

**실행 모드:** 하이브리드 5-Phase(서브에이전트 팬아웃 주도). review-lead(리더, 메인 루프)가 구동. 리뷰어는 **블라인드**(관점 수렴 방지 → 커버리지↑)로 병렬 실행, 팀 채팅 없음. 6인 로스터(리더 + 4 리뷰어 + 검증자), 전원 `model:"opus"`.

**Phase × 활성:** ①스코프확정(lead단독) ②팬아웃리뷰(correctness/security/boundary/design 블라인드 병렬) ③취합·중복제거(lead단독) ④적대적검증(finding-verifier) ⑤종합리포트(lead단독).

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-07-05 | 초기 구성 (6인 로스터 + 6개 스킬) | 전체 | 코드 리뷰 하네스 신규 구축. 블라인드 팬아웃 + 적대적 검증 파이프라인, finding 스키마 표준화 |

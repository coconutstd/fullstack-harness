---
name: correctness-review
description: "정확성 리뷰 스킬. 변경된 코드에서 로직 버그·엣지케이스 미처리·null/undefined·에러 삼킴·경계조건·동시성/레이스·off-by-one을 찾는다. correctness-reviewer가 리뷰 하네스 Phase 2에서 사용."
---

# Correctness Review — 정확성 리뷰

당신은 **코드가 의도대로 동작하지 않는 지점**을 찾는다. 스타일·보안·구조가 아니라 **"이 입력에서 틀린 답/크래시가 나온다"**를 잡는 것이 존재 이유. 산출은 `references/finding-schema.md`(review-orchestrator) 표준을 따른다 — 각 지적에 재현 가능한 `failure_scenario`가 없으면 진짜 결함이 아닐 가능성이 높으니 스스로 검열하라.

## 무엇을 보는가

| 범주 | 구체 신호 |
|------|----------|
| null/undefined | 옵셔널 체이닝 없는 접근, API 응답 `undefined` 가능성, 배열 메서드를 non-array에 호출 |
| 엣지케이스 | 빈 배열/문자열, 0/음수, 최대값, 첫/마지막 요소, 중복 입력 |
| 에러 처리 | `catch {}`로 삼킴, 실패를 성공처럼 반환, await 누락, 프로미스 거부 미처리 |
| 경계조건 | off-by-one, `<` vs `<=`, 페이지네이션 오프셋, 슬라이스 범위 |
| 동시성 | 레이스(check-then-act), 트랜잭션 누락, 병렬 요청 시 상태 오염, 멱등성 |
| 제어흐름 | 도달 불가 분기, early-return 누락, fall-through, 조건 부정 오류 |
| 타입 우회 | `as`·`any`·non-null `!`로 컴파일러를 속인 지점(런타임 폭탄) |

## 작업 원칙

- **입력을 상상하라.** 각 함수에 "어떤 인자면 깨지나?"를 던진다. 깨지는 입력을 못 찾으면 지적하지 않는다.
- **변경분 + 호출부.** diff만 보지 말고, 바뀐 함수의 호출자와 피호출자를 읽어 계약 위반을 확인한다.
- **실증 우선.** 가능하면 해당 로직을 실제로 실행/타입체크해 재현한다(`npm run build`, 작은 스크립트).
- **확신도를 정직하게.** 재현 경로가 확실하면 `high`, 의심스럽지만 미확인이면 `medium`/`low` + `confidence`에 반영.
- **중복 지적 금지.** 같은 결함이 여러 줄에 퍼져도 한 건으로.

## 이 스택 특이사항 (Next.js + Nest.js + Prisma)

- Nest.js 서비스에서 Prisma `findUnique` 결과가 `null`인데 바로 프로퍼티 접근
- `async` 컨트롤러에서 `await` 누락 → 응답이 프로미스
- DTO 검증을 통과했다고 비즈니스 불변식까지 보장되지 않음
- 프론트 훅에서 로딩/에러 상태 미처리로 `data` 접근

## 출력

`_workspace/review/10_findings_correctness.json` — `dimension:"correctness"`, findings 배열(스키마 준수). 이슈 없으면 빈 배열 + 검토 범위를 반환값에 명시.

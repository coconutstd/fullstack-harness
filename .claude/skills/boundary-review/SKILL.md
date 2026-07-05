---
name: boundary-review
description: "경계면 리뷰 스킬. Next.js↔Nest.js 통합 지점을 교차 검토한다 — API 응답 shape↔프론트 훅 타입, 래핑/언랩, snake↔camel 필드명, 엔드포인트↔훅 1:1 매핑, 동기(202)↔비동기 결과, 파일경로↔링크. boundary-reviewer가 리뷰 하네스 Phase 2에서 사용."
---

# Boundary Review — 경계면 리뷰

당신은 **각각은 맞지만 연결 지점에서 계약이 어긋나 런타임에 깨지는 버그**를 찾는다(`filter is not a function`, 404 링크, 필드 안 보임 부류). 정적 타입체크와 빌드 통과로는 안 잡히는 계층이다. 산출은 `references/finding-schema.md`(review-orchestrator) 표준.

> 빌드 하네스의 `boundary-verification` 스킬은 계약 JSON(oracle)이 있을 때의 검증이다. **리뷰에는 보통 oracle이 없으므로**, 여기서는 생산자 코드 자체를 정답지로 삼아 소비자와 교차 대조한다.

## 핵심 방법: 양쪽을 동시에 읽어라

경계 버그는 한쪽만 읽으면 못 잡는다. 반드시 **생산자와 소비자를 같이 열어** 비교한다.

| 경계 | 생산자(왼쪽) | 소비자(오른쪽) | 흔한 불일치 |
|------|------------|--------------|-----------|
| 응답 shape | Nest.js 서비스/컨트롤러 반환 | 프론트 훅 `fetchJson<T>` / 타입 | API가 `{items:[]}`인데 훅은 `T[]` 기대 |
| 래핑 | `{ data: {...} }` 여부 | 훅이 `.data` 언랩하는지 | 이중 래핑/언랩 누락 |
| 필드명 | Prisma(snake) → DTO 변환 | 프론트 타입 정의(camel) | `thumbnail_url` vs `thumbnailUrl` |
| 엔드포인트 | Nest.js 라우트 경로/메서드 | 훅의 fetch URL/메서드 | 경로 오타, 메서드 불일치, 훅 없는 API |
| 동기/비동기 | 202 즉시 응답 vs 최종 결과 | 프론트가 최종 필드 접근 | 즉시 응답에서 `data.result` 접근 |
| 라우팅 | `app/` 디렉토리 구조 | `href`/`router.push`/`redirect` | route group·동적 세그먼트로 경로 어긋남 |

## 작업 원칙

- **존재 확인이 아니라 교차 비교.** "API 있나?"가 아니라 "응답이 호출측 기대와 일치하나?".
- **타입 우회를 의심하라.** `fetchJson<Foo[]>()`는 런타임 응답이 달라도 컴파일 통과. 제네릭·`as`·`any`가 낀 경계를 집중 대조한다.
- **1:1 매핑.** 변경된 API 엔드포인트마다 대응 훅을, 훅마다 대응 API를 짝지어 누락/고아를 찾는다.
- **실증.** 가능하면 실제 응답 shape과 훅 타입을 스크립트로 대조하거나 엔드포인트를 호출한다.

## 이 스택 특이사항

- `apps/api`(Nest.js) 컨트롤러 반환 ↔ `apps/web`(Next.js) `lib/`·훅의 타입
- Nest.js 글로벌 프리픽스/직렬화 인터셉터가 최종 shape을 바꾸는지
- 페이지네이션 응답(`{items,total,page}`)을 프론트가 배열로 취급하는지

## 출력

`_workspace/review/10_findings_boundary.json` — `dimension:"boundary"`, findings 배열. 각 지적에 **어느 쪽이 계약을 어겼는지**와 양쪽 `파일:라인`을 명시. 이슈 없으면 빈 배열 + 검토한 경계 목록 반환.

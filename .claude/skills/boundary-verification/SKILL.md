---
name: boundary-verification
description: "Next.js↔Nest.js 경계면 전담 실시간 검증 스킬. 계약 JSON을 정답지로 백엔드 응답 shape·프론트 훅 타입·래핑·엔드포인트 매핑을 각 모듈 완성 직후 교차검증. 경계면 검증·계약 준수·shape 불일치 점검 시, boundary-verifier가 Phase 3~4에서 사용."
---

# Boundary Verification — 경계면 실시간 교차검증

boundary-verifier가 Phase 3~4에 상주하며 사용한다. **오직 shape 계약 준수**만 본다 — 라우팅·상태머신·기능 실행은 test-suite(Phase 5) 몫이다. 각각 올바르게 구현됐지만 연결 지점에서 계약을 어겨 생기는 런타임 크래시를 잡는다.

## 핵심 원리: 존재 확인이 아니라 교차 비교
"API가 있나?"는 약한 검증. "API 응답이 프론트 훅의 기대와 일치하나?"가 강한 검증. **계약(`01_api_contract.json`)을 정답지로, 양쪽 코드를 동시에 열어** 대조한다. 계약이 JSON이므로 가능한 한 기계적으로 비교한다.

## 왜 정적 리뷰/빌드로 못 잡나
- 제네릭 캐스팅: `fetchJson<Task[]>()`는 실제 `{items:[]}`여도 컴파일 통과.
- `npm run build` 성공 ≠ 정상: `any`/`as`/제네릭 우회 지점은 런타임에 터진다.
- 두 서버 분리로 타입 공유가 없어, 코드를 안 보면 계약 위반을 알 수 없다.

## 검증 항목 (경계면만)

| 항목 | 생산자 (읽을 곳) | 소비자 (읽을 곳) | 정답지 |
|------|---------------|----------------|--------|
| 응답 shape | `02_backend_progress.json` + 서비스 return | 훅 `fetchJson<T>` | 계약 `responses.shape` |
| 래핑 | 실제 `{items}` vs `[]` | 훅 `.items` 언랩 여부 | 계약 `wrapped` |
| 필드 명명 | 서비스 camelCase 변환 | 프론트 `types.ts` | 계약 casing |
| 엔드포인트 1:1 | Nest.js `@Get/@Post` 라우트 | 훅 호출 URL | 계약 `endpoints` |
| 동기/비동기 | 202 즉시응답 | 프론트 최종필드 접근 여부 | 계약 `async` |

## 검증 절차 (점진 · 모듈 완료 알림마다)
각 모듈 완료 알림을 받으면 즉시:
1. 계약에서 해당 엔드포인트의 `responses.shape` + `wrapped` + `async` 확인.
2. 백엔드: 서비스/컨트롤러의 실제 반환 shape 추출(Grep `return`, `02_backend_progress.json` 기록 대조).
3. 프론트: 훅의 제네릭 `T` + 언랩 로직(`.items`) 확인.
4. 계약=백엔드=프론트 3자 일치 판정. 불일치면 **계약 기준으로 어느 쪽이 틀렸는지** 명시(둘 다면 둘 다).
5. 엔드포인트 1:1: Nest.js 라우트 목록과 프론트 호출 URL을 대조 — 백엔드에 있으나 프론트 미호출(의도적 관리 API인지 확인), 프론트가 부르나 백엔드에 없음(런타임 404).
6. 가능하면 타입체크/엔드포인트 실호출로 실증.

## 자주 나오는 경계면 버그 (근거 사례)
| 버그 | 원인 |
|------|------|
| `data.filter is not a function` | 계약 `wrapped:true`인데 훅이 언랩 안 함 / 백엔드가 래핑 안 함 |
| 이미지 안 보임 | `thumbnailUrl`(camel) vs `thumbnail_url`(snake) |
| 저장 안 됨 | 엔드포인트 존재하나 대응 훅 없음(호출 누락) |
| `data.failedIndices` 크래시 | `async:true` 202 즉시응답에서 최종 필드 접근 |
| CORS 전부 실패 | 백엔드가 프론트 origin 미허용 |

모두 "양쪽을 동시에 읽었다면" 잡혔을 버그다.

## 리포트 → `03_boundary_report.json`
```json
{
  "feature": "login",
  "checkedAt": "모듈 단위 누적",
  "items": [
    { "endpoint": "GET /tasks", "check": "wrapping", "status": "fail",
      "violator": "frontend", "location": "hooks/useTasks.ts:12",
      "detail": "계약 wrapped:true인데 훅이 배열로 기대", "fix": ".items 언랩 추가", "severity": "runtime-crash" }
  ]
}
```
- status: pass / fail / unverified. 미완성은 unverified(통과 처리 금지).
- 심각도: runtime-crash / functional / quality.

## 팀 통신 (Phase 3~4)
- 모듈 완료 알림마다 즉시 착수.
- 불일치는 backend-impl + frontend-impl **양쪽**에 통보(한쪽만 고치면 여전히 깨짐). 계약 기준 틀린 쪽 명시.
- 계약 자체 결함은 PM(감독자)에 보고 → api-designer 소환 판단.
- 사소한 건 직접 수정 후 알림, 그 외는 담당자에 구체적 수정법과 함께 넘김.

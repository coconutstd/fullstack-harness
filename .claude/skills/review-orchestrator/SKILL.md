---
name: review-orchestrator
description: "코드 리뷰 하네스의 오케스트레이터. 변경(diff)·PR·특정 파일/모듈을 여러 전문 리뷰어로 병렬 검토하고, 각 지적을 적대적으로 검증한 뒤 심각도순 리포트를 낸다. '코드 리뷰', '리뷰해줘', 'PR 리뷰', 'diff 검토', '변경 검토', '이 코드 봐줘', '버그 있는지 봐줘', '보안 점검', '이 함수/모듈 리뷰' 요청 시 반드시 이 스킬을 사용. 후속: '다시 리뷰', '재검토', '지적 반영 후 다시 봐줘', '이 파일만 다시', '리뷰 업데이트', '이전 리뷰 개선' 시에도 반드시 사용. 단순 개념 질문은 제외."
---

# Review Orchestrator — 코드 리뷰 하네스

review-lead(리더, 메인 루프)가 구동하는 **블라인드 팬아웃 + 적대적 검증** 리뷰 파이프라인. 여러 전문 리뷰어가 **서로를 모른 채 독립적으로** 변경을 검토하고(관점 수렴 방지 → 커버리지 극대화), 각 지적을 검증자가 **반증 시도**해 오탐을 걸러낸 뒤, 심각도순 리포트를 낸다.

**실행 모드: 하이브리드 (서브에이전트 팬아웃 주도).**
리뷰어는 팀 채팅으로 실시간 조율하지 **않는다** — 독립성이 곧 커버리지다. 리더가 서브에이전트를 병렬 스폰하고, 파일 기반으로 산출물을 취합한다.

| Phase | 실행 모드 | 활성 | 산출물 |
|-------|----------|------|--------|
| 1 스코프 확정 | 리더 단독 | review-lead | `00_scope.json` |
| 2 팬아웃 리뷰 | 서브에이전트 병렬(블라인드) | 4 리뷰어 | `10_findings_{dim}.json` |
| 3 취합·중복제거 | 리더 단독(배리어) | review-lead | `20_merged.json` |
| 4 적대적 검증 | 서브에이전트 병렬 | finding-verifier | `30_verified.json` |
| 5 종합 리포트 | 리더 단독 | review-lead | `report.md` + 사용자 요약 |

산출물 표준(finding 스키마)·심각도 기준은 `references/finding-schema.md`를 정답지로 삼는다. 모든 서브에이전트 호출은 `model: "opus"`.

---

## Phase 0: 컨텍스트 확인

시작 시 `_workspace/review/`를 확인해 실행 모드를 판별한다.

- `_workspace/review/report.md` **없음** → **초기 리뷰** (Phase 1부터)
- `report.md` **있음** + 사용자가 "지적 반영했으니 다시 봐줘" → **재검토**: 이전 `30_verified.json`을 읽어, CONFIRMED 지적이 실제로 수정됐는지 우선 확인 + 새 변경분 리뷰. 이전 workspace는 `_workspace/review_prev/`로 이동.
- `report.md` 있음 + "이 파일만 다시" → **부분 재실행**: 해당 파일만 스코프로 Phase 2~5 재실행, 나머지 지적은 보존.

---

## Phase 1: 스코프 확정 (리더 단독)

리뷰 대상을 확정해 `_workspace/review/00_scope.json`을 만든다. 대상 자동 판별 우선순위:

1. 사용자가 PR 번호/URL 지정 → `gh pr diff <n>` 로 diff 수집
2. 사용자가 파일/모듈/디렉토리 지정 → 해당 경로 전체
3. 지정 없음 → 작업 중 변경분: `git diff` (unstaged) + `git diff --staged`, 비어있으면 `git diff main...HEAD` (브랜치 변경분)
4. 그래도 비면 → 사용자에게 "무엇을 리뷰할까요?(작업 diff/PR/특정 모듈/전체)" 확인

`00_scope.json` 필수 항목:
```json
{
  "mode": "diff | pr | files | full",
  "target": "설명 (예: 'git diff main...HEAD', 'PR #42', 'apps/api/src/auth')",
  "files": ["apps/api/src/auth/auth.service.ts", "..."],
  "diff_available": true,
  "context_notes": "변경 의도·관련 배경 (PR 설명, 커밋 메시지에서 추출)",
  "stack_hints": "이 코드베이스 특이사항 (Next.js web ↔ Nest.js api 경계, Prisma 등)"
}
```

스코프가 크면(파일 30개+) 리더가 위험도 높은 파일부터 우선순위를 매기고, 저위험 대량 변경(생성 파일, 마이그레이션 등)은 표본만 본다는 사실을 `context_notes`에 명시한다(침묵 축소 금지).

---

## Phase 2: 팬아웃 리뷰 (서브에이전트 병렬, 블라인드)

4개 리뷰어를 **동시에** 스폰한다(`Agent` 도구, 각 `model:"opus"`, `run_in_background:true`). 각 리뷰어는 `00_scope.json`과 실제 코드만 입력받고 **서로의 산출물을 보지 않는다**.

| 에이전트 | 스킬 | 차원 |
|---------|------|------|
| correctness-reviewer | correctness-review | 로직 버그·엣지케이스·에러처리·동시성 |
| security-reviewer | security-review | 인증/인가·인젝션·시크릿·데이터 유출·입력검증 |
| boundary-reviewer | boundary-review | Next.js↔Nest.js 경계·shape/래핑·DTO↔타입·엔드포인트 매핑 |
| design-reviewer | design-review | 단순화·재사용(DRY)·효율(N+1 등)·네이밍·죽은코드 |

각자 `_workspace/review/10_findings_{dim}.json`에 finding 스키마로 출력. 지적이 없으면 빈 배열 + "검토했으나 해당 차원 이슈 없음"을 반환.

리뷰어는 **변경분(diff)에 집중**하되, 변경이 건드리는 주변 코드(호출부, 계약 상대편)까지 읽어 경계 결함을 잡는다. diff만 보면 경계면 버그를 놓친다.

---

## Phase 3: 취합·중복제거 (리더 단독, 배리어)

4개 리뷰어가 **모두** 끝나면(배리어) 리더가 취합한다:

1. 4개 `10_findings_*.json`을 병합
2. dedup 키(`file`+`line±3`+`category`)로 중복 병합. 여러 차원이 같은 결함을 지적했으면 `dimension`을 배열로 합치고 신뢰도 상향.
3. **조기 종료:** 병합 결과 0건이면 Phase 4를 건너뛰고 "이슈 없음" 리포트로 직행.
4. `_workspace/review/20_merged.json` 출력.

---

## Phase 4: 적대적 검증 (finding-verifier 병렬)

병합된 각 지적(또는 파일 단위 묶음)을 finding-verifier에 넘겨 **반증을 시도**하게 한다. 지적 수가 많으면 파일/심각도 단위로 묶어 병렬 스폰.

검증자는 각 지적에 `verdict`(CONFIRMED/PLAUSIBLE/REFUTED) + `verify_note`를 붙인다. 기본 태도는 **회의적** — 재현 경로를 못 세우면 REFUTED 쪽으로. 단, REFUTED는 명확한 사유가 있어야 하며 삭제하지 않고 기록한다.

산출: `_workspace/review/30_verified.json`.

---

## Phase 5: 종합 리포트 (리더 단독)

`30_verified.json`을 심각도 → 확신도 순으로 정렬해 리포트를 만든다.

- `_workspace/review/report.md`: 전체 리포트 (요약 표 + 지적별 상세: 위치·심각도·시나리오·수정법·검증결과)
- 사용자에게는 **핵심 요약**을 인라인으로: blocker/high 먼저, 각 1~2줄 + `파일:라인`. REFUTED는 부록으로 분리.

리포트 구조:
```markdown
## 코드 리뷰 결과 — {target}
| 심각도 | 건수 | CONFIRMED | PLAUSIBLE |
...요약 표...

### 🔴 Blocker / High (병합 전 수정)
- [corr-003] `apps/api/src/...:42` — {summary}. 시나리오: {failure_scenario}. 수정: {fix}
### 🟡 Medium / Low
### ⚪ Nit
### 부록: 검토 후 기각(REFUTED)
```

---

## 데이터 전달 프로토콜

- **반환값 기반**: 각 서브에이전트가 리더에게 결과 요약 반환.
- **파일 기반**: 실제 산출물은 `_workspace/review/`에 JSON으로. 파일명 `{phase}_{artifact}.json`. 중간 파일 보존(감사 추적).
- 리뷰어 간 직접 통신 없음(블라인드 유지).

## 에러 핸들링

| 상황 | 처리 |
|------|------|
| 리뷰어 1개 실패 | 1회 재시도 → 재실패 시 해당 차원 없이 진행, 리포트에 "{차원} 미검토" 명시 |
| 검증자 실패 | 해당 지적은 `PLAUSIBLE`(미검증)로 표시, 삭제 금지 |
| 스코프 비어있음 | 사용자에게 대상 확인 (Phase 1의 4번) |
| 지적 상충(A는 버그라 하고 B는 정상) | 삭제하지 말고 양쪽 출처 병기, 검증자에게 판정 위임 |

핵심 원칙: **1회 재시도 후 누락은 리포트에 명시**(침묵 금지), **상충·기각은 삭제 않고 출처와 함께 기록**.

---

## 테스트 시나리오

**정상 흐름:** 사용자 "방금 작업한 auth 변경 리뷰해줘" → Phase 1: `git diff`로 auth 관련 5파일 스코프 → Phase 2: 4리뷰어 병렬, correctness가 토큰 만료 미처리, boundary가 로그인 응답 shape↔프론트 훅 불일치 지적 → Phase 3: 6건 병합(1건 중복) → Phase 4: 5건 검증(4 CONFIRMED, 1 REFUTED) → Phase 5: blocker 1·high 2 요약 리포트.

**에러 흐름:** security-reviewer가 대용량 파일에서 타임아웃 → 1회 재시도 실패 → 나머지 3차원으로 리포트 생성 + "보안 차원 미검토, 재실행 권장" 명시.

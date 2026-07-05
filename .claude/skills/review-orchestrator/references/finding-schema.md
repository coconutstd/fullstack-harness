# Finding 스키마 — 리뷰 하네스 공통 표준

모든 리뷰어(correctness/security/boundary/design)와 검증자(finding-verifier)는 이 스키마로 산출물을 통일한다. 표준화의 이유: **기계적 dedup·심각도 랭킹·적대적 검증**을 가능하게 하기 위함. 자유 서술 리포트는 자동 처리할 수 없다.

## 리뷰어 산출 스키마

각 리뷰어는 `_workspace/review/10_findings_{dimension}.json`에 아래 배열을 쓴다.

```json
{
  "dimension": "correctness | security | boundary | design",
  "findings": [
    {
      "id": "corr-001",
      "severity": "blocker | high | medium | low | nit",
      "category": "kebab-case 슬러그 (예: null-deref, missing-authz, shape-mismatch, dead-code)",
      "file": "repo 기준 상대경로 (예: apps/api/src/auth/auth.service.ts)",
      "line": 42,
      "summary": "결함을 한 문장으로. '무엇이 왜 틀렸다'.",
      "failure_scenario": "구체적 입력/상태 → 잘못된 출력/크래시. 재현 가능한 서술.",
      "suggested_fix": "어떻게 고치는가. 코드 스니펫 가능.",
      "confidence": "high | medium | low"
    }
  ]
}
```

- `id`: 차원 접두사 + 3자리 (corr/sec/bnd/dsn). 검증·리포트에서 지적을 참조하는 키.
- `line`: 1-indexed. 지적이 걸리는 대표 라인. 범위면 시작 라인.
- `failure_scenario`: **필수이자 핵심.** "이렇게 하면 안 좋다"가 아니라 "입력 X → 상태 Y → 결과 Z(크래시/오답/유출)"의 구체 경로. 이걸 못 쓰면 진짜 결함이 아닐 가능성이 높다.
- `confidence`: 리뷰어 스스로의 확신도. verifier가 이걸 참고해 검증 강도를 조절한다.

## 심각도(severity) 기준

| 값 | 의미 | 예 |
|----|------|-----|
| `blocker` | 병합 불가. 데이터 손상·인증 우회·확실한 런타임 크래시 | authz 누락, SQL 인젝션, `filter is not a function` |
| `high` | 병합 전 수정 권장. 특정 조건에서 실패·보안 약점 | 엣지케이스 미처리, N+1로 인한 심각한 성능 저하 |
| `medium` | 고쳐야 하나 급하지 않음. 유지보수성·부분적 오류 | 에러 삼킴, 경계 조건 모호 |
| `low` | 개선하면 좋음 | 중복 로직, 네이밍 |
| `nit` | 취향/사소 | 포맷, 주석 |

**심각도는 "발생 가능성 × 영향"으로 매긴다.** 이론상 가능하나 도달 불가능한 경로는 낮춘다.

## 검증자 산출 스키마 (verifier가 추가)

finding-verifier는 각 지적에 아래 필드를 덧붙여 `_workspace/review/30_verified.json`에 쓴다.

```json
{
  "...원본 finding 필드 전부...",
  "verdict": "CONFIRMED | PLAUSIBLE | REFUTED",
  "verify_note": "반증 시도 결과. REFUTED면 왜 오탐인지, CONFIRMED면 어떻게 재현·확인했는지.",
  "severity_adjusted": "검증 후 조정된 심각도 (원본과 다르면)"
}
```

- `CONFIRMED`: 실제로 재현/추적해 결함임을 입증. 리포트 상단.
- `PLAUSIBLE`: 반증 못 했으나 확정도 못 함(런타임 미구동 등). 리포트에 "미확정"으로 포함.
- `REFUTED`: 오탐. 리포트 본문에서 제외하고 부록에 "검토 후 기각" 사유와 함께 기록(삭제하지 않음 — 감사 추적).

## dedup 키

review-lead가 취합 시 중복 판단 키: `file` + `line`(±3) + `category`. 같은 위치·같은 범주의 지적은 병합하고, 서로 다른 차원이 같은 결함을 지적했으면 `dimension`을 배열로 합쳐 신뢰도를 높인다.

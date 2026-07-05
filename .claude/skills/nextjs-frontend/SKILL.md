---
name: nextjs-frontend
description: "Next.js App Router + TypeScript 프론트엔드 구현 스킬. ui 명세와 api 계약 JSON을 읽고 페이지/컴포넌트/API 클라이언트/훅을 타입 안전하게 구현하고 Nest.js와 연동. UI·화면·라우팅·API 연동·폼 시, frontend-impl이 Phase 3~4에서 사용."
---

# Next.js Frontend — 명세·계약 기반 구현

frontend-impl이 Phase 3~4에서 사용한다. `features/{기능}/01_ui_spec.json`(화면 명세)과 `01_api_contract.json`(계약)을 읽고 Next.js(App Router)를 구현한다. **훅 타입을 계약 응답 shape과 일치**시키는 것이 최우선이다.

## 왜 계약 일치가 최우선인가
`fetchJson<Task[]>()`처럼 제네릭으로 타입을 우기면, 실제 응답이 `{ items: [...] }`여도 컴파일은 통과하고 런타임에 `data.filter is not a function`으로 크래시난다. 빌드 통과는 안전의 증거가 아니다. **계약 JSON을 열어 실제 shape을 확인**하고 그대로 타이핑한다.

## 프로젝트 구조
```
apps/web/
├── src/
│   ├── app/                     # ui_spec의 routes[].filePath 대로
│   ├── components/              # ui_spec의 sharedComponents
│   ├── lib/
│   │   ├── api-client.ts         # fetchJson + Base URL + 인증 헤더
│   │   └── types.ts              # 계약 types에서 도출
│   └── hooks/                    # use{Feature}.ts — 계약 타입으로 타이핑
└── .env.local                    # NEXT_PUBLIC_API_URL
```

## 구현 절차

### 1. 계약 → 타입 도출 (`lib/types.ts`)
- `01_api_contract.json`의 `types`와 각 응답 `shape`을 **그대로** TypeScript 인터페이스로 복제. 임의 변형 금지.
- 래핑 타입(`{ items, total }`)과 엔티티 타입을 구분.

### 2. API 클라이언트 (`lib/api-client.ts`)
- `NEXT_PUBLIC_API_URL` 기반 `fetchJson<T>`.
- 인증 필요 엔드포인트는 `Authorization: Bearer` 부착.
- 에러 응답(`conventions.errorShape`)을 파싱해 throw.
- 제네릭 `T`는 계약의 **실제 응답 타입(래핑 포함)**. 예: `fetchJson<TasksResponse>('/tasks')`.

### 3. 데이터 훅 (`hooks/use{Feature}.ts`)
- 계약 `wrapped:true`면 훅에서 **언랩**(`.items` 반환). 배열 기대 지점에 `{items}`를 넘기지 않는다.
- 로딩/빈/에러 상태 반환.
- `async:true` 엔드포인트는 202 즉시응답에서 최종 필드에 접근하지 않는다(폴링 처리).
- 미구현 API 의존 화면은 계약 타입 기준으로 먼저 만들고 backend-impl "완료" 알림 후 실연동.

### 4. 라우팅 (ui_spec 기준)
- `ui_spec.routes[].filePath`대로 `app/` 구성. `urlPath`로 링크 계산.
- 모든 `<Link href>`/`router.push`/`redirect`가 실제 page 경로를 가리키는지 확인. `(group)` 제거·접두사 누락 주의.
- 서버/클라이언트 컴포넌트 경계는 ui_spec의 `rendering`대로.

### 5. 자가 점검 → `02_frontend_progress.json` 기록
- [ ] 훅 제네릭 타입이 계약 응답 shape과 동일
- [ ] `wrapped` 응답을 언랩함
- [ ] 필드명 camelCase, 계약과 동일
- [ ] `any`/`as`로 불일치를 덮지 않음
- [ ] 모든 링크가 실제 page 경로와 매칭
- [ ] 202 즉시응답에서 최종 필드 미접근

## 팀 통신 (Phase 3~4)
- backend-impl "완료" 알림 → 해당 훅 실연동.
- 계약 응답이 UI에 부족하면 api-designer(설계 산출물)에 보강 필요를 PM 통해 요청.
- 백엔드 응답이 계약과 다르면 backend-impl + boundary-verifier에 파일:라인과 함께 통보.

## 후속 작업
- 기존 컴포넌트/훅이 있으면 읽고 델타만 반영.

## 출력
- 프론트 소스 + `features/{기능}/02_frontend_progress.json`(화면별 완료 + 각 훅이 소비하는 응답 타입).

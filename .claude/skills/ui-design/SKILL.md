---
name: ui-design
description: "기능의 requirements.json을 읽고 Next.js App Router 화면 구조·라우팅·컴포넌트·상태 뷰를 JSON 명세로 설계하는 스킬. 화면 설계·라우팅 트리·컴포넌트 명세 작성 시, ui-designer가 Phase 2에서 사용."
---

# UI Design — 화면·라우팅 명세

ui-designer가 Phase 2(팬아웃 설계)에서 사용한다. `00_requirements.json`(+가능 시 `01_api_contract.json`)을 읽고 `01_ui_spec.json`을 만든다. frontend-impl이 이 명세를 그대로 구현한다.

## 핵심 원칙
- **라우팅 정확성이 최우선.** App Router 규칙(`(group)`은 URL에서 제거, `[param]`은 동적 세그먼트)을 명세에 반영해, frontend-impl이 잘못된 `href`로 404를 만들지 않게 한다.
- **각 화면을 계약 엔드포인트에 매핑.** 화면이 필요로 하는 데이터가 `01_api_contract.json`에 있는지 확인하고, 없으면 api-designer에 보강 요청.
- **구체적으로.** "예쁘게"가 아니라 컴포넌트·상태·네비게이션·서버/클라이언트 경계를 특정한다.

## UI 명세 JSON 스키마
```json
{
  "feature": "login",
  "routes": [
    {
      "urlPath": "/login",
      "filePath": "app/login/page.tsx",
      "auth": false,
      "rendering": "client",
      "purpose": "로그인 폼",
      "components": ["LoginForm"],
      "dataSources": [{ "endpoint": "POST /auth/login", "trigger": "submit" }],
      "states": ["idle", "submitting", "error"],
      "navigatesTo": [{ "on": "success", "to": "/dashboard" }]
    }
  ],
  "sharedComponents": [
    { "name": "LoginForm", "props": ["onSubmit"], "validation": "email 형식, password 8자+" }
  ],
  "routingNotes": "route group 없음. /dashboard는 별도 기능이므로 dependencies 참조."
}
```

## 절차
1. `00_requirements.json`의 screens를 App Router 라우트로 변환(`urlPath` ↔ `filePath` 함께 명시).
2. 각 라우트의 rendering(server/client), 컴포넌트, 상태, 네비게이션 정의.
3. `dataSources`로 화면-엔드포인트 매핑 → 계약과 대조, 부족하면 api-designer에 요청.
4. 공통 컴포넌트를 `sharedComponents`에 정의.

## 라우팅 정합성 규칙 (frontend-impl이 참조)
- `urlPath`와 `filePath`를 함께 명시해, 링크 경로 계산의 근거를 남긴다.
- route group 사용 시 URL에서 제거됨을 `routingNotes`에 경고.
- 다른 기능의 화면으로 이동(`navigatesTo`)하면 그 기능이 `dependencies`에 있는지 확인.

## 산출 체크리스트
- [ ] `01_ui_spec.json`이 파싱 가능
- [ ] 모든 라우트에 `urlPath` + `filePath` 명시
- [ ] 모든 `dataSources`가 계약의 실제 엔드포인트와 매칭
- [ ] 로딩/빈/에러 상태 명세 포함

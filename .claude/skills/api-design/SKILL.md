---
name: api-design
description: "기능의 requirements.json을 읽고 Next.js↔Nest.js REST API 계약을 JSON으로 정의하는 스킬. 엔드포인트·요청/응답 shape·래핑·상태코드·에러 포맷을 기계 판독 가능하게 확정. API 계약 설계·엔드포인트 스펙 작성 시, api-designer가 Phase 2에서 사용."
---

# API Design — 계약을 JSON 단일 진실 소스로

api-designer가 Phase 2(팬아웃 설계)에서 사용한다. `features/{기능}/00_requirements.json`을 읽고 `01_api_contract.json`을 만든다. 이 계약이 backend-impl·frontend-impl·boundary-verifier 모두의 정답지다.

## 왜 계약이 먼저이고, 왜 JSON인가
Next.js와 Nest.js는 별도 서버라 타입을 컴파일 타임에 공유하지 못한다. 응답 shape·필드명·래핑이 어긋나면 런타임에 크래시난다. 계약을 **JSON**으로 확정하면 boundary-verifier가 백엔드 응답·프론트 훅과 **기계적으로 대조**할 수 있어 경계면 버그를 조기에 잡는다.

## 계약 JSON 스키마
```json
{
  "feature": "login",
  "conventions": {
    "casing": "camelCase",
    "listWrapping": { "items": "T[]", "total": "number", "page": "number", "pageSize": "number" },
    "date": "ISO8601 string",
    "errorShape": { "statusCode": "number", "message": "string | string[]", "error": "string" },
    "auth": "Authorization: Bearer <JWT>",
    "baseUrlEnv": "NEXT_PUBLIC_API_URL"
  },
  "types": {
    "User": { "id": "string", "email": "string", "createdAt": "string(ISO)" }
  },
  "endpoints": [
    {
      "method": "POST",
      "path": "/auth/login",
      "auth": false,
      "request": { "body": { "email": "string", "password": "string" } },
      "responses": {
        "200": { "shape": { "accessToken": "string", "user": "User" }, "wrapped": false },
        "401": { "shape": "errorShape" }
      },
      "async": false
    },
    {
      "method": "GET",
      "path": "/tasks",
      "auth": true,
      "request": { "query": { "page": "number?", "pageSize": "number?" } },
      "responses": {
        "200": { "shape": { "items": "Task[]", "total": "number", "page": "number", "pageSize": "number" }, "wrapped": true }
      },
      "async": false
    }
  ]
}
```

## 계약 필수 규칙
- **`casing: camelCase`** — 모든 요청/응답. DB의 snake_case 변환 책임은 backend-impl.
- **`wrapped` 플래그를 모든 응답에 명시** — 목록이 `{items,...}`(wrapped:true)인지 순수 배열(wrapped:false)인지 못박는다. 이 모호함이 `filter is not a function`의 주범이다.
- **`async` 플래그** — 즉시 응답(202)과 최종 결과의 shape이 다르면 둘 다 정의하고 `async:true`. 프론트가 202에서 최종 필드에 접근하지 못하게 경고.
- **`types`에 공유 엔티티를 한 번만 정의**하고 엔드포인트에서 참조 — 중복·불일치 방지.
- **엔티티 필드명은 requirements.json·db 스키마와 일치** — db-migrator와 SendMessage로 맞춘다.

## 절차
1. `00_requirements.json`의 endpoints/entities를 읽는다.
2. `conventions`를 먼저 확정(래핑·casing·에러 포맷).
3. `types`에 엔티티 응답 shape 정의.
4. 각 엔드포인트의 request/responses/wrapped/async 작성.
5. db-migrator·ui-designer와 필드명·데이터 필요를 맞춘다. 충돌은 PM이 중재.

## 산출 체크리스트
- [ ] `01_api_contract.json`이 파싱 가능하고 스키마 준수
- [ ] 모든 응답에 `wrapped` 명시
- [ ] 비동기 엔드포인트에 `async:true` + 최종결과 shape 별도 정의
- [ ] 엔티티 필드명이 requirements·db 스키마와 일치
- [ ] 에러 응답 포맷 통일

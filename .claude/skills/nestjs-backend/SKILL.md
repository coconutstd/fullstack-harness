---
name: nestjs-backend
description: "Nest.js + Prisma + PostgreSQL 백엔드 구현 스킬. api 계약 JSON과 db 스키마를 읽고 모듈/컨트롤러/서비스/DTO를 구현하며 Prisma 마이그레이션을 실행. API 엔드포인트·백엔드 로직·DTO 검증·마이그레이션 실행 시, backend-impl이 Phase 3~4에서 사용."
---

# Nest.js Backend — 계약 기반 구현 + 마이그레이션 실행

backend-impl이 Phase 3~4에서 사용한다. `features/{기능}/01_api_contract.json`(계약)과 `01_db_schema.prisma`(db-migrator 설계)를 읽고 Nest.js 백엔드를 구현한다. **응답 shape을 계약과 바이트 단위로 일치**시키는 것이 최우선이다.

## 왜 계약 일치가 최우선인가
프론트(Next.js)는 별도 서버라 백엔드 응답 모양을 타입으로 강제받지 못한다. 계약과 1바이트라도 다르면(래핑 누락, 필드명, snake/camel 혼용) 프론트가 런타임에 크래시난다. 빌드 통과는 이를 못 잡는다.

## 프로젝트 구조
```
apps/api/
├── prisma/schema.prisma        # db-migrator의 01_db_schema.prisma를 반영
├── prisma/migrations/
├── src/
│   ├── main.ts                 # ValidationPipe, CORS(프론트 origin)
│   ├── prisma/                 # PrismaModule + PrismaService
│   └── {feature}/
│       ├── {feature}.module.ts
│       ├── {feature}.controller.ts   # 라우트 = 계약 엔드포인트
│       ├── {feature}.service.ts      # 비즈니스 로직 + camelCase 변환
│       └── dto/                      # class-validator DTO
└── .env                        # DATABASE_URL
```

## 구현 절차

### 1. 스키마 반영 + 마이그레이션 실행 (db-migrator 설계 → 당신이 실행)
- `01_db_schema.prisma`를 `prisma/schema.prisma`에 반영.
- `01_db_migration_plan.md`의 순서·주의사항을 따라 `npx prisma migrate dev --name {이름}` 실행.
- 위험 요소(데이터 손실) 표시된 작업은 PM에 선보고.

### 2. 전역 설정
- `main.ts`: `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))`.
- CORS를 프론트 origin(`NEXT_PUBLIC_API_URL`)에 허용 — 미설정 시 브라우저 호출 전부 차단.
- 계약 `conventions.errorShape`에 맞춘 exception filter.

### 3. 모듈별 구현 (계약 엔드포인트 → 라우트)
각 엔드포인트마다:
- **DTO**: 요청 body를 class-validator로 검증. `any` 우회 금지.
- **컨트롤러**: 계약의 method/path 그대로.
- **서비스**: Prisma 결과(snake 가능)를 계약 shape(camelCase)으로 **명시 변환**. Prisma 엔티티를 그대로 흘리지 말 것(관계 필드 노출 위험).
- **래핑 준수**: 계약 `wrapped:true`면 `{items,total,...}`, `false`면 순수 값. 절대 다르게 반환하지 않는다.
- **async 준수**: 계약 `async:true`면 202 즉시 응답 shape과 최종 결과를 계약대로 구분.

### 4. 계약 일치 자가 점검 → `02_backend_progress.json` 기록
각 라우트에 대해 확인하고, 실제 반환 shape을 진행 파일에 기록(boundary-verifier 대조용):
- [ ] 필드명 camelCase, 계약과 동일
- [ ] 래핑이 계약 `wrapped` 플래그대로
- [ ] 날짜 ISO 문자열
- [ ] 상태 값이 상태 전이 맵 범위 내(무단 전이 없음)
- [ ] DTO 검증 실제 작동(`any` 없음)

## 팀 통신 (Phase 3~4)
- 각 모듈 완료 시 frontend-impl + boundary-verifier에 "`{METHOD path}` 완료, 응답은 계약대로" SendMessage.
- 계약을 벗어나야 하면 boundary-verifier/PM에 보고(계약 수정은 api-designer 소환). PM은 감독자 모드라 판정 필요 시만 개입.
- boundary-verifier 지적 시 계약 기준으로 확인 후 수정.

## 후속 작업
- 기존 코드가 있으면 읽고 델타만 반영. 마이그레이션은 기존 이력에 이어 추가(재작성 금지).

## 출력
- 백엔드 소스 + `features/{기능}/02_backend_progress.json`(엔드포인트별 완료 상태 + 실제 응답 shape).

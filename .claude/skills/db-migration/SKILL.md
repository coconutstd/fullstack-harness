---
name: db-migration
description: "기능의 requirements.json을 읽고 PostgreSQL/Prisma 스키마·마이그레이션 계획·상태전이맵을 설계하는 스킬(설계까지만, 실행은 backend-impl). 데이터 모델링·Prisma 스키마·마이그레이션 계획 작성 시, db-migrator가 Phase 2에서 사용."
---

# DB Migration — 스키마 & 마이그레이션 설계

db-migrator가 Phase 2(팬아웃 설계)에서 사용한다. `00_requirements.json`을 읽고 Prisma 스키마와 마이그레이션 계획을 산출한다. **설계까지가 범위** — 실제 `prisma migrate` 실행은 Phase 3에서 backend-impl이 한다.

## 핵심 원칙
- **API 계약과 정합.** DB 컬럼은 snake_case(+`@map`) 허용하되, 응답은 camelCase(api-designer 계약)임을 전제로 필드를 설계한다. 변환 지점을 명확히 남긴다.
- **설계만, 실행 금지.** 스키마 파일과 마이그레이션 계획을 산출하되 DB를 건드리지 않는다.
- **엔티티 필드명은 api-designer와 일치.** requirements.json의 entities를 기준으로 SendMessage로 맞춘다.

## 산출물 1: `01_db_schema.prisma`
```prisma
// PostgreSQL
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  createdAt    DateTime @default(now()) @map("created_at")
  @@map("users")
}
```
- Prisma 필드는 camelCase + `@map("snake_case")`로 DB 컬럼 매핑.
- 관계·인덱스·유니크 제약을 requirements.json에 근거해 정의.

## 산출물 2: `01_db_migration_plan.md`
- **마이그레이션 순서**: 어떤 모델을 어떤 순서로 생성/변경하는지(FK 의존 순서).
- **위험 요소**: 데이터 손실 가능 변경(컬럼 삭제·타입 변경·NOT NULL 추가)을 표시.
- **backend-impl 지시**: 실행 명령(`npx prisma migrate dev --name {이름}`)과 주의사항.
- **상태 전이 맵**(해당 시): 아래 포맷.

## 상태 전이 맵 (상태 있는 도메인)
`00_requirements.json`의 `stateMachine`이 있으면 표로 정의한다. 이 맵이 test-suite의 상태 검증 정답지다.
```markdown
## Order 상태 전이 맵
| 현재 | 허용된 다음 | 트리거 |
|------|-----------|--------|
| pending | paid, cancelled | 결제/취소 |
| paid | shipped, refunded | 발송/환불 |
| shipped | delivered | 배송완료 |

- 무단 전이(맵에 없는 전이)는 백엔드에서 거부.
- 중간 상태 → 최종 상태 누락 없는지 확인(영원히 대기 방지).
```

## 절차
1. `00_requirements.json`의 entities → Prisma 모델.
2. 관계·인덱스·제약 정의, camelCase 필드 + `@map`.
3. 마이그레이션 순서·위험 요소 작성.
4. `stateMachine`이 있으면 상태 전이 맵 정의.
5. api-designer와 필드명·타입 맞춤.

## 산출 체크리스트
- [ ] `01_db_schema.prisma` 유효(문법·관계)
- [ ] 필드명이 api 계약과 일치, `@map`으로 snake_case 매핑
- [ ] 마이그레이션 순서·위험 요소 문서화
- [ ] 상태 있는 도메인은 상태 전이 맵 포함
- [ ] 실제 마이그레이션은 실행하지 않음(backend-impl 몫)

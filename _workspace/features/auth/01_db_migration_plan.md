# auth — 마이그레이션 계획

> 설계 산출물. **실행은 Phase 3 backend-impl 담당** (본 문서는 실행하지 않음).
> 대상: `apps/api`(Nest.js) 내 Prisma. Datasource = PostgreSQL, `env("DATABASE_URL")`.

## 1. 대상 스키마
- 파일: `_workspace/features/auth/01_db_schema.prisma` → 구현 시 `apps/api/prisma/schema.prisma`로 반영.
- 모델: `User` 1개 (관계 없음, 독립 테이블 `users`).

### User 컬럼 매핑
| Prisma 필드 (camelCase) | DB 컬럼 (snake_case) | 타입 | 제약 |
|---|---|---|---|
| id | id | String | PK, `@default(cuid())` |
| email | email | String | UNIQUE (중복 방지 → 409 근거) |
| passwordHash | password_hash | String | NOT NULL, 응답 비노출 |
| createdAt | created_at | DateTime | `@default(now())` |
| updatedAt | updated_at | DateTime | `@updatedAt` |

- **camelCase ↔ snake_case 변환 지점**: Prisma Client가 `@map`으로 자동 처리. API 응답은 Prisma 필드명(camelCase) 그대로 → api-designer 계약(`id`, `email`, `createdAt`, `updatedAt`)과 정합. `passwordHash`는 service/DTO에서 명시적으로 제외.

## 2. 마이그레이션 순서
FK 의존 없음 → 단일 단계.

1. `User` 모델 생성 (`users` 테이블) + `email` UNIQUE 인덱스 + PK.

### 실행 명령 (backend-impl 몫)
```bash
# apps/api 디렉터리에서
npx prisma migrate dev --name init_auth
npx prisma generate   # migrate dev가 자동 수행하지만 명시적 확인
```

## 3. 전제 / 환경
- 로컬 PostgreSQL 전제. `apps/api/.env` 예시:
  ```
  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/app_dev?schema=public"
  ```
- **Seed: 불필요.** 회원가입 엔드포인트(`POST /auth/signup`)로 row가 생성되므로 초기 데이터 시딩 불요.

## 4. 위험 요소
- **없음(초기 마이그레이션).** 신규 테이블 생성만 수행 — 데이터 손실·타입 변경·NOT NULL 소급 추가 등 파괴적 변경 없음.
- 주의: `email` UNIQUE 위반은 Prisma가 `P2002` 에러로 던짐 → backend-impl은 이를 잡아 **409 Conflict**로 매핑(계정 존재 여부는 signup에서만 노출, login에서는 401로 은닉).
- `id`는 cuid 문자열(자동생성). DB default가 아닌 Prisma 애플리케이션 레벨 생성이므로 raw SQL insert 시 id 누락 주의.

## 5. 상태 전이 맵
auth 도메인은 **복잡한 상태 머신이 없다**(`stateMachine` 미정의). User row는 단일 생명주기.

### User 생명주기 (참고용)
| 현재 | 다음 | 트리거 |
|------|------|--------|
| (없음) | 생성됨(persisted) | 회원가입 `POST /auth/signup` → `users` INSERT |
| 생성됨 | 생성됨(불변) | 로그인/`/me` 는 조회만 — row 상태 변화 없음 |

- 로그인/로그아웃은 **stateless JWT** 처리 → DB에 세션/상태 컬럼을 두지 않음(요구사항 scope.out: 서버측 세션 저장소 제외).
- 로그아웃은 클라이언트 토큰 폐기로 처리 → DB 변경 없음.
- 따라서 test-suite가 검증할 무단 상태 전이 규칙은 존재하지 않음. 검증 초점은 UNIQUE(중복→409)와 인증 가드(401)에 둔다.

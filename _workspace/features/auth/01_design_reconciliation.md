# Phase 2 설계 정합 결정 (PM 중재)

세 designer 산출물 교차 확인 결과 및 PM 확정 사항. **Phase 3 팀B 전원 준수.**

## 확정 사항
1. **응답 래핑: unwrapped 평면** — 모든 성공 응답은 순수 객체 직접 반환. `{data:...}` 미사용.
2. **User shape (응답 정답지):** `{ id, email, createdAt, updatedAt }`. `passwordHash`는 DB 전용, 어떤 응답에도 미포함.
3. **login 응답:** `{ accessToken, tokenType:"Bearer", expiresIn:3600, user:User }` — 토큰은 최상위 `accessToken`.
4. **signup:** 201 + `User`. 토큰 미발급(자동 로그인 없음) → 프론트는 성공 시 `/login`으로 이동.
5. **토큰 저장:** 프론트 `localStorage` key `auth.accessToken`. 로그아웃 = removeItem. `/dashboard` 클라이언트 가드가 미인증 시 `router.replace('/login')`.

## 충돌 해소 (중요)
- **에러 포맷:** 계약이 정답지. 모든 에러 = `{ statusCode, message, error }` (Nest 기본 HttpException 포맷).
  - 400(검증): `message`는 `string[]` (class-validator 필드별 메시지 배열).
  - 401(로그인 실패/토큰 무효): `message`는 string. 계정 존재 여부 비노출.
  - 409(이메일 중복): `message`는 string.
- ui-designer가 가정한 `error.fieldErrors.email` 구조는 **폐기**. frontend-impl은 400의 `message: string[]`를 폼 전역 에러 영역에 표시(또는 배열을 파싱해 필드 매핑). boundary-verifier가 이 포맷 일치를 검증.

## 스캐폴딩 전제
- 모노레포: `apps/web`(Next.js App Router, TS) / `apps/api`(Nest.js + Prisma + PostgreSQL).
- API base URL `http://localhost:3001`, 프론트 env `NEXT_PUBLIC_API_URL`.
- backend-impl이 Prisma 마이그레이션(`npx prisma migrate dev --name init_auth`) 실행. 로컬 PostgreSQL 필요 → 없으면 docker-compose 제공.

---
name: security-review
description: "보안 리뷰 스킬. 변경된 코드에서 인증/인가 누락·인젝션·시크릿 노출·민감정보 유출·입력검증 부재·IDOR·안전하지 않은 의존성 사용을 찾는다. security-reviewer가 리뷰 하네스 Phase 2에서 사용."
---

# Security Review — 보안 리뷰

당신은 **악의적 입력·권한 없는 접근·정보 유출**을 찾는다. 방어적 보안 관점에서, "공격자가 이걸 어떻게 악용하나?"를 던진다. 산출은 `references/finding-schema.md`(review-orchestrator) 표준. 각 지적의 `failure_scenario`는 **공격 경로**로 쓴다(입력 → 우회 → 피해).

## 무엇을 보는가

| 범주 | 구체 신호 |
|------|----------|
| 인가(authz) | 리소스 소유권 미확인(IDOR), 역할 검사 누락, 프론트에서만 막고 API는 열림 |
| 인증(authn) | 토큰 검증 누락/약함, 만료 미확인, 세션 고정, 비밀번호 평문/약한 해시 |
| 인젝션 | Prisma `$queryRaw` 문자열 결합, 동적 쿼리, 명령 실행, 경로 조작 |
| 시크릿 | 하드코딩 키/비밀번호, `.env` 커밋, 로그에 토큰/비밀번호 출력 |
| 데이터 유출 | API 응답에 과다 필드(password hash, 내부 id), 에러 메시지에 스택/쿼리 노출 |
| 입력 검증 | 서버측 검증 부재, 신뢰 못 할 입력을 그대로 사용, 파일 업로드 미검증 |
| 웹 | XSS(`dangerouslySetInnerHTML`), CSRF, 열린 CORS, 안전하지 않은 리다이렉트 |

## 작업 원칙

- **서버를 신뢰 경계로 본다.** 프론트 검증은 UX일 뿐, API가 스스로 막지 않으면 취약. Next.js 클라이언트 코드의 검증은 보안으로 치지 않는다.
- **소유권을 추적하라.** `findUnique({where:{id}})`에 `userId` 조건이 있는가? 없으면 IDOR 후보.
- **데이터가 나가는 경계를 본다.** DB → 서비스 → 컨트롤러 → 응답에서 민감 필드가 걸러지는가.
- **오탐 절제.** 실제 악용 경로를 세울 수 있을 때만 지적. "이론상 위험"은 `low` + `confidence:low`.
- **심각도는 노출도로.** 인터넷에 열린 인증 우회 = `blocker`, 내부 전용 경로의 약점 = 낮춤.

## 이 스택 특이사항

- Nest.js `Guard`/`@UseGuards` 누락된 컨트롤러 핸들러
- Prisma 응답을 DTO 없이 그대로 반환(내부 필드 유출) — `select`/직렬화 확인
- Next.js Route Handler / Server Action에서 인가 재확인 누락
- JWT 시크릿·DB URL이 코드/로그에 노출

## 출력

`_workspace/review/10_findings_security.json` — `dimension:"security"`, findings 배열. 이슈 없으면 빈 배열 + 검토 범위 명시.

// 계약(01_api_contract.json)의 types 및 응답 shape에서 1:1 도출.
// 모든 성공 응답은 unwrapped 평면(순수 객체). { data: ... } 래핑 없음.

/**
 * User — /auth/signup(201)과 /auth/me(200)의 응답 정답지.
 * passwordHash는 어떤 응답에도 포함되지 않는다.
 */
export interface User {
  id: string;
  email: string;
  createdAt: string; // ISO8601
  updatedAt: string; // ISO8601
}

/**
 * AuthTokenResponse — /auth/login(200) 응답.
 * 토큰은 최상위 accessToken 필드.
 */
export interface AuthTokenResponse {
  accessToken: string;
  tokenType: string; // "Bearer"
  expiresIn: number; // 초 단위, 3600
  user: User;
}

/**
 * ApiErrorShape — 모든 에러 응답의 공통 포맷(Nest 기본 HttpException).
 * - 400(검증 실패): message는 string[] (class-validator 필드별 메시지 배열), error: "Bad Request"
 * - 401(자격증명 불일치 / 토큰 무효): message는 string, error: "Unauthorized"
 * - 409(이메일 중복): message는 string, error: "Conflict"
 */
export interface ApiErrorShape {
  statusCode: number;
  message: string | string[];
  error: string;
}

/** 요청 body 타입 */
export interface SignupRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * API 응답 정답지(계약 types.User).
 * passwordHash 는 절대 포함하지 않는다. 날짜는 ISO8601 문자열.
 */
export interface UserResponse {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

/** 로그인 응답(계약 types.AuthTokenResponse). */
export interface AuthTokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: UserResponse;
}

/** JWT payload. sub=userId, email. */
export interface JwtPayload {
  sub: string;
  email: string;
}

/**
 * Prisma User 엔티티 → 계약 User shape 로 명시 변환.
 * passwordHash·관계 필드를 흘리지 않도록 필드를 열거한다. 날짜는 ISO 문자열로 직렬화.
 */
export function toUserResponse(user: {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}): UserResponse {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

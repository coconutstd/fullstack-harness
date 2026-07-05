import { ConfigService } from '@nestjs/config';

/**
 * 액세스 토큰 만료 시간(초). 단일 소스(single source of truth).
 * - AuthService: 로그인 응답의 expiresIn 값.
 * - JwtModule signOptions.expiresIn: jsonwebtoken 은 정수를 '초'로 해석하므로 동일 값 파생.
 * 한쪽만 바뀌어 응답 expiresIn 과 실제 TTL 이 어긋나는 것을 방지한다.
 */
export const EXPIRES_IN_SECONDS = 3600;

/**
 * JWT 서명/검증 시크릿 해석. module 과 strategy 가 공유하는 단일 진입점.
 * 미주입 시 getOrThrow 가 부팅을 중단(fail-fast)시켜, 운영에서 약한 하드코딩
 * 폴백 시크릿이 조용히 쓰이는 일을 원천 차단한다.
 */
export function resolveJwtSecret(config: ConfigService): string {
  return config.getOrThrow<string>('JWT_SECRET');
}

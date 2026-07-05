import { ConfigService } from '@nestjs/config';
import { EXPIRES_IN_SECONDS, resolveJwtSecret } from './auth.constants';

/**
 * M1 회귀: JWT 시크릿 fail-fast.
 * resolveJwtSecret 은 config.getOrThrow('JWT_SECRET') 로 시크릿을 해석한다.
 * 미주입 시 조용한 하드코딩 폴백 대신 예외로 부팅을 중단해야 한다(운영 인증 우회 차단).
 * 실제 @nestjs/config ConfigService 로 검증(스텁이 아닌 실 동작).
 */
describe('resolveJwtSecret (M1 fail-fast)', () => {
  it('JWT_SECRET 미주입 → throw (부팅 중단, 폴백 시크릿 없음)', () => {
    const config = new ConfigService({}); // JWT_SECRET 미설정
    expect(() => resolveJwtSecret(config)).toThrow();
  });

  it('JWT_SECRET 주입 → 그 값을 그대로 반환(하드코딩 폴백으로 대체되지 않음)', () => {
    const config = new ConfigService({ JWT_SECRET: 'injected-secret-hs256' });
    expect(resolveJwtSecret(config)).toBe('injected-secret-hs256');
  });

  it('폴백 리터럴 부재: 반환값이 알려진 dev 폴백 문자열이 아니어야 한다', () => {
    const config = new ConfigService({ JWT_SECRET: 'real' });
    expect(resolveJwtSecret(config)).not.toBe(
      'dev-secret-change-me-in-production',
    );
  });

  it('EXPIRES_IN_SECONDS 단일 상수 = 3600(계약 expiresIn 파생원)', () => {
    expect(EXPIRES_IN_SECONDS).toBe(3600);
  });
});

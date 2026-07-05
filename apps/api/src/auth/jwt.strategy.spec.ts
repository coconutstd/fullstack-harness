import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

/**
 * JwtStrategy.validate 단위 테스트 (DB 불필요).
 * 토큰 서명·만료 검증 통과 후 payload.sub 로 사용자 조회하는 부분을 mock prisma 로 검증.
 *
 * acceptanceCriteria 매핑:
 *  - AC7 유효 토큰 → /auth/me 200 프로필 (validate 가 User 반환)
 *  - AC6 토큰 무효/subject 없음 → 401
 *  - AC8 passwordHash 미노출 (select 4필드 + toUserResponse)
 */
describe('JwtStrategy.validate', () => {
  const now = new Date('2026-07-05T12:00:00.000Z');
  let strategy: JwtStrategy;
  let prisma: { user: { findUnique: jest.Mock } };

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn() } };
    const config = {
      // resolveJwtSecret 은 미주입 시 fail-fast 하도록 getOrThrow 를 사용한다.
      getOrThrow: (key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret-hs256';
        throw new Error(`missing config: ${key}`);
      },
    } as unknown as ConfigService;
    strategy = new JwtStrategy(config, prisma as unknown as PrismaService);
  });

  it('AC7: subject 사용자 존재 → User(passwordHash 제외, 날짜 ISO) 반환', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'clx1a2b3c4d5e6f7g8h9',
      email: 'user@example.com',
      createdAt: now,
      updatedAt: now,
    });

    const result = await strategy.validate({
      sub: 'clx1a2b3c4d5e6f7g8h9',
      email: 'user@example.com',
    });

    expect(result).toEqual({
      id: 'clx1a2b3c4d5e6f7g8h9',
      email: 'user@example.com',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    expect(result).not.toHaveProperty('passwordHash');

    // AC8: 조회 select 에 passwordHash 미포함.
    const arg = prisma.user.findUnique.mock.calls[0][0];
    expect(arg.select).not.toHaveProperty('passwordHash');
    expect(arg.where).toEqual({ id: 'clx1a2b3c4d5e6f7g8h9' });
  });

  it('AC6: subject 사용자 없음 → UnauthorizedException(401)', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'deleted-user', email: 'gone@example.com' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

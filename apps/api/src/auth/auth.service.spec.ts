import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * AuthService 단위 테스트 (DB 불필요).
 * PrismaService 를 mock, JwtService 는 실제 인스턴스(모듈과 동일 옵션: HS256 / 1h)를 사용해
 * signup/login 의 실행 동작과 계약 shape·보안 규칙을 검증한다.
 *
 * acceptanceCriteria 매핑:
 *  - AC1 유효 회원가입 → User(비번 제외)
 *  - AC2 중복 이메일 → 409
 *  - AC5 틀린 비번/없는 이메일 → 동일 401 (존재여부 비노출)
 *  - AC4 올바른 로그인 → accessToken
 *  - AC8 passwordHash 응답 미노출
 */
describe('AuthService', () => {
  const JWT_SECRET = 'test-secret-hs256';
  let service: AuthService;
  let jwt: JwtService;
  let prisma: {
    user: {
      create: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  const now = new Date('2026-07-05T12:00:00.000Z');
  const persistedUser = {
    id: 'clx1a2b3c4d5e6f7g8h9',
    email: 'user@example.com',
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    prisma = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    // 모듈(auth.module.ts)과 동일한 서명 옵션.
    jwt = new JwtService({
      secret: JWT_SECRET,
      signOptions: { algorithm: 'HS256', expiresIn: '1h' },
    });
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt,
    );
  });

  describe('signup', () => {
    it('AC1: 유효 입력 → 201용 User(passwordHash 제외) 반환 + 날짜 ISO 문자열', async () => {
      prisma.user.create.mockResolvedValue(persistedUser);

      const result = await service.signup({
        email: 'user@example.com',
        password: 'Password1',
      });

      expect(result).toEqual({
        id: persistedUser.id,
        email: 'user@example.com',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
      // AC8: passwordHash 필드 자체가 없어야 함.
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('이메일을 소문자+trim 정규화하고 비밀번호를 bcrypt 해시로 저장한다', async () => {
      prisma.user.create.mockResolvedValue(persistedUser);

      await service.signup({
        email: '  USER@Example.COM  ',
        password: 'Password1',
      });

      const arg = prisma.user.create.mock.calls[0][0];
      expect(arg.data.email).toBe('user@example.com');
      // 저장 해시는 평문이 아니며 bcrypt 로 검증 가능해야 한다.
      expect(arg.data.passwordHash).not.toBe('Password1');
      expect(arg.data.passwordHash).toMatch(/^\$2[aby]\$/);
      await expect(
        bcrypt.compare('Password1', arg.data.passwordHash),
      ).resolves.toBe(true);
      // select 에 passwordHash 가 포함되지 않아 응답 경로로 새지 않는다.
      expect(arg.select).not.toHaveProperty('passwordHash');
    });

    it('AC2: 이메일 중복(P2002) → ConflictException(409)', async () => {
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: '5.22.0',
        }),
      );

      await expect(
        service.signup({ email: 'dup@example.com', password: 'Password1' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('P2002 이외의 DB 오류는 그대로 전파한다(삼키지 않음)', async () => {
      prisma.user.create.mockRejectedValue(new Error('connection lost'));

      await expect(
        service.signup({ email: 'x@example.com', password: 'Password1' }),
      ).rejects.toThrow('connection lost');
    });
  });

  describe('login', () => {
    async function seedUserWithPassword(plain: string) {
      const passwordHash = await bcrypt.hash(plain, 10);
      prisma.user.findUnique.mockResolvedValue({
        ...persistedUser,
        passwordHash,
      });
    }

    it('AC4: 올바른 자격증명 → accessToken + tokenType Bearer + expiresIn 3600 + user', async () => {
      await seedUserWithPassword('Password1');

      const res = await service.login({
        email: 'user@example.com',
        password: 'Password1',
      });

      expect(typeof res.accessToken).toBe('string');
      expect(res.accessToken.length).toBeGreaterThan(0);
      expect(res.tokenType).toBe('Bearer');
      expect(res.expiresIn).toBe(3600);
      expect(res.user).toEqual({
        id: persistedUser.id,
        email: 'user@example.com',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    });

    it('AC8: 로그인 응답 user 에 passwordHash 가 없다', async () => {
      await seedUserWithPassword('Password1');
      const res = await service.login({
        email: 'user@example.com',
        password: 'Password1',
      });
      expect(res.user).not.toHaveProperty('passwordHash');
      expect(JSON.stringify(res)).not.toContain('passwordHash');
    });

    it('발급 토큰은 HS256 서명 + payload{sub,email} + 만료 약 1h', async () => {
      await seedUserWithPassword('Password1');
      const res = await service.login({
        email: 'user@example.com',
        password: 'Password1',
      });

      // 헤더 alg = HS256
      const header = JSON.parse(
        Buffer.from(res.accessToken.split('.')[0], 'base64url').toString(),
      );
      expect(header.alg).toBe('HS256');

      // 올바른 시크릿으로 검증 통과 + payload 확인
      const payload = jwt.verify(res.accessToken, { secret: JWT_SECRET }) as {
        sub: string;
        email: string;
        iat: number;
        exp: number;
      };
      expect(payload.sub).toBe(persistedUser.id);
      expect(payload.email).toBe('user@example.com');
      // exp - iat = 3600초(1h)
      expect(payload.exp - payload.iat).toBe(3600);
    });

    it('틀린 시크릿으로는 토큰 검증이 실패한다', async () => {
      await seedUserWithPassword('Password1');
      const res = await service.login({
        email: 'user@example.com',
        password: 'Password1',
      });
      expect(() =>
        jwt.verify(res.accessToken, { secret: 'wrong-secret' }),
      ).toThrow();
    });

    it('AC5: 없는 이메일 → 401 + 고정 메시지(존재여부 비노출)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const err = await service
        .login({ email: 'ghost@example.com', password: 'Password1' })
        .catch((e) => e);

      expect(err).toBeInstanceOf(UnauthorizedException);
      expect(err.message).toBe('이메일 또는 비밀번호가 올바르지 않습니다');
    });

    it('AC5: 틀린 비밀번호 → 401 + "없는 이메일"과 동일한 메시지', async () => {
      await seedUserWithPassword('Password1');

      const err = await service
        .login({ email: 'user@example.com', password: 'WrongPass9' })
        .catch((e) => e);

      expect(err).toBeInstanceOf(UnauthorizedException);
      // 존재여부 비노출: 없는 이메일 케이스와 메시지가 정확히 동일해야 한다.
      expect(err.message).toBe('이메일 또는 비밀번호가 올바르지 않습니다');
    });

    it('없는 이메일과 틀린 비밀번호의 401 메시지가 서로 구별 불가능하다', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      const noEmailErr = await service
        .login({ email: 'ghost@example.com', password: 'Password1' })
        .catch((e) => e);

      await seedUserWithPassword('Password1');
      const wrongPwErr = await service
        .login({ email: 'user@example.com', password: 'WrongPass9' })
        .catch((e) => e);

      expect(noEmailErr.message).toBe(wrongPwErr.message);
      expect(noEmailErr.getStatus()).toBe(wrongPwErr.getStatus());
      expect(noEmailErr.getStatus()).toBe(401);
    });
  });
});

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { InMemoryPrisma } from './in-memory-prisma';

/**
 * 백엔드 e2e (supertest) — 실제 HTTP 스택을 인메모리 Prisma 로 구동.
 * 전역 ValidationPipe(main.ts 와 동일) + JwtAuthGuard + 예외 매핑을 실호출로 검증한다.
 *
 * acceptanceCriteria 실행 검증:
 *  AC1 signup 201 User(비번 제외) / AC2 중복 409 / AC3 형식·정책 위반 400(message string[])
 *  AC4 login 200 accessToken / AC5 틀린비번·없는이메일 401 동일메시지
 *  AC6 토큰없이 /me 401 / AC7 유효토큰 /me 200 / AC8 어떤 응답에도 passwordHash 없음
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'e2e-secret-hs256';
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(new InMemoryPrisma())
      .compile();

    app = moduleRef.createNestApplication();
    // main.ts 와 동일한 전역 파이프.
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();
  const creds = { email: 'e2e@example.com', password: 'Password1' };

  describe('POST /auth/signup', () => {
    it('AC1: 유효 입력 → 201 + User(passwordHash 제외)', async () => {
      const res = await request(server()).post('/auth/signup').send(creds);
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ email: 'e2e@example.com' });
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).toHaveProperty('updatedAt');
      // AC8
      expect(res.body).not.toHaveProperty('passwordHash');
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    });

    it('AC2: 중복 이메일 → 409 (message string, error Conflict)', async () => {
      const res = await request(server()).post('/auth/signup').send(creds);
      expect(res.status).toBe(409);
      expect(typeof res.body.message).toBe('string');
      expect(res.body.error).toBe('Conflict');
    });

    it('AC3: 형식 틀린 이메일 + 약한 비밀번호 → 400 (message string[])', async () => {
      const res = await request(server())
        .post('/auth/signup')
        .send({ email: 'not-an-email', password: 'short' });
      expect(res.status).toBe(400);
      expect(Array.isArray(res.body.message)).toBe(true);
      expect(res.body.message.length).toBeGreaterThan(0);
      expect(res.body.error).toBe('Bad Request');
    });

    it('AC3: 이메일은 소문자 정규화되어 저장(대문자 가입 후 소문자 로그인 성공)', async () => {
      const up = await request(server())
        .post('/auth/signup')
        .send({ email: 'MixedCase@Example.com', password: 'Password1' });
      expect(up.status).toBe(201);
      expect(up.body.email).toBe('mixedcase@example.com');

      const login = await request(server())
        .post('/auth/login')
        .send({ email: 'mixedcase@example.com', password: 'Password1' });
      expect(login.status).toBe(200);
    });
  });

  describe('POST /auth/login', () => {
    it('AC4: 올바른 자격증명 → 200 + accessToken/Bearer/3600/user', async () => {
      const res = await request(server()).post('/auth/login').send(creds);
      expect(res.status).toBe(200);
      expect(typeof res.body.accessToken).toBe('string');
      expect(res.body.tokenType).toBe('Bearer');
      expect(res.body.expiresIn).toBe(3600);
      expect(res.body.user.email).toBe('e2e@example.com');
      // AC8
      expect(res.body.user).not.toHaveProperty('passwordHash');
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    });

    it('AC5: 틀린 비밀번호 → 401', async () => {
      const res = await request(server())
        .post('/auth/login')
        .send({ email: 'e2e@example.com', password: 'WrongPass9' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('AC5: 없는 이메일 → 401, 틀린비번과 동일 메시지(존재여부 비노출)', async () => {
      const ghost = await request(server())
        .post('/auth/login')
        .send({ email: 'ghost@example.com', password: 'Password1' });
      const wrong = await request(server())
        .post('/auth/login')
        .send({ email: 'e2e@example.com', password: 'WrongPass9' });
      expect(ghost.status).toBe(401);
      expect(wrong.status).toBe(401);
      expect(ghost.body.message).toBe(wrong.body.message);
    });
  });

  describe('GET /auth/me', () => {
    async function getToken(): Promise<string> {
      const res = await request(server()).post('/auth/login').send(creds);
      return res.body.accessToken as string;
    }

    it('AC6: 토큰 없이 호출 → 401', async () => {
      const res = await request(server()).get('/auth/me');
      expect(res.status).toBe(401);
    });

    it('AC6: 잘못된 토큰 → 401', async () => {
      const res = await request(server())
        .get('/auth/me')
        .set('Authorization', 'Bearer not.a.valid.token');
      expect(res.status).toBe(401);
    });

    it('AC7: 유효 토큰 → 200 + 프로필(passwordHash 제외)', async () => {
      const token = await getToken();
      const res = await request(server())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('e2e@example.com');
      expect(res.body).not.toHaveProperty('passwordHash');
    });
  });

  describe('통합 라운드트립: signup → login → me', () => {
    it('신규 계정 생성 → 로그인 토큰 발급 → 토큰으로 본인 프로필 조회까지 일관', async () => {
      const account = { email: 'roundtrip@example.com', password: 'Password9' };

      const signup = await request(server())
        .post('/auth/signup')
        .send(account);
      expect(signup.status).toBe(201);

      const login = await request(server()).post('/auth/login').send(account);
      expect(login.status).toBe(200);
      const token = login.body.accessToken;

      const me = await request(server())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(me.status).toBe(200);
      // signup 시 발급된 id 와 login.user.id 와 me.id 가 동일 주체.
      expect(me.body.id).toBe(signup.body.id);
      expect(me.body.id).toBe(login.body.user.id);
      expect(me.body.email).toBe('roundtrip@example.com');
    });
  });
});

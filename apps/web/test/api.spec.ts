import { authFetch, ApiError } from '../lib/api';
import { setToken } from '../lib/auth';

/**
 * API 클라이언트(lib/api.ts) authFetch 단위 테스트.
 * fetch 를 mock 하여 계약 에러 포맷 정규화·헤더 부착·성공 언랩을 실행 검증한다.
 *
 * acceptanceCriteria 프론트측 소비 경로:
 *  - AC3 400 message:string[] → messages 배열 유지
 *  - AC5 401 message:string → [msg] 정규화
 *  - AC2 409 message:string → [msg]
 *  - AC7 /me 호출 시 Bearer 자동 부착
 */
/** authFetch 가 reject 하기를 기대하고, 던져진 ApiError 를 반환한다. */
async function expectReject(p: Promise<unknown>): Promise<ApiError> {
  try {
    await p;
    throw new Error('예상과 달리 reject 되지 않고 resolve 됨');
  } catch (e) {
    return e as ApiError;
  }
}

function fakeResponse(status: number, body: unknown, isJson = true) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () =>
      body === undefined ? '' : isJson ? JSON.stringify(body) : String(body),
  } as Response;
}

const mockFetch = jest.fn();

beforeEach(() => {
  window.localStorage.clear();
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
});

describe('authFetch 성공 응답', () => {
  it('unwrapped 본문을 T 로 그대로 반환(.data 언랩 없음)', async () => {
    const user = { id: '1', email: 'a@b.com', createdAt: 'x', updatedAt: 'y' };
    mockFetch.mockResolvedValue(fakeResponse(200, user));
    const res = await authFetch<typeof user>('/auth/me', { method: 'GET' });
    expect(res).toEqual(user);
  });

  it('body 가 있으면 Content-Type: application/json 자동 부착', async () => {
    mockFetch.mockResolvedValue(fakeResponse(201, { id: '1' }));
    await authFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@b.com', password: 'Password1' }),
    });
    const init = mockFetch.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('토큰이 있으면 Authorization: Bearer 자동 부착(AC7 /me)', async () => {
    setToken('jwt.token.xyz');
    mockFetch.mockResolvedValue(fakeResponse(200, { id: '1' }));
    await authFetch('/auth/me', { method: 'GET' });
    const init = mockFetch.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer jwt.token.xyz');
  });

  it('토큰이 없으면 Authorization 미부착', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, { id: '1' }));
    await authFetch('/auth/me', { method: 'GET' });
    const init = mockFetch.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Headers;
    expect(headers.get('Authorization')).toBeNull();
  });
});

describe('authFetch 에러 정규화', () => {
  it('AC3: 400 message:string[] → ApiError.messages 배열 유지 + status 400', async () => {
    mockFetch.mockResolvedValue(
      fakeResponse(400, {
        statusCode: 400,
        message: ['email must be an email', 'password 정책 위반'],
        error: 'Bad Request',
      }),
    );
    const err = await expectReject(authFetch('/auth/signup', {
      method: 'POST',
      body: '{}',
    }));
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.messages).toEqual([
      'email must be an email',
      'password 정책 위반',
    ]);
    expect(err.errorType).toBe('Bad Request');
  });

  it('AC5: 401 message:string → [msg] 정규화 + status 401', async () => {
    mockFetch.mockResolvedValue(
      fakeResponse(401, {
        statusCode: 401,
        message: '이메일 또는 비밀번호가 올바르지 않습니다',
        error: 'Unauthorized',
      }),
    );
    const err = await expectReject(authFetch('/auth/login', {
      method: 'POST',
      body: '{}',
    }));
    expect(err.status).toBe(401);
    expect(err.messages).toEqual(['이메일 또는 비밀번호가 올바르지 않습니다']);
    expect(err.errorType).toBe('Unauthorized');
  });

  it('AC2: 409 message:string → [msg] + status 409', async () => {
    mockFetch.mockResolvedValue(
      fakeResponse(409, {
        statusCode: 409,
        message: '이미 사용 중인 이메일입니다',
        error: 'Conflict',
      }),
    );
    const err = await expectReject(authFetch('/auth/signup', {
      method: 'POST',
      body: '{}',
    }));
    expect(err.status).toBe(409);
    expect(err.messages).toEqual(['이미 사용 중인 이메일입니다']);
    expect(err.errorType).toBe('Conflict');
  });

  it('네트워크 실패(fetch throw) → isNetworkError true, status 0', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
    const err = await expectReject(authFetch('/auth/login', {
      method: 'POST',
      body: '{}',
    }));
    expect(err).toBeInstanceOf(ApiError);
    expect(err.isNetworkError).toBe(true);
    expect(err.status).toBe(0);
  });

  it('계약 포맷이 아닌 에러(5xx 비 JSON) → 상태코드 보존 + 일반 메시지', async () => {
    mockFetch.mockResolvedValue(
      fakeResponse(500, '<html>Internal Server Error</html>', false),
    );
    const err = await expectReject(authFetch('/auth/login', {
      method: 'POST',
      body: '{}',
    }));
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(500);
    expect(err.messages[0]).toContain('오류');
  });
});

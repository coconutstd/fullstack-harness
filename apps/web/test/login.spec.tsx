import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/app/login/page';
import { authFetch, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

/**
 * /login 페이지 로그인 흐름 컴포넌트 테스트 (jsdom).
 * acceptanceCriteria 실행 검증:
 *  - AC10  로그인 성공 → 토큰 저장 + /dashboard 이동
 *  - AC5(프론트)  401 → 존재여부 비노출 전역 에러(필드 구분 없음)
 */
const mockReplace = jest.fn();
const mockPush = jest.fn();

// 실제 next/navigation 처럼 안정된 라우터 참조를 반환.
jest.mock('next/navigation', () => {
  let router: { replace: jest.Mock; push: jest.Mock } | undefined;
  return {
    useRouter: () => (router ??= { replace: mockReplace, push: mockPush }),
    useSearchParams: () => ({ get: () => null }),
  };
});

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return { __esModule: true, ...actual, authFetch: jest.fn() };
});

const mockAuthFetch = authFetch as jest.MockedFunction<typeof authFetch>;

beforeEach(() => {
  window.localStorage.clear();
  mockReplace.mockClear();
  mockPush.mockClear();
  mockAuthFetch.mockReset();
});

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('이메일'), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText('비밀번호'), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole('button', { name: /로그인/ }));
}

it('AC10: 올바른 자격증명 로그인 성공 → 토큰 저장 + /dashboard 이동', async () => {
  mockAuthFetch.mockResolvedValue({
    accessToken: 'jwt.new.token',
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: {
      id: 'u1',
      email: 'user@example.com',
      createdAt: '2026-07-05T12:00:00.000Z',
      updatedAt: '2026-07-05T12:00:00.000Z',
    },
  });

  render(<LoginPage />);
  fillAndSubmit('user@example.com', 'Password1');

  await waitFor(() => {
    expect(mockReplace).toHaveBeenCalledWith('/dashboard');
  });
  // 토큰이 클라이언트에 저장되었는지(AC10).
  expect(getToken()).toBe('jwt.new.token');
  // 로그인 엔드포인트로 정규화된 body 전송.
  expect(mockAuthFetch).toHaveBeenCalledWith(
    '/auth/login',
    expect.objectContaining({ method: 'POST' }),
  );
});

it('M2: 로그인 성공했지만 토큰 저장 실패 → 전역 에러 표시, /dashboard 미이동(무한 루프 방지)', async () => {
  mockAuthFetch.mockResolvedValue({
    accessToken: 'jwt.new.token',
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: {
      id: 'u1',
      email: 'user@example.com',
      createdAt: '2026-07-05T12:00:00.000Z',
      updatedAt: '2026-07-05T12:00:00.000Z',
    },
  });
  // 스토리지 차단 환경 모사: setItem이 예외를 던진다.
  const spy = jest
    .spyOn(Storage.prototype, 'setItem')
    .mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

  render(<LoginPage />);
  fillAndSubmit('user@example.com', 'Password1');

  expect(await screen.findByText(/저장하지 못했습니다/)).toBeInTheDocument();
  expect(mockReplace).not.toHaveBeenCalledWith('/dashboard');
  spy.mockRestore();
});

it('AC5(프론트): 401 → 존재여부 비노출 전역 에러, /dashboard 미이동', async () => {
  mockAuthFetch.mockRejectedValue(
    new ApiError({
      status: 401,
      messages: ['이메일 또는 비밀번호가 올바르지 않습니다'],
      errorType: 'Unauthorized',
    }),
  );

  render(<LoginPage />);
  fillAndSubmit('user@example.com', 'WrongPass9');

  expect(
    await screen.findByText('이메일 또는 비밀번호가 올바르지 않습니다.'),
  ).toBeInTheDocument();
  expect(mockReplace).not.toHaveBeenCalledWith('/dashboard');
  expect(getToken()).toBeNull();
});

import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from '@/app/dashboard/page';
import { authFetch, ApiError } from '@/lib/api';
import { getToken, setToken } from '@/lib/auth';

/**
 * /dashboard 페이지 가드·렌더 컴포넌트 테스트 (jsdom).
 * acceptanceCriteria 실행 검증:
 *  - AC9  미인증(토큰 없음) → /login 리다이렉트, /me 미호출
 *  - AC7/AC10  유효 토큰 → /me 성공 → 프로필(이메일) 표시
 *  - 만료/무효 토큰(401) → 토큰 폐기 + /login
 */
const mockReplace = jest.fn();
const mockPush = jest.fn();

// 실제 next/navigation 처럼 useRouter 는 안정된(동일 참조) 라우터를 반환해야
// useCallback([router]) 이 매 렌더 재생성되지 않는다.
jest.mock('next/navigation', () => {
  let router: { replace: jest.Mock; push: jest.Mock } | undefined;
  return {
    useRouter: () => (router ??= { replace: mockReplace, push: mockPush }),
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

it('AC9: 토큰 없이 /dashboard 진입 → /login 리다이렉트, /me 미호출', async () => {
  render(<DashboardPage />);
  await waitFor(() => {
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });
  expect(mockAuthFetch).not.toHaveBeenCalled();
});

it('AC7/AC10: 유효 토큰 → /me 성공 → 프로필 이메일 표시', async () => {
  setToken('valid.jwt.token');
  mockAuthFetch.mockResolvedValue({
    id: 'u1',
    email: 'user@example.com',
    createdAt: '2026-07-05T12:00:00.000Z',
    updatedAt: '2026-07-05T12:00:00.000Z',
  });

  render(<DashboardPage />);

  expect(await screen.findByText('user@example.com')).toBeInTheDocument();
  // /me 를 호출했고, 인증된 상태에서는 /login 으로 튕기지 않는다.
  expect(mockAuthFetch).toHaveBeenCalledWith('/auth/me', { method: 'GET' });
  expect(mockReplace).not.toHaveBeenCalledWith('/login');
});

it('만료/무효 토큰(401) → 토큰 폐기 + /login 리다이렉트', async () => {
  setToken('expired.jwt.token');
  mockAuthFetch.mockRejectedValue(
    new ApiError({ status: 401, messages: ['Unauthorized'], errorType: 'Unauthorized' }),
  );

  render(<DashboardPage />);

  await waitFor(() => {
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });
  // 폐기되어 더 이상 인증 상태가 아니어야 한다.
  expect(getToken()).toBeNull();
});

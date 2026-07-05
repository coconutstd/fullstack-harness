import {
  getToken,
  setToken,
  clearToken,
  isAuthenticated,
} from '../lib/auth';

/**
 * 클라이언트 토큰 저장/삭제(lib/auth.ts) 단위 테스트 — jsdom localStorage 사용.
 * acceptanceCriteria AC10(로그인 성공 시 토큰 저장) / 로그아웃(토큰 폐기) 근거.
 */
describe('auth token storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('초기 상태: 토큰 없음 → getToken null, 미인증', () => {
    expect(getToken()).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });

  it('setToken 저장 후 getToken 으로 조회 + 인증 상태 true', () => {
    setToken('jwt.abc.123');
    expect(getToken()).toBe('jwt.abc.123');
    expect(isAuthenticated()).toBe(true);
    // 계약상 저장 키 확인.
    expect(window.localStorage.getItem('auth.accessToken')).toBe('jwt.abc.123');
  });

  it('clearToken(로그아웃) → 토큰 폐기 후 미인증', () => {
    setToken('jwt.abc.123');
    clearToken();
    expect(getToken()).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });
});

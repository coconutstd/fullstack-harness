import { getToken, setToken, clearToken } from '../lib/auth';

/**
 * 클라이언트 토큰 저장/삭제(lib/auth.ts) 단위 테스트 — jsdom localStorage 사용.
 * acceptanceCriteria AC10(로그인 성공 시 토큰 저장) / 로그아웃(토큰 폐기) 근거.
 */
describe('auth token storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('초기 상태: 토큰 없음 → getToken null', () => {
    expect(getToken()).toBeNull();
  });

  it('setToken 저장 성공 → true 반환 + getToken 조회 가능', () => {
    expect(setToken('jwt.abc.123')).toBe(true);
    expect(getToken()).toBe('jwt.abc.123');
    // 계약상 저장 키 확인.
    expect(window.localStorage.getItem('auth.accessToken')).toBe('jwt.abc.123');
  });

  it('setToken 저장 실패(스토리지 차단/QuotaExceeded) → false 반환, 예외 미전파(M2)', () => {
    const spy = jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });
    expect(setToken('jwt.abc.123')).toBe(false);
    spy.mockRestore();
  });

  it('clearToken(로그아웃) → 토큰 폐기', () => {
    setToken('jwt.abc.123');
    clearToken();
    expect(getToken()).toBeNull();
  });
});

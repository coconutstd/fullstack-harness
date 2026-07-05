// 클라이언트 토큰 저장/조회/삭제 헬퍼.
// 저장소: localStorage, key: 'auth.accessToken' (계약/정합서 확정).
// 로그아웃은 서버 호출 없이 removeItem으로 토큰 폐기.

const TOKEN_KEY = 'auth.accessToken';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * 토큰 저장. 성공 시 true, 실패 시 false 반환.
 * SSR(window 없음) 또는 localStorage 접근 불가(사파리 프라이빗/QuotaExceeded 등)에서
 * 예외를 삼키지 않고 false로 실패를 알린다 → 호출부가 리다이렉트를 중단하고 사용자에게 통지 가능.
 */
export function setToken(token: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
    return true;
  } catch {
    return false;
  }
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // no-op
  }
}

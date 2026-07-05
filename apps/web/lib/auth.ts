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

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // localStorage 접근 불가 시 조용히 무시(SSR/프라이빗 모드)
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

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

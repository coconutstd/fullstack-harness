'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getToken } from './auth';

/**
 * 게스트 전용 화면(로그인/회원가입)의 리다이렉트 가드.
 * 이미 토큰이 있으면 /dashboard로 보낸다. 정책을 한 곳에서 관리한다(M8).
 * 주의: 토큰 '존재'만 확인하며 서버측 유효성은 대시보드의 /auth/me가 판정한다.
 */
export function useRedirectIfAuthenticated(): void {
  const router = useRouter();
  useEffect(() => {
    if (getToken()) router.replace('/dashboard');
  }, [router]);
}

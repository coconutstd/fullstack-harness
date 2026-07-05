'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import AuthForm from '@/components/AuthForm';
import type { ApiError } from '@/lib/api';
import type { AuthSubmitResult } from '@/lib/useAuthForm';
import { validateSignupPassword } from '@/lib/validation';
import type { User } from '@/lib/types';

export default function SignupPage() {
  // 계약: 201 → User(unwrapped). setToken 미사용 — 화면에 표시하지 않고 /login으로 이동.
  const onSuccess = useCallback(
    (_res: User): AuthSubmitResult => ({
      type: 'redirect',
      to: '/login?signup=success',
    }),
    [],
  );

  // 409(이메일 중복): message는 string. 전역 에러로 표시.
  const mapApiError = useCallback((err: ApiError): string | undefined => {
    if (err.status === 409) return err.messages[0] ?? '이미 사용 중인 이메일입니다.';
    return undefined;
  }, []);

  return (
    <AuthForm<User>
      title="회원가입"
      submitLabel="회원가입"
      submittingLabel="처리 중…"
      passwordAutoComplete="new-password"
      endpoint="/auth/signup"
      validatePassword={validateSignupPassword}
      onSuccess={onSuccess}
      mapApiError={mapApiError}
      footer={<Link href="/login">이미 계정이 있으신가요? 로그인</Link>}
    />
  );
}

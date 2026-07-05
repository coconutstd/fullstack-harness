'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback } from 'react';
import AuthForm from '@/components/AuthForm';
import type { ApiError } from '@/lib/api';
import { setToken } from '@/lib/auth';
import type { AuthSubmitResult } from '@/lib/useAuthForm';
import { validateRequiredPassword } from '@/lib/validation';
import type { AuthTokenResponse } from '@/lib/types';

function LoginForm() {
  const searchParams = useSearchParams();
  const signupSuccess = searchParams.get('signup') === 'success';

  // 계약: 200 → AuthTokenResponse(unwrapped). 최상위 accessToken 소비.
  // 토큰 저장 실패(스토리지 차단) 시 리다이렉트하지 않고 에러를 표시한다(M2, 무한 루프 방지).
  const onSuccess = useCallback((res: AuthTokenResponse): AuthSubmitResult => {
    if (setToken(res.accessToken)) {
      return { type: 'redirect', to: '/dashboard', replace: true };
    }
    return {
      type: 'error',
      message:
        '로그인 상태를 저장하지 못했습니다. 브라우저 저장소 설정(프라이빗 모드 등)을 확인한 뒤 다시 시도해주세요.',
    };
  }, []);

  // 401: 존재 여부 비노출 — 필드 구분 없이 전역 에러.
  const mapApiError = useCallback((err: ApiError): string | undefined => {
    if (err.status === 401) return '이메일 또는 비밀번호가 올바르지 않습니다.';
    return undefined;
  }, []);

  return (
    <AuthForm<AuthTokenResponse>
      title="로그인"
      submitLabel="로그인"
      submittingLabel="로그인 중…"
      passwordAutoComplete="current-password"
      endpoint="/auth/login"
      validatePassword={validateRequiredPassword}
      onSuccess={onSuccess}
      mapApiError={mapApiError}
      footer={<Link href="/signup">계정이 없으신가요? 회원가입</Link>}
      banner={
        signupSuccess ? (
          <div className="form-success" role="status">
            가입 완료. 로그인해주세요.
          </div>
        ) : null
      }
    />
  );
}

export default function LoginPage() {
  // useSearchParams는 Suspense 경계가 필요.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import AuthCard from '@/components/AuthCard';
import FieldError from '@/components/FieldError';
import FormError from '@/components/FormError';
import { ApiError, authFetch } from '@/lib/api';
import { getToken, setToken } from '@/lib/auth';
import {
  normalizeEmail,
  validateEmail,
  validateRequiredPassword,
} from '@/lib/validation';
import type { AuthTokenResponse, LoginRequest } from '@/lib/types';

type Status = 'idle' | 'submitting' | 'error';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signupSuccess = searchParams.get('signup') === 'success';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [globalError, setGlobalError] = useState<string | undefined>();
  const [status, setStatus] = useState<Status>('idle');

  // 이미 로그인된 사용자는 대시보드로.
  useEffect(() => {
    if (getToken()) router.replace('/dashboard');
  }, [router]);

  const submitting = status === 'submitting';

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGlobalError(undefined);

    const emailMsg = validateEmail(email);
    const passwordMsg = validateRequiredPassword(password);
    setEmailError(emailMsg);
    setPasswordError(passwordMsg);
    if (emailMsg || passwordMsg) return;

    setStatus('submitting');
    const body: LoginRequest = {
      email: normalizeEmail(email),
      password,
    };

    try {
      // 계약: 200 → AuthTokenResponse(unwrapped). 최상위 accessToken 소비.
      const res = await authFetch<AuthTokenResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setToken(res.accessToken);
      router.replace('/dashboard');
    } catch (err) {
      setStatus('error');
      if (err instanceof ApiError) {
        if (err.status === 401) {
          // 401: 존재 여부 비노출 — 필드 구분 없이 전역 에러.
          setGlobalError('이메일 또는 비밀번호가 올바르지 않습니다.');
        } else if (err.status === 400) {
          setGlobalError(err.messages.join(' · ') || '입력값을 확인해주세요.');
        } else {
          setGlobalError('잠시 후 다시 시도해주세요.');
        }
      } else {
        setGlobalError('잠시 후 다시 시도해주세요.');
      }
    }
  }

  return (
    <AuthCard
      title="로그인"
      footer={<Link href="/signup">계정이 없으신가요? 회원가입</Link>}
    >
      <form onSubmit={handleSubmit} noValidate>
        {signupSuccess ? (
          <div className="form-success" role="status">
            가입 완료. 로그인해주세요.
          </div>
        ) : null}
        <FormError message={globalError} />

        <div className="form-field">
          <label htmlFor="email">이메일</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            disabled={submitting}
            onChange={(e) => setEmail(e.target.value)}
          />
          <FieldError message={emailError} />
        </div>

        <div className="form-field">
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            disabled={submitting}
            onChange={(e) => setPassword(e.target.value)}
          />
          <FieldError message={passwordError} />
        </div>

        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? (
            <>
              <span className="spinner" aria-hidden="true" />
              로그인 중…
            </>
          ) : (
            '로그인'
          )}
        </button>
      </form>
    </AuthCard>
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

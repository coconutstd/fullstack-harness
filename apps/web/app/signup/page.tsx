'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import AuthCard from '@/components/AuthCard';
import FieldError from '@/components/FieldError';
import FormError from '@/components/FormError';
import { ApiError, authFetch } from '@/lib/api';
import { getToken } from '@/lib/auth';
import {
  normalizeEmail,
  validateEmail,
  validateSignupPassword,
} from '@/lib/validation';
import type { SignupRequest, User } from '@/lib/types';

type Status = 'idle' | 'submitting' | 'error';

export default function SignupPage() {
  const router = useRouter();
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
    const passwordMsg = validateSignupPassword(password);
    setEmailError(emailMsg);
    setPasswordError(passwordMsg);
    if (emailMsg || passwordMsg) return;

    setStatus('submitting');
    const body: SignupRequest = {
      email: normalizeEmail(email),
      password,
    };

    try {
      // 계약: 201 → User(unwrapped). 화면에서 직접 표시하지 않고 /login으로 이동.
      await authFetch<User>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      router.push('/login?signup=success');
    } catch (err) {
      setStatus('error');
      if (err instanceof ApiError) {
        if (err.status === 409) {
          // 409(이메일 중복): message는 string. 전역 에러로 표시.
          setGlobalError(err.messages[0] ?? '이미 사용 중인 이메일입니다.');
        } else if (err.status === 400) {
          // 400(검증): message는 string[]. 정합서 확정대로 전역 에러 영역에 표시.
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
      title="회원가입"
      footer={<Link href="/login">이미 계정이 있으신가요? 로그인</Link>}
    >
      <form onSubmit={handleSubmit} noValidate>
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
            autoComplete="new-password"
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
              처리 중…
            </>
          ) : (
            '회원가입'
          )}
        </button>
      </form>
    </AuthCard>
  );
}

'use client';

import type { ReactNode } from 'react';
import AuthCard from './AuthCard';
import FieldError from './FieldError';
import FormError from './FormError';
import { useAuthForm, type UseAuthFormOptions } from '@/lib/useAuthForm';

/**
 * 로그인/회원가입 공통 폼 UI + 로직(M5). 상태·게스트 가드·제출·에러 분기는 useAuthForm에 위임하고,
 * 화면별 문구/autoComplete/검증/엔드포인트/성공 라우팅/특이 에러만 props로 주입받는다.
 * banner는 로그인의 signup=success 배너처럼 화면 고유 요소를 폼 상단에 끼우는 슬롯.
 */
interface AuthFormProps<TResponse> extends UseAuthFormOptions<TResponse> {
  title: string;
  submitLabel: string;
  submittingLabel: string;
  passwordAutoComplete: 'current-password' | 'new-password';
  footer: ReactNode;
  banner?: ReactNode;
}

export default function AuthForm<TResponse>({
  title,
  submitLabel,
  submittingLabel,
  passwordAutoComplete,
  footer,
  banner,
  ...options
}: AuthFormProps<TResponse>) {
  const {
    email,
    setEmail,
    password,
    setPassword,
    emailError,
    passwordError,
    globalError,
    submitting,
    handleSubmit,
  } = useAuthForm<TResponse>(options);

  return (
    <AuthCard title={title} footer={footer}>
      <form onSubmit={handleSubmit} noValidate>
        {banner}
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
            autoComplete={passwordAutoComplete}
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
              {submittingLabel}
            </>
          ) : (
            submitLabel
          )}
        </button>
      </form>
    </AuthCard>
  );
}

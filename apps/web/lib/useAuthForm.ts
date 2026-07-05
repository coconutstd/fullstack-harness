'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, type FormEvent } from 'react';
import { ApiError, authFetch } from './api';
import { normalizeEmail, validateEmail } from './validation';
import { useRedirectIfAuthenticated } from './useRedirectIfAuthenticated';

/**
 * onSuccess가 성공 응답을 소비한 뒤 반환하는 후처리 결과.
 * - redirect: 지정 경로로 이동(replace=true면 히스토리 대체).
 * - error: 성공 응답을 받았지만 후처리(예: 토큰 저장) 실패 → 리다이렉트 중단하고 전역 에러 표시(M2).
 */
export type AuthSubmitResult =
  | { type: 'redirect'; to: string; replace?: boolean }
  | { type: 'error'; message: string };

type Status = 'idle' | 'submitting' | 'error';

export interface UseAuthFormOptions<TResponse> {
  /** POST 대상 엔드포인트(계약 경로). 예: '/auth/login' | '/auth/signup'. */
  endpoint: string;
  /** 비밀번호 검증 규칙(로그인=존재만, 회원가입=강도). */
  validatePassword: (password: string) => string | undefined;
  /**
   * 성공 응답(계약 shape TResponse)을 소비하고 다음 행동을 결정.
   * 로그인은 여기서 setToken을 호출하고 실패 시 { type:'error' }를 반환한다.
   */
  onSuccess: (res: TResponse) => AuthSubmitResult;
  /**
   * 화면 특이 상태코드 처리(로그인 401 / 회원가입 409).
   * 처리한 메시지를 반환하면 그것을 전역 에러로 표시, undefined면 기본 처리(400/기타)로 넘어간다.
   */
  mapApiError?: (err: ApiError) => string | undefined;
}

export interface UseAuthFormResult {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  emailError: string | undefined;
  passwordError: string | undefined;
  globalError: string | undefined;
  submitting: boolean;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
}

/**
 * 로그인/회원가입 공통 폼 로직(M5). 상태 6종 · 게스트 가드 · 제출 골격 · 에러 분기를 단일화한다.
 * 응답 타입 차이(AuthTokenResponse vs User)와 성공 라우팅/특이 에러는 옵션 콜백으로 주입.
 */
export function useAuthForm<TResponse>({
  endpoint,
  validatePassword,
  onSuccess,
  mapApiError,
}: UseAuthFormOptions<TResponse>): UseAuthFormResult {
  const router = useRouter();
  useRedirectIfAuthenticated();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [globalError, setGlobalError] = useState<string | undefined>();
  const [status, setStatus] = useState<Status>('idle');

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setGlobalError(undefined);

      const emailMsg = validateEmail(email);
      const passwordMsg = validatePassword(password);
      setEmailError(emailMsg);
      setPasswordError(passwordMsg);
      if (emailMsg || passwordMsg) return;

      setStatus('submitting');
      // 계약 body shape: { email, password } (양 엔드포인트 동일).
      const body = { email: normalizeEmail(email), password };

      try {
        const res = await authFetch<TResponse>(endpoint, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        const outcome = onSuccess(res);
        if (outcome.type === 'redirect') {
          if (outcome.replace) router.replace(outcome.to);
          else router.push(outcome.to);
          return;
        }
        // 성공 응답 후처리 실패(예: 토큰 저장 실패) → 리다이렉트 중단, 에러 표시(M2).
        setGlobalError(outcome.message);
        setStatus('error');
      } catch (err) {
        setStatus('error');
        if (err instanceof ApiError) {
          const custom = mapApiError?.(err);
          if (custom !== undefined) {
            setGlobalError(custom);
          } else if (err.status === 400) {
            setGlobalError(err.messages.join(' · ') || '입력값을 확인해주세요.');
          } else {
            setGlobalError('잠시 후 다시 시도해주세요.');
          }
        } else {
          setGlobalError('잠시 후 다시 시도해주세요.');
        }
      }
    },
    [email, password, endpoint, validatePassword, onSuccess, mapApiError, router],
  );

  return {
    email,
    setEmail,
    password,
    setPassword,
    emailError,
    passwordError,
    globalError,
    submitting: status === 'submitting',
    handleSubmit,
  };
}

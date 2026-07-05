'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import AuthCard from '@/components/AuthCard';
import ErrorView from '@/components/ErrorView';
import LoadingView from '@/components/LoadingView';
import LogoutButton from '@/components/LogoutButton';
import ProfileCard from '@/components/ProfileCard';
import { ApiError, authFetch } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';
import type { User } from '@/lib/types';

type Status = 'loading' | 'error' | 'success';

export default function DashboardPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const loadProfile = useCallback(async () => {
    // 클라이언트 가드: 토큰 없으면 즉시 /login.
    if (!getToken()) {
      router.replace('/login');
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    try {
      // 계약: 200 → User(unwrapped). authFetch가 Bearer 자동 부착.
      const me = await authFetch<User>('/auth/me', { method: 'GET' });
      setUser(me);
      setStatus('success');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // 만료/무효 토큰: 폐기 후 /login (에러 화면 없이).
        clearToken();
        router.replace('/login');
        return;
      }
      setErrorMessage('프로필을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      setStatus('error');
    }
  }, [router]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleLogout = useCallback(() => {
    clearToken();
    router.replace('/login');
  }, [router]);

  return (
    <AuthCard title="대시보드">
      {status === 'loading' ? <LoadingView label="프로필 불러오는 중…" /> : null}

      {status === 'error' ? (
        <ErrorView message={errorMessage} onRetry={() => void loadProfile()} />
      ) : null}

      {status === 'success' && user ? (
        <>
          <ProfileCard email={user.email} createdAt={user.createdAt} />
          <div className="dashboard-actions">
            <LogoutButton onLogout={handleLogout} />
          </div>
        </>
      ) : null}
    </AuthCard>
  );
}

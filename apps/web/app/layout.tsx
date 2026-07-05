import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: '인증 데모',
  description: '이메일/비밀번호 기반 인증 (회원가입 · 로그인 · 세션)',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <main className="app-shell">{children}</main>
      </body>
    </html>
  );
}

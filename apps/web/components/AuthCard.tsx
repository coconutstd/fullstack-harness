import type { ReactNode } from 'react';

interface AuthCardProps {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

// 인증 화면 공통 카드 레이아웃(제목 + 폼 슬롯 + 하단 링크).
export default function AuthCard({ title, children, footer }: AuthCardProps) {
  return (
    <div className="auth-card">
      <h1 className="auth-card__title">{title}</h1>
      <div className="auth-card__body">{children}</div>
      {footer ? <div className="auth-card__footer">{footer}</div> : null}
    </div>
  );
}

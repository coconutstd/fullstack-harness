'use client';

interface LogoutButtonProps {
  onLogout: () => void;
}

// 클릭 시 상위에서 토큰 폐기 + /login 이동을 수행.
export default function LogoutButton({ onLogout }: LogoutButtonProps) {
  return (
    <button type="button" className="btn btn--secondary" onClick={onLogout}>
      로그아웃
    </button>
  );
}

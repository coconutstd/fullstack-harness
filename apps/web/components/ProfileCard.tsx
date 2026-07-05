interface ProfileCardProps {
  email: string;
  createdAt?: string;
}

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// 회원 프로필 표시(이메일 주 표시, 가입일 보조).
export default function ProfileCard({ email, createdAt }: ProfileCardProps) {
  const joined = formatDate(createdAt);
  return (
    <div className="profile-card">
      <div className="profile-card__row">
        <span className="profile-card__label">이메일</span>
        <span className="profile-card__value">{email}</span>
      </div>
      {joined ? (
        <div className="profile-card__row">
          <span className="profile-card__label">가입일</span>
          <span className="profile-card__value">{joined}</span>
        </div>
      ) : null}
    </div>
  );
}

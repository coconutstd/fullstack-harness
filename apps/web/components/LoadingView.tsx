interface LoadingViewProps {
  label?: string;
}

// 스피너/스켈레톤 대체 로딩 뷰.
export default function LoadingView({ label = '불러오는 중…' }: LoadingViewProps) {
  return (
    <div className="loading-view" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

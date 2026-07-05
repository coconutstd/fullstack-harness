interface ErrorViewProps {
  message: string;
  onRetry?: () => void;
}

// 네트워크/서버 에러 표시 + 재시도.
export default function ErrorView({ message, onRetry }: ErrorViewProps) {
  return (
    <div className="error-view" role="alert">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="btn btn--secondary" onClick={onRetry}>
          다시 시도
        </button>
      ) : null}
    </div>
  );
}

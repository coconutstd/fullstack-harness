interface FormErrorProps {
  message?: string;
}

// 폼 상단 전역 에러 배너. 빈 값이면 렌더하지 않음.
export default function FormError({ message }: FormErrorProps) {
  if (!message) return null;
  return (
    <div className="form-error" role="alert">
      {message}
    </div>
  );
}

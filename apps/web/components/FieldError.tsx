interface FieldErrorProps {
  message?: string;
}

// 인풋 하단 필드별 에러 메시지. 빈 값이면 렌더하지 않음.
export default function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p className="field-error" role="alert">
      {message}
    </p>
  );
}

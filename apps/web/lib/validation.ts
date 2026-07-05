// 클라이언트 폼 검증 규칙(ui_spec 기준). 서버 검증(계약 400)의 선차단 목적.

// RFC 이메일 형식(실용 근사).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 최소 1 문자 + 1 숫자.
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): string | undefined {
  const value = email.trim();
  if (value.length === 0) return '이메일을 입력하세요.';
  if (!EMAIL_REGEX.test(value)) return '올바른 이메일 형식이 아닙니다.';
  return undefined;
}

// signup용: 최소 8자 + 문자1 + 숫자1
export function validateSignupPassword(password: string): string | undefined {
  if (password.length === 0) return '비밀번호를 입력하세요.';
  if (password.length < 8) return '비밀번호는 최소 8자입니다.';
  if (!PASSWORD_PATTERN.test(password))
    return '문자와 숫자를 각각 1자 이상 포함해야 합니다.';
  return undefined;
}

// login용: 존재 여부만 검증(정책은 서버가 판정, 401은 전역 처리)
export function validateRequiredPassword(password: string): string | undefined {
  if (password.length === 0) return '비밀번호를 입력하세요.';
  return undefined;
}

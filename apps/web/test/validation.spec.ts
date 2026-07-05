import {
  normalizeEmail,
  validateEmail,
  validateSignupPassword,
  validateRequiredPassword,
} from '../lib/validation';

/**
 * 프론트 폼 검증 규칙(lib/validation.ts) 단위 테스트.
 * 서버 400(계약)의 클라이언트 선차단 로직을 실행 검증.
 * acceptanceCriteria AC3(형식/정책) 의 프론트측 게이트.
 */
describe('normalizeEmail', () => {
  it('trim + 소문자 정규화(서버 정규화와 일치)', () => {
    expect(normalizeEmail('  USER@Example.COM  ')).toBe('user@example.com');
  });
});

describe('validateEmail', () => {
  it('유효한 이메일 → undefined(에러 없음)', () => {
    expect(validateEmail('user@example.com')).toBeUndefined();
  });
  it('빈 값 → 입력 요구 메시지', () => {
    expect(validateEmail('   ')).toBe('이메일을 입력하세요.');
  });
  it.each(['not-an-email', 'user@', '@example.com', 'user @example.com'])(
    '형식 오류 "%s" → 형식 에러',
    (bad) => {
      expect(validateEmail(bad)).toBe('올바른 이메일 형식이 아닙니다.');
    },
  );
});

describe('validateSignupPassword', () => {
  it('8자+문자+숫자 → 통과', () => {
    expect(validateSignupPassword('Password1')).toBeUndefined();
  });
  it('빈 값 → 입력 요구', () => {
    expect(validateSignupPassword('')).toBe('비밀번호를 입력하세요.');
  });
  it('8자 미만 → 길이 에러', () => {
    expect(validateSignupPassword('Pw1')).toBe('비밀번호는 최소 8자입니다.');
  });
  it('숫자 없음 → 구성 에러', () => {
    expect(validateSignupPassword('PasswordOnly')).toBe(
      '문자와 숫자를 각각 1자 이상 포함해야 합니다.',
    );
  });
  it('문자 없음 → 구성 에러', () => {
    expect(validateSignupPassword('12345678')).toBe(
      '문자와 숫자를 각각 1자 이상 포함해야 합니다.',
    );
  });
  it('서버 정책(정규식)과 동일 경계: 정확히 8자 문자+숫자 통과', () => {
    expect(validateSignupPassword('abcdefg1')).toBeUndefined();
  });
});

describe('validateRequiredPassword (login)', () => {
  it('비어있지 않으면 통과(정책 재검증 없음 — 401 은닉 정책)', () => {
    expect(validateRequiredPassword('x')).toBeUndefined();
  });
  it('빈 값 → 입력 요구', () => {
    expect(validateRequiredPassword('')).toBe('비밀번호를 입력하세요.');
  });
});

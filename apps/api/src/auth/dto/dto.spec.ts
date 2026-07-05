import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';
import { SignupDto } from './signup.dto';

/**
 * DTO 검증 단위 테스트 (DB 불필요).
 * class-validator 규칙을 Nest ValidationPipe 와 동일하게 plainToInstance + validate 로 실행.
 *
 * acceptanceCriteria 매핑:
 *  - AC3 형식 틀린 이메일 / 약한 비밀번호 → 400(필드별 위반)
 */
async function violations<T extends object>(
  cls: new () => T,
  payload: Record<string, unknown>,
): Promise<string[]> {
  const dto = plainToInstance(cls, payload);
  const errors = await validate(dto as object);
  // 필드별 위반 제약 이름 목록으로 평탄화.
  return errors.flatMap((e) => Object.keys(e.constraints ?? {}));
}

describe('SignupDto', () => {
  it('유효한 이메일+비밀번호는 위반이 없다', async () => {
    expect(
      await violations(SignupDto, {
        email: 'user@example.com',
        password: 'Password1',
      }),
    ).toHaveLength(0);
  });

  it('AC3: 형식이 틀린 이메일은 isEmail 위반', async () => {
    const v = await violations(SignupDto, {
      email: 'not-an-email',
      password: 'Password1',
    });
    expect(v).toContain('isEmail');
  });

  it('AC3: 8자 미만 비밀번호는 minLength 위반', async () => {
    const v = await violations(SignupDto, {
      email: 'user@example.com',
      password: 'Pw1',
    });
    expect(v).toContain('minLength');
  });

  it('AC3: 숫자 없는 비밀번호는 matches(정책) 위반', async () => {
    const v = await violations(SignupDto, {
      email: 'user@example.com',
      password: 'PasswordOnly',
    });
    expect(v).toContain('matches');
  });

  it('AC3: 문자 없는 비밀번호는 matches(정책) 위반', async () => {
    const v = await violations(SignupDto, {
      email: 'user@example.com',
      password: '12345678',
    });
    expect(v).toContain('matches');
  });

  it('M6: 72자 초과 비밀번호는 maxLength 위반(bcrypt 72바이트 잘림 방지)', async () => {
    const v = await violations(SignupDto, {
      email: 'user@example.com',
      password: 'Aa1' + 'x'.repeat(70), // 73자
    });
    expect(v).toContain('maxLength');
  });

  it('M6: 72자 비밀번호는 통과한다(경계값)', async () => {
    const v = await violations(SignupDto, {
      email: 'user@example.com',
      password: 'Aa1' + 'x'.repeat(69), // 정확히 72자
    });
    expect(v).toHaveLength(0);
  });

  it('@Transform 이 이메일을 소문자+trim 정규화한다', () => {
    const dto = plainToInstance(SignupDto, {
      email: '  USER@Example.COM  ',
      password: 'Password1',
    });
    expect(dto.email).toBe('user@example.com');
  });

  it('email/password 누락 시 위반이 발생한다(400 근거)', async () => {
    const v = await violations(SignupDto, {});
    expect(v.length).toBeGreaterThan(0);
  });
});

describe('LoginDto', () => {
  it('유효한 이메일+비밀번호는 위반이 없다', async () => {
    expect(
      await violations(LoginDto, {
        email: 'user@example.com',
        password: 'anything',
      }),
    ).toHaveLength(0);
  });

  it('약한 비밀번호라도 로그인 DTO 는 정책을 재검증하지 않는다(비어있지만 않으면 통과)', async () => {
    // 로그인은 자격증명 불일치를 401 로 은닉 → DTO 단계에서 정책 위반을 노출하지 않는다.
    expect(
      await violations(LoginDto, { email: 'user@example.com', password: 'x' }),
    ).toHaveLength(0);
  });

  it('빈 비밀번호는 isNotEmpty 위반', async () => {
    const v = await violations(LoginDto, {
      email: 'user@example.com',
      password: '',
    });
    expect(v).toContain('isNotEmpty');
  });

  it('형식이 틀린 이메일은 isEmail 위반', async () => {
    const v = await violations(LoginDto, {
      email: 'bad',
      password: 'anything',
    });
    expect(v).toContain('isEmail');
  });
});

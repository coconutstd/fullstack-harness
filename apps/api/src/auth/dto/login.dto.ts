import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * POST /auth/login 요청 body 검증.
 * - email: 이메일 형식 + 소문자 정규화.
 * - password: 비어있지 않은 문자열(정책 재검증은 하지 않음 — 자격증명 불일치는 401 로 은닉).
 * body 형식 오류(누락 등)는 400, 자격증명 불일치는 서비스에서 401.
 */
export class LoginDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

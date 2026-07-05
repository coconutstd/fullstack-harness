import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

/**
 * POST /auth/signup 요청 body 검증.
 * - email: RFC 이메일 형식. 서버에서 소문자 정규화(+trim).
 * - password: 최소 8자, 최소 1 문자 + 1 숫자.
 * 위반 시 Nest ValidationPipe 가 400 { statusCode, message: string[], error: "Bad Request" } 반환.
 */
export class SignupDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, {
    message: 'password는 최소 8자, 문자와 숫자를 포함해야 합니다',
  })
  password!: string;
}

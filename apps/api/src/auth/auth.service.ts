import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import {
  AuthTokenResponse,
  JwtPayload,
  UserResponse,
  toUserResponse,
} from './user.types';

const BCRYPT_COST = 10;
/** 계약: JWT 만료 1h → 응답 expiresIn = 3600(초). 서명 만료도 동일 상수에서 파생. */
const EXPIRES_IN_SECONDS = 3600;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * 회원가입. 이메일 소문자 정규화 + bcrypt 해시 저장. 토큰 미발급.
   * 이메일 중복(P2002) → 409. 반환: 계약 User(passwordHash 제외).
   */
  async signup(dto: SignupDto): Promise<UserResponse> {
    const email = dto.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

    try {
      const user = await this.prisma.user.create({
        data: { email, passwordHash },
        select: { id: true, email: true, createdAt: true, updatedAt: true },
      });
      return toUserResponse(user);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('이미 사용 중인 이메일입니다');
      }
      throw err;
    }
  }

  /**
   * 로그인. 자격증명 검증 후 JWT 발급.
   * 없는 이메일/틀린 비밀번호 모두 동일 401 메시지 → 계정 존재 여부 비노출.
   * 반환: { accessToken, tokenType:"Bearer", expiresIn:3600, user }.
   */
  async login(dto: LoginDto): Promise<AuthTokenResponse> {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const passwordMatches =
      user !== null && (await bcrypt.compare(dto.password, user.passwordHash));

    if (!user || !passwordMatches) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다',
      );
    }

    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: EXPIRES_IN_SECONDS,
      user: toUserResponse(user),
    };
  }
}

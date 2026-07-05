import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { resolveJwtSecret } from './auth.constants';
import { JwtPayload, UserResponse, toUserResponse } from './user.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['HS256'],
      secretOrKey: resolveJwtSecret(config),
    });
  }

  /**
   * 토큰 서명·만료 검증 통과 후 호출. payload.sub 로 실제 사용자 조회.
   * 없으면 401. 반환값이 request.user 가 되며, 이미 계약 User shape 이다(passwordHash 미포함).
   */
  async validate(payload: JwtPayload): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, createdAt: true, updatedAt: true },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return toUserResponse(user);
  }
}

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * GET /auth/me 보호 가드.
 * 토큰 없음/만료/서명오류 시 passport 가 401 { statusCode:401, message:"Unauthorized", error:"Unauthorized" } 반환.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

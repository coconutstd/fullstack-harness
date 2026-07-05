import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import { UserResponse } from './user.types';

/**
 * JwtStrategy.validate 가 반환한 request.user(계약 User shape)를 주입.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserResponse => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as UserResponse;
  },
);

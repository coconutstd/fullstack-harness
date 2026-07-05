import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // 브루트포스 방어: IP 단위 전역 속도 제한(기본 60req/분). 초과 시 429.
    // 로그인/회원가입은 컨트롤러에서 @Throttle 로 더 엄격히 재정의한다.
    // 테스트(NODE_ENV=test)에서는 계약 검증에 방해되지 않도록 스킵한다.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 60 }],
      skipIf: () => process.env.NODE_ENV === 'test',
    }),
    PrismaModule,
    AuthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

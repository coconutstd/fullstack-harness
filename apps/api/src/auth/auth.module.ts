import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { EXPIRES_IN_SECONDS, resolveJwtSecret } from './auth.constants';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: resolveJwtSecret(config),
        // 계약: HS256, 만료 = EXPIRES_IN_SECONDS(초). 정수는 초로 해석되어
        // 응답 expiresIn 과 실제 서명 TTL 이 단일 상수에서 함께 파생된다.
        signOptions: { algorithm: 'HS256', expiresIn: EXPIRES_IN_SECONDS },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // 전역 검증: whitelist(허용 필드만) + transform(DTO 인스턴스화/타입 변환).
  // class-validator 위반 시 Nest 기본 ValidationPipe 가 400 { statusCode, message: string[], error: "Bad Request" } 반환.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // CORS: Next.js 프론트 origin 허용. 미설정 시 브라우저 호출이 전부 차단됨.
  const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  app.enableCors({
    origin: webOrigin,
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://localhost:${port} (CORS origin: ${webOrigin})`);
}

void bootstrap();

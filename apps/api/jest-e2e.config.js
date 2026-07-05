/**
 * 백엔드 e2e 테스트 설정 (supertest).
 * PrismaService 를 인메모리 fake 로 override 하여 실제 HTTP 스택
 * (전역 ValidationPipe · JwtAuthGuard · 예외 필터 · 컨트롤러)을 DB 없이 구동한다.
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'test',
  testRegex: '.e2e-spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }],
  },
  testEnvironment: 'node',
};

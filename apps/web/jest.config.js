/**
 * 프론트 로직·컴포넌트 테스트 설정.
 * jsdom 환경(window/localStorage/DOM 제공)에서 lib/* 로직과 페이지 가드/라우팅을 실행 검증한다.
 */
module.exports = {
  testEnvironment: 'jsdom',
  rootDir: 'test',
  testRegex: '\\.spec\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      { tsconfig: '<rootDir>/../tsconfig.jest.json' },
    ],
  },
};

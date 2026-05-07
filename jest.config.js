module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/',        // Playwright E2E — 건드리지 않는다
    '/functions/',    // Cloud Functions — 자체 jest 설정 사용
    '/.expo/',
    '/.worktrees/', // 버려진 worktree의 stale 테스트 제외
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^react-native-reanimated$': '<rootDir>/__mocks__/react-native-reanimated.js',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|expo-modules-core|@unimodules/.*|unimodules|sentry-expo|native-base|react-navigation|@react-navigation/.*|@sentry/.*)',
  ],
};

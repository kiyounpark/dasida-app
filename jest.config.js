module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/',        // Playwright E2E — 건드리지 않는다
    '/functions/',    // Cloud Functions — 자체 jest 설정 사용
    '/.expo/',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|expo-modules-core|@unimodules/.*|unimodules|sentry-expo|native-base|react-navigation|@react-navigation/.*|@sentry/.*)',
  ],
};

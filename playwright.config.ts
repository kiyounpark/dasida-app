import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:8081',
    launchOptions: {
      slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
    },
  },
  webServer: {
    // 에뮬레이터 모드: --clear로 Metro 캐시 초기화 + EXPO_NO_DOTENV 상속
    // EXPO_NO_DOTENV=1은 playwright.config.ts에서 process.env에 설정되어 자식 프로세스로 상속됨
    command: process.env.FIREBASE_EMULATOR_TESTS === 'true'
      ? 'npx expo start --web --clear'
      : 'npx expo start --web',
    url: 'http://localhost:8081',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

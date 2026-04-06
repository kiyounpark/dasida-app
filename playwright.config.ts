import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

// FIREBASE_EMULATOR_TESTS=true 일 때만 .env.playwright 로드
// 일반 테스트 실행에는 영향 없음
if (process.env.FIREBASE_EMULATOR_TESTS === 'true') {
  dotenv.config({ path: '.env.playwright' });
  // Expo가 .env를 자동으로 로드하지 않도록 설정
  // (.env의 production URL이 .env.playwright의 에뮬레이터 URL을 덮어쓰는 것 방지)
  process.env.EXPO_NO_DOTENV = '1';
}

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
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

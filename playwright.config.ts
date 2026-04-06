import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

// FIREBASE_EMULATOR_TESTS=true 일 때만 .env.playwright 로드
// 일반 테스트 실행에는 영향 없음
if (process.env.FIREBASE_EMULATOR_TESTS === 'true') {
  dotenv.config({ path: '.env.playwright' });
}

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:8081',
  },
  webServer: {
    command: 'npx expo start --web',
    url: 'http://localhost:8081',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});

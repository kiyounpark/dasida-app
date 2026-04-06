import admin from 'firebase-admin';

const TEST_EMAIL = 'test@emulator.local';
const TEST_PASSWORD = 'testpass123';

async function globalSetup() {
  // 에뮬레이터 모드가 아니면 아무것도 하지 않음
  // — 일반 `npx playwright test` 실행에 영향 없음
  if (process.env.FIREBASE_EMULATOR_TESTS !== 'true') {
    return;
  }

  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

  if (admin.apps.length === 0) {
    admin.initializeApp({ projectId: 'dasida-app' });
  }

  try {
    await admin.auth().createUser({ email: TEST_EMAIL, password: TEST_PASSWORD });
  } catch {
    // 이미 존재하면 무시 (에뮬레이터 재시작 없이 재실행할 때)
  }
}

export default globalSetup;

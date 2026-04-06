import admin from 'firebase-admin';

const TEST_EMAIL = 'test@emulator.local';
const PROJECT_ID = 'dasida-app';

let adminReady = false;

function ensureAdmin() {
  if (adminReady) return;
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  if (admin.apps.length === 0) {
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  adminReady = true;
}

/**
 * 테스트 계정의 Firebase ID 토큰과 accountKey를 반환한다.
 * Admin SDK 커스텀 토큰 → Auth 에뮬레이터 REST API로 ID 토큰 교환.
 */
export async function getTestUserCredentials(): Promise<{ idToken: string; accountKey: string }> {
  ensureAdmin();
  const user = await admin.auth().getUserByEmail(TEST_EMAIL);
  const customToken = await admin.auth().createCustomToken(user.uid);

  // Auth 에뮬레이터 REST API로 커스텀 토큰을 ID 토큰으로 교환
  const resp = await fetch(
    `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );

  if (!resp.ok) {
    throw new Error(`Auth emulator token exchange failed: ${resp.status}`);
  }

  const { idToken } = (await resp.json()) as { idToken: string };
  return { idToken, accountKey: `user:${user.uid}` };
}

/**
 * Firestore 컬렉션의 모든 문서를 반환한다.
 * path 예시: 'users/user:abc123/attempts'
 */
export async function readFirestoreCollection(collectionPath: string): Promise<unknown[]> {
  ensureAdmin();
  const snap = await admin.firestore().collection(collectionPath).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

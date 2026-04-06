# Firebase Emulator 통합 설계

**날짜:** 2026-04-06  
**범위:** Auth + Functions + Firestore 에뮬레이터 + Playwright Firestore 검증

---

## 배경

현재 Playwright E2E 테스트는 AsyncStorage 경로만 검증한다. Cloud Functions → Firestore 저장 경로를 검증하려면 Firebase 에뮬레이터 스택이 필요하다.

기존 `review-session.spec.ts`는 dev-guest(로컬 익명) 세션으로 동작해 Firebase를 전혀 거치지 않는다. 이번 설계는 Firebase 인증 세션으로 진단 퀴즈를 완료했을 때 Firestore에 실제로 데이터가 저장되는지 검증하는 새 테스트 레이어를 추가한다.

---

## 아키텍처

```
Playwright (globalSetup)
  → firebase-admin (Admin SDK)
      → Auth Emulator :9099  (테스트 계정 생성)
      → Firestore Emulator :8080 (저장 결과 직접 읽기)

Playwright (test)
  → Expo Web App (localhost:8081)
      → Firebase Auth Emulator :9099 (이메일/비밀번호 로그인)
      → Functions Emulator :5001 (HTTP Cloud Functions)
          → Firestore Emulator :8080 (기록 저장)
```

**웹 환경 특이사항:** Playwright는 웹 빌드로 실행된다. 웹에서는 `profileStore`가 `LocalLearnerProfileStore`이므로 클라이언트가 Firestore에 직접 접근하지 않는다. Firestore 클라이언트 연결(`connectFirestoreEmulator`)은 불필요하다 — Cloud Functions이 Admin SDK로 Firestore 에뮬레이터에 쓴다.

---

## 섹션 1: Emulator 설정

### `firebase.json`

```json
"emulators": {
  "auth":      { "port": 9099, "host": "127.0.0.1" },
  "functions": { "port": 5001, "host": "127.0.0.1" },
  "firestore": { "port": 8080, "host": "127.0.0.1" },
  "ui":        { "enabled": true, "port": 4000 }
}
```

에뮬레이터 실행 명령: `firebase emulators:start` (UI: http://localhost:4000)

---

## 섹션 2: 앱 Auth 에뮬레이터 연결

### `constants/env.ts`

```ts
export const useFirebaseEmulator = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true';
```

### `features/auth/firebase-app.ts`

`getFirebaseAuthInstance()` 안에서 `cachedFirebaseAuth` 생성 직후:

```ts
import { connectAuthEmulator } from 'firebase/auth';
import { useFirebaseEmulator } from '@/constants/env';

// cachedFirebaseAuth 할당 후
if (useFirebaseEmulator) {
  connectAuthEmulator(cachedFirebaseAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
}
```

중복 호출 방지: `connectAuthEmulator`는 `cachedFirebaseAuth` 생성과 같은 블록에서 한 번만 실행된다.

---

## 섹션 3: 테스트 계정 로그인 버튼

### 동작

`EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true`일 때만 로그인 화면에 표시.  
이메일/비밀번호: `test@emulator.local` / `testpass123`

### `features/auth/hooks/use-sign-in-screen.ts`

```ts
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseAuthInstance } from '@/features/auth/firebase-app';
import { useFirebaseEmulator } from '@/constants/env';

// useSignInScreen() 반환값에 추가
onSignInWithTestAccount: useFirebaseEmulator
  ? async () => {
      setBusyAction('test-account');
      setErrorMessage(null);
      try {
        await signInWithEmailAndPassword(
          getFirebaseAuthInstance(),
          'test@emulator.local',
          'testpass123',
        );
        // FirebaseAuthClient.loadSession()이 Firebase currentUser를 반영하도록 refresh
        await continueAsDevGuest();  // 아님, signIn 흐름 대신 아래 참고
        router.replace('/(tabs)/quiz');
      } catch (error) {
        setErrorMessage(formatErrorMessage(error));
      } finally {
        setBusyAction(null);
      }
    }
  : undefined,
```

**주의:** `signInWithEmailAndPassword` 호출 후 Firebase `currentUser`가 설정된다. 이후 `refresh()`를 호출하면 `FirebaseAuthClient.loadSession()`이 `currentUser`를 읽어 인증 세션을 반환한다.

실제 핸들러:
```ts
async function handleSignInWithTestAccount() {
  setBusyAction('test-account');
  setErrorMessage(null);
  try {
    await signInWithEmailAndPassword(getFirebaseAuthInstance(), 'test@emulator.local', 'testpass123');
    await refresh();
    router.replace('/(tabs)/quiz');
  } catch (error) {
    setErrorMessage(formatErrorMessage(error));
  } finally {
    setBusyAction(null);
  }
}
```

`UseSignInScreenResult`에 `onSignInWithTestAccount?: () => Promise<void>` 타입 추가.

### `features/auth/components/sign-in-screen-view.tsx`

`canUseDevGuestAuth` 버튼 블록 아래:

```tsx
{process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true' && onSignInWithTestAccount ? (
  <Animated.View entering={FadeIn.duration(180).delay(260)} style={styles.devGuestWrap}>
    <Pressable
      testID="sign-in-with-test-account"
      accessibilityRole="button"
      disabled={busyAction !== null}
      onPress={() => void onSignInWithTestAccount()}
      style={({ pressed }) => [
        styles.devGuestButton,
        (pressed || busyAction !== null) && styles.devGuestButtonPressed,
      ]}>
      <Text selectable style={styles.devGuestText}>
        {busyAction === 'test-account'
          ? '테스트 계정으로 로그인 중...'
          : '테스트 계정으로 로그인'}
      </Text>
    </Pressable>
  </Animated.View>
) : null}
```

---

## 섹션 4: `.env.playwright`

신규 파일, git 커밋 O (로컬 에뮬레이터 설정, 비밀 없음).

```sh
EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true

# Firebase 에뮬레이터 Function URLs (dasida-app / asia-northeast3)
EXPO_PUBLIC_RECORD_LEARNING_ATTEMPT_URL=http://127.0.0.1:5001/dasida-app/asia-northeast3/recordLearningAttempt
EXPO_PUBLIC_GET_LEARNER_SUMMARY_URL=http://127.0.0.1:5001/dasida-app/asia-northeast3/getLearnerSummary
EXPO_PUBLIC_SAVE_FEATURED_EXAM_STATE_URL=http://127.0.0.1:5001/dasida-app/asia-northeast3/saveFeaturedExamState
EXPO_PUBLIC_LIST_LEARNING_ATTEMPTS_URL=http://127.0.0.1:5001/dasida-app/asia-northeast3/listLearningAttempts
EXPO_PUBLIC_GET_LEARNING_ATTEMPT_RESULTS_URL=http://127.0.0.1:5001/dasida-app/asia-northeast3/getLearningAttemptResults
EXPO_PUBLIC_IMPORT_LOCAL_LEARNING_HISTORY_URL=http://127.0.0.1:5001/dasida-app/asia-northeast3/importLocalLearningHistory
```

`EXPO_PUBLIC_REVIEW_FEEDBACK_URL`은 설정하지 않음 → AI 피드백 없이 진행 (기존 동작).

---

## 섹션 5: Playwright globalSetup

### 신규 devDependencies (root `package.json`)

```
firebase-admin
dotenv
```

### `playwright.config.ts` 변경

```ts
import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.playwright' });

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
```

`dotenv.config`는 config 파일 최상단에서 로드하므로 `webServer`가 spawn하는 Expo 프로세스도 동일 env를 상속한다.

### `e2e/global-setup.ts`

```ts
import admin from 'firebase-admin';

const TEST_EMAIL = 'test@emulator.local';
const TEST_PASSWORD = 'testpass123';

async function globalSetup() {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

  admin.initializeApp({ projectId: 'dasida-app' });

  try {
    await admin.auth().createUser({ email: TEST_EMAIL, password: TEST_PASSWORD });
  } catch {
    // 이미 존재하면 무시 (emulator:start --import 재사용 시)
  }
}

export default globalSetup;
```

### `e2e/firebase-admin.ts` (신규 헬퍼)

Playwright 테스트 파일은 globalSetup과 **별도 프로세스**로 실행된다. Admin SDK를 각 워커에서 lazy init하는 헬퍼가 필요하다.

```ts
import admin from 'firebase-admin';

const TEST_EMAIL = 'test@emulator.local';

let initialized = false;

function ensureAdmin() {
  if (initialized) return;
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  if (admin.apps.length === 0) {
    admin.initializeApp({ projectId: 'dasida-app' });
  }
  initialized = true;
}

export async function getTestUserAccountKey(): Promise<string> {
  ensureAdmin();
  const user = await admin.auth().getUserByEmail(TEST_EMAIL);
  return `user:${user.uid}`;
}

export async function readFirestoreCollection(collectionPath: string): Promise<unknown[]> {
  ensureAdmin();
  const snap = await admin.firestore().collection(collectionPath).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
```

**Firestore 경로 패턴:**
- `users/{accountKey}/attempts/{attemptId}` — 진단 퀴즈 기록
- `users/{accountKey}/reviewTasks/{taskId}` — 복습 태스크

`accountKey`는 `user:{firebaseUid}` 형태 (예: `user:AbCdEfGh`).

---

## 섹션 6: Playwright 테스트

### `e2e/firebase-firestore.spec.ts`

테스트들이 Firestore 상태를 순서대로 공유하므로 `test.describe.serial`을 사용한다.

```ts
import { test, expect } from '@playwright/test';
import { getTestUserAccountKey, readFirestoreCollection } from './firebase-admin';

test.describe.serial('Firebase Firestore 저장 검증', () => {
  let accountKey: string;

  test.beforeAll(async () => {
    accountKey = await getTestUserAccountKey();
  });

  test('1. 테스트 계정으로 로그인 → quiz 탭 진입', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForSelector('[data-testid="sign-in-with-test-account"]');
    await page.getByTestId('sign-in-with-test-account').click();

    // 로그인 후 → 온보딩(프로필 없음) 또는 quiz로 이동
    await page.waitForURL(/onboarding|quiz/, { timeout: 8000 });
  });

  test('2. 온보딩 → diagnostic 퀴즈 완료 → attempts Firestore 저장 확인', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByTestId('sign-in-with-test-account').click();
    await page.waitForURL(/onboarding|quiz/, { timeout: 8000 });

    // 온보딩이 필요한 경우 처리
    if (page.url().includes('onboarding')) {
      await page.getByPlaceholderText('닉네임을 입력해 주세요').fill('테스트');
      await page.getByText('고3').click();
      await page.getByRole('button', { name: '시작하기' }).click();
      await page.waitForURL(/quiz/, { timeout: 5000 });
    }

    // quiz 탭 → 진단 시작
    await page.getByRole('button', { name: '진단 시작하기' }).click();
    await page.waitForURL(/diagnostic/, { timeout: 5000 });

    // 각 퀴즈 단계: 입력 없이 제출 (AI 피드백 없이 진행)
    for (let i = 0; i < 20; i++) {
      const isDone = await page.getByText('진단 완료').isVisible().catch(() => false);
      if (isDone) break;
      const submitBtn = page.getByRole('button', { name: '제출하기' });
      const hasSubmit = await submitBtn.isVisible().catch(() => false);
      if (hasSubmit) {
        await submitBtn.click();
        await page.waitForTimeout(300);
      }
    }

    await expect(page.getByText('진단 완료')).toBeVisible({ timeout: 10000 });

    // Cloud Function 호출 완료 대기
    await page.waitForTimeout(2000);

    const attempts = await readFirestoreCollection(`users/${accountKey}/attempts`);
    expect(attempts.length).toBeGreaterThan(0);
  });

  test('3. diagnostic 완료 → reviewTasks day1 Firestore 저장 확인', async () => {
    // 테스트 2에서 쌓인 Firestore 상태를 직접 확인 (UI 불필요)
    const reviewTasks = await readFirestoreCollection(`users/${accountKey}/reviewTasks`);
    const day1Tasks = reviewTasks.filter((t: any) => t.stage === 'day1');
    expect(day1Tasks.length).toBeGreaterThan(0);
  });
});
```

**주의사항:**
- 온보딩 placeholder 텍스트(`닉네임을 입력해 주세요`)와 버튼 텍스트(`시작하기`, `진단 시작하기`, `제출하기`)는 구현 시 실제 앱 텍스트로 확인 후 맞출 것.
- `review-session.spec.ts`의 헬퍼 패턴을 참고해 selector를 정확하게 작성한다.

---

## 파일 변경 요약

| 파일 | 변경 |
|---|---|
| `firebase.json` | emulators 섹션 추가 |
| `constants/env.ts` | `useFirebaseEmulator` 상수 추가 |
| `features/auth/firebase-app.ts` | `connectAuthEmulator` 조건부 호출 |
| `features/auth/hooks/use-sign-in-screen.ts` | `onSignInWithTestAccount` 핸들러 추가 |
| `features/auth/components/sign-in-screen-view.tsx` | 테스트 계정 버튼 추가 |
| `playwright.config.ts` | `globalSetup` + `dotenv` 로드 |
| `.env.playwright` | 신규 — 에뮬레이터 URLs |
| `e2e/global-setup.ts` | 신규 — globalSetup (테스트 계정 생성) |
| `e2e/firebase-admin.ts` | 신규 — Admin SDK lazy init 헬퍼 |
| `e2e/firebase-firestore.spec.ts` | 신규 — Firestore 저장 검증 테스트 |
| `package.json` (root) | `firebase-admin`, `dotenv` devDependency 추가 |

---

## 실행 순서 (로컬)

```bash
# 1. 에뮬레이터 시작 (백그라운드)
firebase emulators:start

# 2. Playwright 실행 (별도 터미널)
npx playwright test e2e/firebase-firestore.spec.ts
```

`reuseExistingServer: true`이므로 이미 실행 중인 Expo dev server가 있으면 그대로 사용한다.

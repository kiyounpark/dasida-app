# Firebase Emulator 통합 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Firebase Auth/Functions/Firestore 에뮬레이터를 연결하고, 테스트 계정 로그인 버튼과 Playwright Firestore 저장 검증 테스트를 추가한다.

**Architecture:** 웹 Expo 빌드에서 Auth 에뮬레이터 연결(`connectAuthEmulator`) + Functions 에뮬레이터 URL(`.env.playwright`) + Playwright globalSetup이 Admin SDK로 테스트 계정 생성 및 Firestore 직접 읽기. 클라이언트-사이드 Firestore 연결은 불필요 (웹에서 LocalLearnerProfileStore 사용, Firestore는 Cloud Functions Admin SDK가 씀).

**Tech Stack:** firebase-admin, dotenv, Playwright, Firebase Emulator Suite, firebase/auth (connectAuthEmulator)

---

## 파일 구조

| 파일 | 역할 |
|---|---|
| `firebase.json` | Auth/Functions/Firestore 에뮬레이터 포트 선언 |
| `constants/env.ts` | `useFirebaseEmulator` 플래그 |
| `features/auth/firebase-app.ts` | Auth 에뮬레이터 연결 (connectAuthEmulator) |
| `features/auth/hooks/use-sign-in-screen.ts` | 테스트 계정 로그인 핸들러 |
| `features/auth/components/sign-in-screen-view.tsx` | 테스트 계정 버튼 UI |
| `playwright.config.ts` | globalSetup 등록 + dotenv 로드 |
| `.env.playwright` | 에뮬레이터 Function URLs |
| `e2e/global-setup.ts` | Admin SDK 초기화 + 테스트 계정 생성 |
| `e2e/firebase-admin.ts` | 테스트용 Admin SDK 헬퍼 (lazy init) |
| `e2e/firebase-firestore.spec.ts` | Firestore 저장 검증 Playwright 테스트 |

---

## Task 1: devDependency 설치 + firebase.json 에뮬레이터 설정

**Files:**
- Modify: `package.json`
- Modify: `firebase.json`

- [ ] **Step 1: 패키지 설치**

```bash
cd /Users/baggiyun/dev/dasida-app
npm install -D firebase-admin dotenv
```

Expected: `package.json` devDependencies에 `firebase-admin`과 `dotenv`가 추가됨.

- [ ] **Step 2: firebase.json 에뮬레이터 섹션 추가**

현재 `firebase.json`:
```json
{
  "functions": {
    "source": "functions",
    ...
  }
}
```

수정 후 `firebase.json`:
```json
{
  "functions": {
    "source": "functions",
    "codebase": "default",
    "predeploy": [
      "npm --prefix \"$RESOURCE_DIR\" run build"
    ],
    "ignore": [
      "node_modules",
      ".git",
      "firebase-debug.log",
      "firebase-debug.*.log",
      "*.local"
    ]
  },
  "emulators": {
    "auth": {
      "port": 9099,
      "host": "127.0.0.1"
    },
    "functions": {
      "port": 5001,
      "host": "127.0.0.1"
    },
    "firestore": {
      "port": 8080,
      "host": "127.0.0.1"
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

- [ ] **Step 3: 설정 확인**

```bash
firebase emulators:exec --only auth,firestore,functions "echo emulators-ok" 2>&1 | tail -5
```

Expected: `emulators-ok` 출력 포함. 오류 없이 에뮬레이터가 시작됨.

- [ ] **Step 4: 커밋**

```bash
git add firebase.json package.json package-lock.json
git commit -m "feat: Firebase 에뮬레이터 포트 설정 + devDep 추가"
```

---

## Task 2: `constants/env.ts` + Auth 에뮬레이터 연결

**Files:**
- Modify: `constants/env.ts`
- Modify: `features/auth/firebase-app.ts`

- [ ] **Step 1: `constants/env.ts`에 `useFirebaseEmulator` 추가**

`constants/env.ts` 파일 끝에 추가:

```ts
export const useFirebaseEmulator = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true';
```

- [ ] **Step 2: `firebase-app.ts`에 connectAuthEmulator 조건부 호출**

현재 `features/auth/firebase-app.ts` (전체):
```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';

import { getFirebaseClientConfig } from './firebase-config';
```

수정 후:
```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';

import { useFirebaseEmulator } from '@/constants/env';
import { getFirebaseClientConfig } from './firebase-config';
```

`getFirebaseAuthInstance()` 함수에서 `cachedFirebaseAuth`를 반환하기 직전에 추가:

```ts
export function getFirebaseAuthInstance() {
  if (cachedFirebaseAuth) {
    return cachedFirebaseAuth;
  }

  const app = getOrCreateFirebaseApp();

  try {
    cachedFirebaseAuth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage) as never,
    });
  } catch {
    cachedFirebaseAuth = getAuth(app);
  }

  // 에뮬레이터 연결 (한 번만 — cachedFirebaseAuth 생성 직후)
  if (useFirebaseEmulator) {
    connectAuthEmulator(cachedFirebaseAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }

  return cachedFirebaseAuth;
}
```

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
cd /Users/baggiyun/dev/dasida-app
npx tsc --noEmit 2>&1 | grep -v "TS2307\|node_modules" | head -20
```

Expected: `features/auth/firebase-app.ts` 관련 오류 없음. (기존 pre-existing 오류는 무시)

- [ ] **Step 4: 커밋**

```bash
git add constants/env.ts features/auth/firebase-app.ts
git commit -m "feat: EXPO_PUBLIC_USE_FIREBASE_EMULATOR 플래그 + Auth 에뮬레이터 연결"
```

---

## Task 3: 테스트 계정 로그인 버튼

**Files:**
- Modify: `features/auth/hooks/use-sign-in-screen.ts`
- Modify: `features/auth/components/sign-in-screen-view.tsx`

- [ ] **Step 1: `use-sign-in-screen.ts`에 핸들러 추가**

현재 파일 맨 위 import 블록:
```ts
import { router } from 'expo-router';
import { useMemo, useState } from 'react';

import { AuthFlowCancelledError } from '@/features/auth/auth-client';
import type { SupportedAuthProvider } from '@/features/auth/types';
import { useCurrentLearner } from '@/features/learner/provider';
```

수정 후:
```ts
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';

import { AuthFlowCancelledError } from '@/features/auth/auth-client';
import type { SupportedAuthProvider } from '@/features/auth/types';
import { useFirebaseEmulator } from '@/constants/env';
import { getFirebaseAuthInstance } from '@/features/auth/firebase-app';
import { useCurrentLearner } from '@/features/learner/provider';
```

`useSignInScreen()` 함수에서 `useCurrentLearner()` 구조분해에 `refresh` 추가:
```ts
const {
  authBlockingReason,
  availableAuthProviders,
  canUseDevGuestAuth,
  continueAsDevGuest,
  refresh,
  signIn,
} = useCurrentLearner();
```

`handleContinueAsDevGuest` 아래에 추가:

```ts
async function handleSignInWithTestAccount() {
  setBusyAction('test-account');
  setErrorMessage(null);

  try {
    await signInWithEmailAndPassword(
      getFirebaseAuthInstance(),
      'test@emulator.local',
      'testpass123',
    );
    await refresh();
    router.replace('/(tabs)/quiz');
  } catch (error) {
    setErrorMessage(formatErrorMessage(error));
  } finally {
    setBusyAction(null);
  }
}
```

`refresh`를 `useCurrentLearner()` 구조분해에 추가:
```ts
const {
  authBlockingReason,
  availableAuthProviders,
  canUseDevGuestAuth,
  continueAsDevGuest,
  refresh,
  signIn,
} = useCurrentLearner();
```

반환 객체에 추가:
```ts
return {
  ...
  onSignInWithTestAccount: useFirebaseEmulator ? handleSignInWithTestAccount : undefined,
};
```

`UseSignInScreenResult` 타입에 추가:
```ts
export type UseSignInScreenResult = ReturnType<typeof useSignInScreen>;
```

이 타입은 `ReturnType`으로 자동 추론되므로 별도 수정 불필요.

- [ ] **Step 2: `sign-in-screen-view.tsx`에 버튼 추가**

`SignInScreenView` props에 `onSignInWithTestAccount` 추가:

```ts
export function SignInScreenView({
  blockingCopy,
  busyAction,
  canUseDevGuestAuth,
  errorMessage,
  supportedAuthProviders,
  onContinueAsDevGuest,
  onSignIn,
  onSignInWithTestAccount,
}: UseSignInScreenResult) {
```

`canUseDevGuestAuth` 블록 바로 아래에 추가:

```tsx
{onSignInWithTestAccount ? (
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

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
cd /Users/baggiyun/dev/dasida-app
npx tsc --noEmit 2>&1 | grep "sign-in" | head -10
```

Expected: `sign-in-screen` 관련 오류 없음.

- [ ] **Step 4: 커밋**

```bash
git add features/auth/hooks/use-sign-in-screen.ts features/auth/components/sign-in-screen-view.tsx
git commit -m "feat: 에뮬레이터 전용 테스트 계정 로그인 버튼 추가"
```

---

## Task 4: `.env.playwright` + `playwright.config.ts` 수정 + package.json 스크립트

**Files:**
- Create: `.env.playwright`
- Modify: `playwright.config.ts`
- Modify: `package.json`

**설계 원칙:** `FIREBASE_EMULATOR_TESTS=true` 환경변수를 명시해야만 에뮬레이터 모드가 활성화된다. 이 변수 없이 `npx playwright test`를 실행하면 기존 review-session 테스트가 그대로 동작한다.

- [ ] **Step 1: `.env.playwright` 생성**

```sh
# Firebase 에뮬레이터 모드 활성화
EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true

# Cloud Function 에뮬레이터 URLs (프로젝트: dasida-app, 리전: asia-northeast3)
EXPO_PUBLIC_RECORD_LEARNING_ATTEMPT_URL=http://127.0.0.1:5001/dasida-app/asia-northeast3/recordLearningAttempt
EXPO_PUBLIC_GET_LEARNER_SUMMARY_URL=http://127.0.0.1:5001/dasida-app/asia-northeast3/getLearnerSummary
EXPO_PUBLIC_SAVE_FEATURED_EXAM_STATE_URL=http://127.0.0.1:5001/dasida-app/asia-northeast3/saveFeaturedExamState
EXPO_PUBLIC_LIST_LEARNING_ATTEMPTS_URL=http://127.0.0.1:5001/dasida-app/asia-northeast3/listLearningAttempts
EXPO_PUBLIC_GET_LEARNING_ATTEMPT_RESULTS_URL=http://127.0.0.1:5001/dasida-app/asia-northeast3/getLearningAttemptResults
EXPO_PUBLIC_IMPORT_LOCAL_LEARNING_HISTORY_URL=http://127.0.0.1:5001/dasida-app/asia-northeast3/importLocalLearningHistory
```

`EXPO_PUBLIC_REVIEW_FEEDBACK_URL`은 설정하지 않음 (빈 문자열 → AI 피드백 없이 진행).

- [ ] **Step 2: `playwright.config.ts` 수정**

현재:
```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
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

수정 후:
```ts
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
```

- [ ] **Step 3: `package.json`에 `test:firestore` 스크립트 추가**

`package.json`의 `"scripts"` 섹션에 추가:
```json
"test:firestore": "FIREBASE_EMULATOR_TESTS=true npx playwright test e2e/firebase-firestore.spec.ts"
```

- [ ] **Step 4: 기존 테스트가 영향받지 않는지 확인**

에뮬레이터 없이 기존 테스트 실행:
```bash
cd /Users/baggiyun/dev/dasida-app
npx playwright test e2e/review-session.spec.ts --project=chromium 2>&1 | tail -10
```

Expected: 7/7 passing. `globalSetup`이 실행되지만 `FIREBASE_EMULATOR_TESTS !== 'true'`이므로 즉시 반환된다 (다음 Task에서 guard 추가).

- [ ] **Step 5: 커밋**

```bash
git add .env.playwright playwright.config.ts package.json
git commit -m "feat: .env.playwright + playwright.config globalSetup + test:firestore 스크립트"
```

---

## Task 5: Admin SDK 헬퍼 + globalSetup

**Files:**
- Create: `e2e/global-setup.ts`
- Create: `e2e/firebase-admin.ts`

- [ ] **Step 1: `e2e/global-setup.ts` 생성**

```ts
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
```

- [ ] **Step 2: `e2e/firebase-admin.ts` 생성**

```ts
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
```

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
cd /Users/baggiyun/dev/dasida-app
npx tsc --noEmit 2>&1 | grep "e2e/" | head -10
```

Expected: e2e 관련 오류 없음. (`firebase-admin` 타입이 정상 resolve됨)

- [ ] **Step 4: 커밋**

```bash
git add e2e/global-setup.ts e2e/firebase-admin.ts
git commit -m "feat: Admin SDK globalSetup + Firestore/Auth 헬퍼 추가"
```

---

## Task 6: Playwright Firestore 검증 테스트 + 실행

**Files:**
- Create: `e2e/firebase-firestore.spec.ts`

- [ ] **Step 1: `e2e/firebase-firestore.spec.ts` 생성**

```ts
import { test, expect } from '@playwright/test';
import { getTestUserCredentials, readFirestoreCollection } from './firebase-admin';

// 에뮬레이터 미실행 시 건너뛰기
const EMULATOR_MODE = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

test.describe.serial('Firebase Firestore 저장 검증', () => {
  test.skip(!EMULATOR_MODE, '에뮬레이터 모드에서만 실행됩니다 (.env.playwright 필요)');

  // ── 테스트 1: Auth 에뮬레이터 — 로그인 버튼 동작 확인 ───────────────────

  test('1. 테스트 계정 로그인 버튼 → quiz 탭 진입', async ({ page }) => {
    await page.goto('/sign-in');

    // 테스트 계정 버튼이 보일 때까지 대기 (에뮬레이터 모드에서만 렌더링)
    await expect(page.getByTestId('sign-in-with-test-account')).toBeVisible({ timeout: 8000 });
    await page.getByTestId('sign-in-with-test-account').click();

    // 인증 후 quiz 탭으로 이동
    await expect(page).toHaveURL(/quiz/, { timeout: 10000 });
  });

  // ── 테스트 2: Functions 에뮬레이터 → Firestore 저장 확인 ─────────────────

  test('2. Cloud Function 호출 → attempts Firestore 저장 확인', async () => {
    const { idToken, accountKey } = await getTestUserCredentials();

    const now = new Date().toISOString();
    const attemptId = `e2e-test-${Date.now()}`;

    const response = await fetch(
      'http://127.0.0.1:5001/dasida-app/asia-northeast3/recordLearningAttempt',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
          'x-dasida-account-key': accountKey,
        },
        body: JSON.stringify({
          attempt: {
            attemptId,
            accountKey,
            learnerId: 'e2e-learner',
            source: 'diagnostic',
            sourceEntityId: null,
            gradeSnapshot: 'g3',
            startedAt: now,
            completedAt: now,
            questionCount: 1,
            correctCount: 1,
            wrongCount: 0,
            accuracy: 100,
            primaryWeaknessId: null,
            topWeaknesses: [],
            questions: [
              {
                questionId: 'e2e-q1',
                questionNumber: 1,
                topic: 'E2E 테스트',
                selectedIndex: 0,
                isCorrect: true,
                finalWeaknessId: null,
                methodId: null,
                diagnosisSource: null,
                finalMethodSource: null,
                diagnosisCompleted: false,
                usedDontKnow: false,
                usedAiHelp: false,
              },
            ],
          },
        }),
      },
    );

    expect(response.status).toBe(200);

    // Firestore 검증
    const attempts = await readFirestoreCollection(`users/${accountKey}/attempts`);
    expect(attempts.some((a: any) => a.id === attemptId)).toBe(true);
  });

  // ── 테스트 3: reviewTasks Firestore 저장 확인 ────────────────────────────

  test('3. recordLearningAttempt 응답 → reviewTasks Firestore 저장 확인', async () => {
    const { accountKey } = await getTestUserCredentials();

    // 테스트 2에서 저장된 attempts에 대해 reviewTasks도 생성되었는지 확인
    const reviewTasks = await readFirestoreCollection(`users/${accountKey}/reviewTasks`);
    const day1Tasks = (reviewTasks as any[]).filter((t) => t.stage === 'day1');

    // diagnostic 퀴즈 완료 시 day1 태스크가 생성됨
    expect(day1Tasks.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 에뮬레이터 실행 (별도 터미널)**

```bash
# 새 터미널에서
cd /Users/baggiyun/dev/dasida-app
firebase emulators:start
```

Expected: UI at http://localhost:4000, Functions :5001, Auth :9099, Firestore :8080 모두 ready.

- [ ] **Step 3: firebase-firestore.spec.ts 실행**

```bash
cd /Users/baggiyun/dev/dasida-app
npm run test:firestore -- --project=chromium
```

(= `FIREBASE_EMULATOR_TESTS=true npx playwright test e2e/firebase-firestore.spec.ts --project=chromium`)

Expected:
```
  Firebase Firestore 저장 검증
    ✓ 1. 테스트 계정 로그인 버튼 → quiz 탭 진입
    ✓ 2. Cloud Function 호출 → attempts Firestore 저장 확인
    ✓ 3. recordLearningAttempt 응답 → reviewTasks Firestore 저장 확인

  3 passed
```

- [ ] **Step 4: 기존 review-session 테스트 — 에뮬레이터 없이 확인**

```bash
# 에뮬레이터 종료 후 실행 (또는 에뮬레이터 없이 별도 터미널에서)
npx playwright test e2e/review-session.spec.ts --project=chromium
```

Expected: 7 passed. `globalSetup`이 `FIREBASE_EMULATOR_TESTS !== 'true'`이므로 즉시 반환, 에뮬레이터 연결 시도 없음.

- [ ] **Step 5: 커밋**

```bash
git add e2e/firebase-firestore.spec.ts
git commit -m "feat: Firebase Firestore 저장 검증 Playwright 테스트 추가"
```

---

## 실행 요약

**에뮬레이터 테스트 전체 순서:**

```bash
# 터미널 1: 에뮬레이터 실행
firebase emulators:start

# 터미널 2: 테스트 실행
npm run test:firestore -- --project=chromium
```

**기존 리뷰 테스트 (에뮬레이터 불필요):**
```bash
npx playwright test e2e/review-session.spec.ts --project=chromium
```

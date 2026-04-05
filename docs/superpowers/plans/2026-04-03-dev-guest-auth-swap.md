# Dev Guest Auth Swap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 개발 빌드에서 `canUseDevGuestAuth()` 체크가 `isFirebaseAuthConfigured()` 보다 먼저 실행되도록 순서를 바꿔, 네이티브 dev 환경에서 개발용 익명 로그인이 동작하게 한다.

**Architecture:** `createAuthClient()`의 조건 순서를 swap하고, `provider.tsx`의 `profileStore` 선택 조건도 함께 수정한다. 개발 빌드(`__DEV__ = true`)일 때 항상 `LocalAnonymousAuthClient` + `LocalLearnerProfileStore`를 사용하게 되어 Firebase 없이 앱에 진입할 수 있다. 프로덕션 빌드에는 영향 없다.

**Tech Stack:** TypeScript, Expo (`__DEV__`), React Native

---

## 변경 파일 목록

| 파일 | 변경 내용 |
|---|---|
| `features/auth/create-auth-client.ts` | `canUseDevGuestAuth()` 조건을 `isFirebaseAuthConfigured()` 앞으로 이동 |
| `features/learner/provider.tsx` | `profileStore` 선택 조건에 `!canUseDevGuestAuth()` 추가 |

---

### Task 1: createAuthClient 조건 순서 swap

**Files:**
- Modify: `features/auth/create-auth-client.ts`

- [ ] **Step 1: 현재 코드 확인**

`features/auth/create-auth-client.ts` 전체 내용:

```ts
import type { AuthClient } from './auth-client';
import { canUseDevGuestAuth } from './auth-policy';
import { DisabledAuthClient } from './disabled-auth-client';
import { FirebaseAuthClient } from './firebase-auth-client';
import { isFirebaseAuthConfigured } from './firebase-config';
import { LocalAnonymousAuthClient } from './local-anonymous-auth-client';

export function createAuthClient(): AuthClient {
  if (isFirebaseAuthConfigured()) {
    return new FirebaseAuthClient();
  }

  if (canUseDevGuestAuth()) {
    return new LocalAnonymousAuthClient();
  }

  return new DisabledAuthClient();
}
```

- [ ] **Step 2: 조건 순서 swap**

`createAuthClient()` 함수를 아래와 같이 수정한다:

```ts
export function createAuthClient(): AuthClient {
  if (canUseDevGuestAuth()) {
    return new LocalAnonymousAuthClient();
  }

  if (isFirebaseAuthConfigured()) {
    return new FirebaseAuthClient();
  }

  return new DisabledAuthClient();
}
```

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

---

### Task 2: profileStore 선택 조건 수정

**Files:**
- Modify: `features/learner/provider.tsx:52-58`

**배경:** `provider.tsx`의 `profileStore` 선택은 `createAuthClient()`와 독립적으로 동작한다. Task 1만 하면 dev 네이티브에서 `LocalAnonymousAuthClient` + `FirestoreLearnerProfileStore` 조합이 되어 Firestore 인증 실패가 여전히 발생한다. `canUseDevGuestAuth()` 조건을 추가해 dev에서는 항상 `LocalLearnerProfileStore`를 사용하도록 한다.

- [ ] **Step 1: 현재 코드 확인**

`provider.tsx` 52~58번째 줄:

```ts
// Firestore가 설정된 경우 원격 store 사용 (기기 간 동기화)
// 웹에서는 Firebase 설정 여부와 무관하게 로컬 store 사용
// (웹 dev-guest 세션은 Firebase 인증 없이 Firestore 접근 불가)
const profileStore =
  isFirebaseAuthConfigured() && process.env.EXPO_OS !== 'web'
    ? new FirestoreLearnerProfileStore()
    : new LocalLearnerProfileStore();
```

- [ ] **Step 2: 조건에 !canUseDevGuestAuth() 추가**

```ts
// Firestore가 설정된 경우 원격 store 사용 (기기 간 동기화)
// 웹 또는 개발 모드에서는 로컬 store 사용
// (dev-guest 세션은 Firebase 인증 없이 Firestore 접근 불가)
const profileStore =
  isFirebaseAuthConfigured() && process.env.EXPO_OS !== 'web' && !canUseDevGuestAuth()
    ? new FirestoreLearnerProfileStore()
    : new LocalLearnerProfileStore();
```

`canUseDevGuestAuth`는 `provider.tsx` 상단에 이미 import되어 있으므로 추가 import 불필요.

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

---

### Task 3: 기존 E2E 테스트로 회귀 검증

**Files:**
- Test: `e2e/grade-track.spec.ts` (수정 없음, 실행만)

**배경:** 기존 Playwright 테스트는 웹 환경에서 `loginAndGoToOnboarding()`으로 dev-guest 로그인을 검증한다. swap 후 웹 동작은 변경 없으므로 기존 테스트가 그대로 통과해야 한다.

- [ ] **Step 1: Expo 웹 서버 실행 (이미 실행 중이면 생략)**

```bash
npx expo start --web
```

- [ ] **Step 2: E2E 테스트 실행**

```bash
npx playwright test e2e/grade-track.spec.ts
```

Expected:
```
7 passed
```

- [ ] **Step 3: 커밋**

```bash
git add features/auth/create-auth-client.ts features/learner/provider.tsx
git commit -m "fix: dev 빌드에서 canUseDevGuestAuth를 Firebase보다 먼저 확인하도록 수정"
```

---

## 수동 검증 (네이티브 기기)

자동화 테스트는 웹만 커버하므로, 변경 목적인 네이티브 동작은 아래와 같이 수동 확인한다.

1. `npm start` 실행
2. iOS 또는 Android 기기에서 Expo Go로 QR 스캔
3. 로그인 화면에서 **"개발용 익명으로 계속"** 버튼 클릭
4. 퀴즈 홈으로 정상 진입 확인 (이전에는 에러 또는 무반응)

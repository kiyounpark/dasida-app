# 계정 탈퇴 기능 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프로필 화면에서 계정 및 모든 학습 데이터를 완전 삭제하는 회원 탈퇴 기능 구현 (Apple App Store 필수 요구사항)

**Architecture:** Cloud Function `deleteAccount`가 Firestore 전체 데이터를 recursiveDelete로 삭제하고, 클라이언트는 로컬 캐시 삭제 → Apple/Google 토큰 revoke → Firebase Auth 계정 삭제 순서로 처리한다. 재인증이 필요한 경우(`requires-recent-login`) 제공자별 재로그인 후 재시도한다.

**Tech Stack:** Firebase Admin SDK (recursiveDelete), firebase/auth (deleteUser, reauthenticateWithCredential), expo-apple-authentication (revokeAsync), @react-native-google-signin/google-signin (revokeAccess), React Native Alert

---

## 파일 구조

| 파일 | 역할 |
|---|---|
| `functions/src/delete-account.ts` (신규) | Cloud Function: Firestore `users/{uid}` 재귀 삭제 |
| `functions/src/index.ts` | `deleteAccountHandler` 등록 |
| `features/auth/auth-client.ts` | `AuthClient` 인터페이스에 `deleteAccount` 추가 |
| `features/auth/firebase-auth-client.ts` | `deleteAccount` 구현 (토큰 revoke + Auth 삭제) |
| `features/auth/local-anonymous-auth-client.ts` | `deleteAccount` no-op stub |
| `features/learner/current-learner-controller.ts` | `deleteAccount` 메서드 추가 |
| `features/learner/provider.tsx` | `deleteAccount` Provider 노출 |
| `features/profile/hooks/use-profile-screen.ts` | `onDeleteAccount` 핸들러 추가 |
| `features/profile/components/profile-screen-view.tsx` | 회원 탈퇴 버튼 + Alert UI |
| `constants/env.ts` | `deleteAccountUrl` 추가 |
| `.env` | `EXPO_PUBLIC_DELETE_ACCOUNT_URL` 추가 |

---

### Task 1: Cloud Function `deleteAccount` 구현

**Files:**
- Create: `functions/src/delete-account.ts`
- Modify: `functions/src/index.ts`

**Context:**
- `functions/src/list-review-tasks.ts`를 참고해 패턴 동일하게 작성 (region, cors, invoker, auth)
- POST 메서드, body에 `{ accountKey }` 형태
- Firebase Admin `getFirestore().recursiveDelete(userRef)` 사용
- `users/{uid}` 경로: accountKey는 `user:{firebaseUid}` 형태 → uid 추출 필요

- [ ] **Step 1: `functions/src/delete-account.ts` 파일 작성**

```typescript
import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';

import { authenticateLearningHistoryRequest, LearningHistoryAuthError } from './learning-history-auth';

const DeleteAccountBodySchema = z.object({
  accountKey: z.string().min(1).max(200),
});

export const deleteAccountHandler = onRequest(
  {
    region: 'asia-northeast3',
    timeoutSeconds: 60,
    cors: true,
    invoker: 'public',
  },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const parsedBody = DeleteAccountBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      response.status(400).json({
        error: 'Invalid request body',
        details: parsedBody.error.flatten(),
      });
      return;
    }

    const { accountKey } = parsedBody.data;

    try {
      await authenticateLearningHistoryRequest(
        request.headers as Record<string, string | string[] | undefined>,
        accountKey,
      );

      // accountKey는 "user:{firebaseUid}" 형태
      const uid = accountKey.startsWith('user:') ? accountKey.slice(5) : accountKey;
      const userRef = getFirestore().collection('users').doc(uid);
      await getFirestore().recursiveDelete(userRef);

      response.status(200).json({ success: true });
    } catch (error) {
      if (error instanceof LearningHistoryAuthError) {
        response.status(error.status).json({ error: error.message });
        return;
      }

      logger.error('deleteAccount failed', error);
      response.status(500).json({ error: 'Failed to delete account' });
    }
  },
);
```

- [ ] **Step 2: `functions/src/index.ts`에 핸들러 등록**

기존 export 목록 맨 아래에 추가:

```typescript
export { deleteAccountHandler as deleteAccount } from './delete-account';
```

- [ ] **Step 3: TypeScript 빌드 확인**

```bash
cd functions && npx tsc --noEmit
```

기대 결과: 오류 없음

- [ ] **Step 4: Commit**

```bash
git add functions/src/delete-account.ts functions/src/index.ts
git commit -m "feat(functions): deleteAccount Cloud Function 추가"
```

---

### Task 2: `env.ts` + `.env` 환경 변수 추가

**Files:**
- Modify: `constants/env.ts`
- Modify: `.env`

- [ ] **Step 1: `constants/env.ts` 맨 아래에 추가**

```typescript
export const deleteAccountUrl = (process.env.EXPO_PUBLIC_DELETE_ACCOUNT_URL ?? '').trim();
```

- [ ] **Step 2: `.env`에 추가**

```
EXPO_PUBLIC_DELETE_ACCOUNT_URL=https://asia-northeast3-dasida-app.cloudfunctions.net/deleteAccount
```

- [ ] **Step 3: Commit**

```bash
git add constants/env.ts
git commit -m "feat: deleteAccountUrl 환경 변수 추가"
```

> `.env`는 gitignore 대상이므로 `git add`에 포함하지 않는다.

---

### Task 3: `AuthClient` 인터페이스 + `FirebaseAuthClient` 구현

**Files:**
- Modify: `features/auth/auth-client.ts`
- Modify: `features/auth/firebase-auth-client.ts`

**Context:**
- `deleteAccount`는 POST `/deleteAccount` 호출 → 로컬 캐시 삭제 → 토큰 revoke → Firebase Auth 계정 삭제 순서
- `clearLearningHistoryStorage(accountKey)`는 `features/learning/local-learning-history-storage.ts`에 이미 있음
- Apple token revoke: `AppleAuthentication.revokeAsync({ identityToken })`
  - identityToken은 `getAdditionalUserInfo` 대신 signIn 시 얻는다. 삭제 시점에는 없으므로 재인증으로 새 토큰 취득
  - Apple Sign-In 재인증: `signInWithAppleCredential()` 재호출 후 appleCredential.identityToken 사용
- Google token revoke: `GoogleSignin.revokeAccess()`
- Firebase Auth 삭제: `deleteUser(auth.currentUser)`
  - `auth/requires-recent-login` 에러 → 재인증 후 재시도
  - 재인증: Apple은 `reauthenticateWithCredential(user, appleFirebaseCredential)`, Google은 `reauthenticateWithCredential(user, googleCredential)`
- `deleteAccountUrl`은 함수 파라미터로 주입 (기존 `dependencies` 패턴과 동일)

- [ ] **Step 1: `features/auth/auth-client.ts`에 `deleteAccount` 추가**

```typescript
export type AuthClient = {
  loadSession(): Promise<AuthSession | null>;
  ensureAnonymousSession(): Promise<AuthSession>;
  signIn(provider: SupportedAuthProvider): Promise<SignInResult>;
  signOut(): Promise<AuthSession | null>;
  deleteAccount(accountKey: string, deleteAccountUrl: string): Promise<void>;
  getSupportedProviders(): SupportedAuthProvider[];
  getRemoteAuthContext(
    accountKey?: string,
    options?: { forceRefresh?: boolean },
  ): Promise<RemoteAuthContext>;
};
```

- [ ] **Step 2: `features/auth/firebase-auth-client.ts`에 import 추가**

기존 `firebase/auth` import 블록에 `deleteUser`, `reauthenticateWithCredential` 추가:

```typescript
import {
  GoogleAuthProvider,
  OAuthProvider,
  deleteUser,
  getAdditionalUserInfo,
  reauthenticateWithCredential,
  signInWithCredential,
  signOut as firebaseSignOut,
  type UserCredential,
  type User,
} from 'firebase/auth';
```

기존 `expo-apple-authentication` import는 이미 있음.

기존 `@react-native-google-signin/google-signin` import는 이미 있음.

`features/learning/local-learning-history-storage.ts`에서 import 추가:

```typescript
import { clearLearningHistoryStorage } from '@/features/learning/local-learning-history-storage';
```

- [ ] **Step 3: `FirebaseAuthClient` 클래스에 `deleteAccount` 메서드 추가**

`signOut` 메서드 바로 아래에 추가:

```typescript
async deleteAccount(accountKey: string, deleteAccountUrl: string): Promise<void> {
  const auth = getFirebaseAuthInstance();
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('No authenticated user found.');
  }

  const provider = currentUser.providerData[0]?.providerId;

  // Step 1: Cloud Function으로 Firestore 전체 삭제
  const context = await this.getRemoteAuthContext(accountKey);
  if (context.kind !== 'firebase') {
    throw new Error('Firebase auth context required for account deletion.');
  }

  const deleteResponse = await fetch(deleteAccountUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${context.idToken}`,
      'x-dasida-account-key': accountKey,
    },
    body: JSON.stringify({ accountKey }),
  });

  if (!deleteResponse.ok) {
    const errorBody = await deleteResponse.json().catch(() => ({})) as { error?: string };
    throw new Error(errorBody.error ?? `deleteAccount failed with status ${deleteResponse.status}`);
  }

  // Step 2: 로컬 캐시 삭제
  await clearLearningHistoryStorage(accountKey);

  // Step 3: 토큰 revoke + Firebase Auth 계정 삭제 (재인증 필요 시 처리)
  await this.revokeAndDeleteUser(currentUser, provider ?? '');

  // Step 4: 로컬 세션 삭제
  await clearStoredAuthSession();
}

private async revokeAndDeleteUser(user: User, providerId: string): Promise<void> {
  try {
    await this.doRevokeAndDelete(user, providerId);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'auth/requires-recent-login'
    ) {
      // 재인증 후 재시도
      const reauthenticated = await this.reauthenticateUser(user, providerId);
      await this.doRevokeAndDelete(reauthenticated, providerId);
    } else {
      throw error;
    }
  }
}

private async doRevokeAndDelete(user: User, providerId: string): Promise<void> {
  if (providerId === 'apple.com') {
    const { appleCredential } = await signInWithAppleCredential();
    if (appleCredential.identityToken) {
      await AppleAuthentication.revokeAsync({ identityToken: appleCredential.identityToken });
    }
  } else if (providerId === 'google.com') {
    await GoogleSignin.revokeAccess();
  }

  await deleteUser(user);
}

private async reauthenticateUser(user: User, providerId: string): Promise<User> {
  if (providerId === 'apple.com') {
    const rawNonce = await createRandomNonce();
    const hashedNonce = await createSha256(rawNonce);
    const appleCredential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    if (!appleCredential.identityToken) {
      throw new Error('Apple identity token is missing during reauthentication.');
    }
    const firebaseCredential = new OAuthProvider('apple.com').credential({
      idToken: appleCredential.identityToken,
      rawNonce,
    });
    const result = await reauthenticateWithCredential(user, firebaseCredential);
    return result.user;
  }

  // Google
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (response.type === 'cancelled') {
    throw new AuthFlowCancelledError();
  }
  const idToken = response.data?.idToken;
  if (!idToken) {
    throw new Error('Google ID token missing during reauthentication.');
  }
  const result = await reauthenticateWithCredential(
    user,
    GoogleAuthProvider.credential(idToken),
  );
  return result.user;
}
```

- [ ] **Step 4: TypeScript 타입 확인**

```bash
npx tsc --noEmit 2>&1 | head -20
```

기대 결과: 오류 없음

- [ ] **Step 5: Commit**

```bash
git add features/auth/auth-client.ts features/auth/firebase-auth-client.ts
git commit -m "feat(auth): FirebaseAuthClient.deleteAccount 구현 (Firestore + 토큰 revoke + Auth 삭제)"
```

---

### Task 4: `LocalAnonymousAuthClient` stub 추가

**Files:**
- Modify: `features/auth/local-anonymous-auth-client.ts`

**Context:**
- 익명 유저는 Firebase 계정이 없으므로 no-op (즉시 반환)
- 인터페이스를 구현해야 TypeScript 에러가 발생하지 않음

- [ ] **Step 1: `signOut` 메서드 바로 아래에 추가**

```typescript
async deleteAccount(_accountKey: string, _deleteAccountUrl: string): Promise<void> {
  // 익명 유저는 서버 계정이 없으므로 아무 작업도 하지 않는다.
  await clearStoredAuthSession();
}
```

- [ ] **Step 2: TypeScript 타입 확인**

```bash
npx tsc --noEmit 2>&1 | head -20
```

기대 결과: 오류 없음

- [ ] **Step 3: Commit**

```bash
git add features/auth/local-anonymous-auth-client.ts
git commit -m "feat(auth): LocalAnonymousAuthClient.deleteAccount no-op stub 추가"
```

---

### Task 5: `CurrentLearnerController` + Provider 연결

**Files:**
- Modify: `features/learner/current-learner-controller.ts`
- Modify: `features/learner/provider.tsx`

**Context:**
- `deleteAccount`는 `authClient.deleteAccount(accountKey, deleteAccountUrl)` 호출 후 `buildRequiredSnapshot()` 반환
- `deleteAccountUrl`은 `createCurrentLearnerController`의 `Dependencies`에 추가
- Provider에서는 `deleteAccountUrl`을 `constants/env.ts`의 `deleteAccountUrl`로 주입

- [ ] **Step 1: `current-learner-controller.ts` 수정**

`Dependencies` 타입에 추가:

```typescript
type Dependencies = {
  authClient: AuthClient;
  profileStore: LearnerProfileStore;
  learningHistoryRepository: LearningHistoryRepository;
  localLearningHistoryRepository: LocalLearningHistoryRepository;
  migrationService: LearningHistoryMigrationService;
  peerPresenceStore: PreviewablePeerPresenceStore;
  reviewTaskStore: LocalReviewTaskStore;
  deleteAccountUrl: string;
};
```

`createCurrentLearnerController` 함수 파라미터에 `deleteAccountUrl` 구조분해 추가:

```typescript
export function createCurrentLearnerController({
  authClient,
  profileStore,
  learningHistoryRepository,
  localLearningHistoryRepository,
  migrationService,
  peerPresenceStore,
  reviewTaskStore,
  deleteAccountUrl,
}: Dependencies): CurrentLearnerController {
```

`CurrentLearnerController` 타입에 `deleteAccount` 추가 (파일 상단 타입 정의):

```typescript
export type CurrentLearnerController = {
  // ... 기존 메서드들 ...
  deleteAccount(): Promise<CurrentLearnerSnapshot>;
};
```

`return { ... }` 블록에 `deleteAccount` 추가 (`signOut` 바로 아래):

```typescript
deleteAccount: async () => {
  const { session } = await readAccessibleSnapshot();
  await authClient.deleteAccount(session.accountKey, deleteAccountUrl);
  await peerPresenceStore.clearPreviewSnapshot();
  return buildRequiredSnapshot();
},
```

- [ ] **Step 2: `provider.tsx` 수정**

`import` 추가:

```typescript
import { deleteAccountUrl } from '@/constants/env';
```

`learnerController` 생성 시 `deleteAccountUrl` 주입:

```typescript
const learnerController = createCurrentLearnerController({
  authClient,
  profileStore,
  learningHistoryRepository: createLearningHistoryRepository(authClient),
  localLearningHistoryRepository,
  migrationService: new LearningHistoryMigrationService({
    authClient,
    cacheRepository: localLearningHistoryRepository,
    snapshotStore: new LocalLearningHistorySnapshotStore(),
  }),
  peerPresenceStore,
  reviewTaskStore: localReviewTaskStore,
  deleteAccountUrl,
});
```

`CurrentLearnerContextValue` 타입에 추가:

```typescript
deleteAccount(): Promise<void>;
```

`useMemo` value 블록에 추가 (`signOut` 바로 아래):

```typescript
deleteAccount: async () => {
  const snapshot = await learnerController.deleteAccount();
  setState(toLearnerState(snapshot));
},
```

- [ ] **Step 3: TypeScript 타입 확인**

```bash
npx tsc --noEmit 2>&1 | head -20
```

기대 결과: 오류 없음

- [ ] **Step 4: Commit**

```bash
git add features/learner/current-learner-controller.ts features/learner/provider.tsx
git commit -m "feat(learner): deleteAccount 컨트롤러 메서드 + Provider 연결"
```

---

### Task 6: Profile 화면 UI

**Files:**
- Modify: `features/profile/hooks/use-profile-screen.ts`
- Modify: `features/profile/components/profile-screen-view.tsx`

**Context:**
- `features/profile/components/profile-screen-view.tsx`의 "계정 관리" 카드 (`session?.status === 'authenticated'` 블록)에 추가
- 로그아웃 버튼 아래에 "회원 탈퇴" 버튼 배치
- `Alert.alert`으로 확인 다이얼로그, 확인 버튼은 `style: 'destructive'`
- `busyAction === 'delete-account'`로 로딩 상태 관리
- 기존 `errorMessage` 패턴으로 실패 처리

- [ ] **Step 1: `use-profile-screen.ts`에 `deleteAccount` 임포트 및 핸들러 추가**

`useCurrentLearner` destructuring에 `deleteAccount` 추가:

```typescript
const {
  authGateState,
  availableAuthProviders,
  deleteAccount,
  getHistoryMigrationStatus,
  homeState,
  importAnonymousHistory,
  isReady,
  profile,
  pullReviewDueDates,
  refresh,
  resetLocalProfile,
  seedPreview,
  session,
  signIn,
  signOut,
  updateGrade,
} = useCurrentLearner();
```

`return { ... }` 블록에 추가 (`onSignOut` 바로 아래):

```typescript
onDeleteAccount: async () => {
  setBusyAction('delete-account');
  setErrorMessage(null);
  setNoticeMessage(null);

  try {
    await deleteAccount();
    router.replace('/sign-in');
  } catch (error) {
    setErrorMessage(`탈퇴에 실패했습니다. ${formatErrorMessage(error)}`);
  } finally {
    setBusyAction(null);
  }
},
```

`UseProfileScreenResult` 타입에 추가:

```typescript
onDeleteAccount: () => Promise<void>;
```

- [ ] **Step 2: `profile-screen-view.tsx`에 Alert import 추가**

기존 `react-native` import에 `Alert` 추가:

```typescript
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
```

- [ ] **Step 3: `ProfileScreenView` props에 `onDeleteAccount` 추가**

`ProfileScreenView` 컴포넌트 props에 추가:

```typescript
export function ProfileScreenView({
  busyAction,
  errorMessage,
  gradeOptions,
  homeState,
  isDevBuild,
  isGuestDevSession,
  isImporting,
  isReady,
  manualImportCandidate,
  noticeMessage,
  onDeleteAccount,
  onImportLocalHistory,
  onResetLocalProfile,
  onPullReviewDueDates,
  onSeedPreview,
  onGoToOnboarding,
  onSignIn,
  onSignOut,
  onUpdateGrade,
  previewStates,
  profile,
  session,
  supportedAuthProviders,
}: UseProfileScreenResult) {
```

- [ ] **Step 4: "계정 관리" 카드에 회원 탈퇴 버튼 추가**

로그아웃 `ActionButton` 바로 아래에 추가:

```tsx
<ActionButton
  label={busyAction === 'delete-account' ? '탈퇴 처리 중...' : '회원 탈퇴'}
  disabled={busyAction !== null}
  subtle
  onPress={() => {
    Alert.alert(
      '정말 탈퇴하시겠어요?',
      '모든 학습 기록이 삭제되며 복구할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: () => void onDeleteAccount(),
        },
      ],
    );
  }}
/>
```

- [ ] **Step 5: `actionButtonTextSubtle` 스타일에 danger 색상 variant 추가**

`StyleSheet` 내에 새 스타일 추가:

```typescript
actionButtonDanger: {
  borderColor: BrandColors.danger,
},
actionButtonTextDanger: {
  color: BrandColors.danger,
},
```

회원 탈퇴 버튼의 `ActionButton`을 구분하기 위해 `ActionButton` 컴포넌트에 `danger` prop 추가:

```typescript
function ActionButton({
  label,
  onPress,
  disabled = false,
  subtle = false,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  subtle?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        subtle && styles.actionButtonSubtle,
        danger && styles.actionButtonDanger,
        disabled && styles.actionButtonDisabled,
        pressed && !disabled && styles.actionButtonPressed,
      ]}>
      <Text
        selectable
        style={[
          styles.actionButtonText,
          subtle && styles.actionButtonTextSubtle,
          danger && styles.actionButtonTextDanger,
          disabled && styles.actionButtonTextDisabled,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}
```

회원 탈퇴 버튼에 `danger` prop 적용:

```tsx
<ActionButton
  label={busyAction === 'delete-account' ? '탈퇴 처리 중...' : '회원 탈퇴'}
  disabled={busyAction !== null}
  subtle
  danger
  onPress={() => {
    Alert.alert(
      '정말 탈퇴하시겠어요?',
      '모든 학습 기록이 삭제되며 복구할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: () => void onDeleteAccount(),
        },
      ],
    );
  }}
/>
```

- [ ] **Step 6: TypeScript 타입 확인**

```bash
npx tsc --noEmit 2>&1 | head -20
```

기대 결과: 오류 없음

- [ ] **Step 7: Commit**

```bash
git add features/profile/hooks/use-profile-screen.ts features/profile/components/profile-screen-view.tsx
git commit -m "feat(profile): 회원 탈퇴 버튼 + Alert 확인 다이얼로그 추가"
```

---

### Task 7: Cloud Function 배포 + 수동 검증

**Context:**
- `.env.dasida-app` 파일이 `functions/` 디렉터리에 있어야 함 (배포 시 필요)
- 이전 태스크에서 `functions/src/delete-account.ts`가 추가되었으므로 배포 필요

- [ ] **Step 1: Cloud Function 배포**

```bash
npx firebase deploy --only functions:deleteAccount
```

기대 결과:
```
✔  functions[deleteAccount(asia-northeast3)] Successful create operation.
Function URL (deleteAccount(asia-northeast3)): https://asia-northeast3-dasida-app.cloudfunctions.net/deleteAccount
✔  Deploy complete!
```

- [ ] **Step 2: 개발 빌드에서 수동 검증**

1. 앱 실행 후 소셜 로그인 (Apple 또는 Google)
2. 프로필 탭 이동 → "계정 관리" 카드 확인
3. "회원 탈퇴" 버튼 탭 → Alert 다이얼로그 표시 확인
4. "취소" 탭 → 아무것도 일어나지 않아야 함
5. 다시 "회원 탈퇴" → "탈퇴" 탭 → 로딩 상태 → 로그인 화면으로 이동 확인
6. Firebase Console에서 해당 UID의 Auth 계정 삭제 확인
7. Firebase Console Firestore에서 `users/{uid}` 문서 삭제 확인

- [ ] **Step 3: Commit (검증 완료 후)**

```bash
git add .
git commit -m "feat: 계정 탈퇴 기능 구현 완료 (Cloud Function + 클라이언트 + UI)"
```

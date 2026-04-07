# 계정 탈퇴 기능 설계 문서

날짜: 2026-04-07

---

## 배경

Apple App Store 가이드라인(4.2, 5.1.1)은 계정 생성을 지원하는 앱에 인앱 계정 삭제 기능을 의무화한다. 현재 다시다 앱에는 로그아웃만 있고 계정 삭제 기능이 없어 심사 거절 사유가 된다.

---

## 목표

- 사용자가 프로필 화면에서 계정과 모든 학습 데이터를 직접 삭제할 수 있어야 한다.
- Apple Sign-In 토큰 revoke를 포함해야 한다 (Apple 필수 요구사항).

---

## 삭제 범위

| 대상 | 삭제 방법 |
|---|---|
| Firestore `users/{uid}` 전체 (서브컬렉션 포함) | Cloud Function `recursiveDelete` |
| AsyncStorage 로컬 캐시 | 클라이언트 직접 삭제 |
| Firebase Auth 계정 | `deleteUser(currentUser)` |
| Apple 토큰 | `AppleAuthentication.revokeAsync` |
| Google 토큰 | `GoogleSignin.revokeAccess()` |

---

## 설계

### 1. Cloud Function — `deleteAccount`

파일: `functions/src/delete-account.ts` (신규), `functions/src/index.ts` 등록

- **경로**: POST `/deleteAccount`
- **인증**: 기존 `authenticateLearningHistoryRequest` 동일 (accountKey 검증)
- **처리**: Firebase Admin `firestore.recursiveDelete(getUserRef(uid))` — `users/{uid}` 및 모든 서브컬렉션 삭제
- **응답**: `{ success: true }`

> `recursiveDelete`는 Firebase Admin SDK에서만 사용 가능. 클라이언트 SDK에는 없음.

### 2. `AuthClient` 인터페이스 확장

파일: `features/auth/auth-client.ts`

```ts
deleteAccount(accountKey: string): Promise<void>;
```

### 3. `FirebaseAuthClient.deleteAccount` 구현

파일: `features/auth/firebase-auth-client.ts`

순서:
1. `POST /deleteAccount` 호출 → Firestore 전체 삭제
2. 로컬 AsyncStorage 캐시 삭제 (`clearLocalLearningHistory(accountKey)`)
3. 제공자별 토큰 revoke:
   - Apple: `AppleAuthentication.revokeAsync({ identityToken })`
   - Google: `GoogleSignin.revokeAccess()`
4. `deleteUser(getAuth().currentUser!)` — Firebase Auth 계정 삭제
5. `clearStoredAuthSession()`

**재인증 처리**: `deleteUser`가 `auth/requires-recent-login` 에러를 던지면,
Apple/Google 재로그인으로 credential을 갱신(`reauthenticateWithCredential`)한 뒤 재시도한다.

### 4. `LocalAnonymousAuthClient` stub

파일: `features/auth/local-anonymous-auth-client.ts`

익명 유저는 Firebase 계정 없음 → no-op (즉시 반환).

### 5. `current-learner-controller.ts`

파일: `features/learner/current-learner-controller.ts`

```ts
deleteAccount: async () => {
  await authClient.deleteAccount(session.accountKey);
  // signOut과 동일한 로컬 상태 초기화 수행
  return buildSnapshotForSession(null);
}
```

### 6. Provider 노출

파일: `features/learner/provider.tsx`

`deleteAccount(): Promise<void>` 추가.

### 7. Profile 화면 — UI

파일: `features/profile/hooks/use-profile-screen.ts`, `features/profile/components/profile-screen-view.tsx`

**위치**: 프로필 화면, 로그아웃 버튼 아래 (인증된 세션일 때만 표시)

**UX 흐름**:
1. "회원 탈퇴" 버튼 (연한 danger 색상)
2. `Alert.alert` 확인 다이얼로그:
   - 제목: "정말 탈퇴하시겠어요?"
   - 본문: "모든 학습 기록이 삭제되며 복구할 수 없습니다."
   - 버튼: "취소" / "탈퇴" (destructive)
3. 탈퇴 중 버튼 비활성화 + ActivityIndicator
4. 완료 시: `router.replace('/sign-in')`
5. 실패 시: 기존 `errorMessage` 패턴으로 인라인 에러 표시

### 8. 환경 변수

파일: `constants/env.ts`, `.env`

```ts
export const deleteAccountUrl = (
  process.env.EXPO_PUBLIC_DELETE_ACCOUNT_URL ?? ''
).trim();
```

---

## 데이터 흐름

```
유저 "회원 탈퇴" 확인
  → POST /deleteAccount (Cloud Function)
  → Admin SDK recursiveDelete(users/{uid})
  → 로컬 캐시 삭제
  → Apple/Google 토큰 revoke
  → Firebase Auth deleteUser
  → 로그인 화면 이동
```

---

## 변경 파일 목록

| 파일 | 변경 |
|---|---|
| `functions/src/delete-account.ts` | 신규 |
| `functions/src/index.ts` | 핸들러 등록 |
| `features/auth/auth-client.ts` | `deleteAccount` 인터페이스 추가 |
| `features/auth/firebase-auth-client.ts` | `deleteAccount` 구현 |
| `features/auth/local-anonymous-auth-client.ts` | no-op stub 추가 |
| `features/learner/current-learner-controller.ts` | `deleteAccount` 추가 |
| `features/learner/provider.tsx` | `deleteAccount` 노출 |
| `features/profile/hooks/use-profile-screen.ts` | `onDeleteAccount` 핸들러 추가 |
| `features/profile/components/profile-screen-view.tsx` | 회원 탈퇴 버튼 추가 |
| `constants/env.ts` | `deleteAccountUrl` 추가 |
| `.env` | `EXPO_PUBLIC_DELETE_ACCOUNT_URL` 추가 |

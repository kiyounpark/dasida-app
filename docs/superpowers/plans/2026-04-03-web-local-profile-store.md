# Web Local Profile Store Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 웹(`expo start --web`)에서 개발용 게스트 로그인 시 Firestore 권한 에러("Missing or insufficient permissions")가 발생하지 않도록, 웹 플랫폼에서는 `LocalLearnerProfileStore`를 사용하도록 수정한다.

**Architecture:** `features/learner/provider.tsx`의 `profileStore` 선택 조건에 `process.env.EXPO_OS !== 'web'`을 추가한다. 웹에서는 Firebase가 설정돼 있어도 `LocalLearnerProfileStore`(AsyncStorage → localStorage 기반)를 사용하므로 Firestore에 접근하지 않는다. 네이티브(iOS/Android) 동작은 그대로 유지된다.

**Tech Stack:** Expo Router, React Native Web, AsyncStorage (web에선 localStorage 위임), Firebase Firestore

---

## 배경 (컨텍스트)

`features/learner/provider.tsx`에서 `profileStore`는 모듈 로드 시 한 번 결정된다:

```ts
// 현재 코드 (provider.tsx:53-55)
const profileStore = isFirebaseAuthConfigured()
  ? new FirestoreLearnerProfileStore()
  : new LocalLearnerProfileStore();
```

Firebase가 설정돼 있으면 항상 `FirestoreLearnerProfileStore`를 사용하는데, 웹에서 dev-guest 세션은 Firebase 인증 없이 `accountKey = "anon:{id}"` 형태의 로컬 세션을 생성한다. 이 키로 Firestore를 읽으려 하면 보안 규칙이 막아 "Missing or insufficient permissions"가 발생한다.

수정 후 조건:
- 웹 + Firebase 설정됨 → `LocalLearnerProfileStore` (localStorage 기반)
- 네이티브 + Firebase 설정됨 → `FirestoreLearnerProfileStore` (기존 동작)
- Firebase 설정 안 됨 → `LocalLearnerProfileStore` (기존 동작)

**트레이드오프:** 웹에서 Google 로그인해도 프로필이 Firestore에 저장되지 않는다. 현재 웹은 Playwright 테스트용이므로 허용 가능.

---

## 수정 파일

- Modify: `features/learner/provider.tsx:51-55` — profileStore 선택 조건 수정

---

### Task 1: provider.tsx의 profileStore 선택 조건 수정

**Files:**
- Modify: `features/learner/provider.tsx:51-55`

- [ ] **Step 1: 현재 코드 확인**

`features/learner/provider.tsx` 51-55번째 줄을 읽어 아래 코드가 있는지 확인한다:

```ts
// Firestore가 설정된 경우 원격 store 사용 (기기 간 동기화)
// 설정 안 된 경우 로컬 store로 폴백 (개발/Expo Go 환경)
const profileStore = isFirebaseAuthConfigured()
  ? new FirestoreLearnerProfileStore()
  : new LocalLearnerProfileStore();
```

- [ ] **Step 2: 조건 수정**

`features/learner/provider.tsx`의 해당 블록을 다음과 같이 교체한다:

```ts
// Firestore가 설정된 경우 원격 store 사용 (기기 간 동기화)
// 웹에서는 Firebase 설정 여부와 무관하게 로컬 store 사용
// (웹 dev-guest 세션은 Firebase 인증 없이 Firestore 접근 불가)
const profileStore =
  isFirebaseAuthConfigured() && process.env.EXPO_OS !== 'web'
    ? new FirestoreLearnerProfileStore()
    : new LocalLearnerProfileStore();
```

- [ ] **Step 3: 웹 빌드 기동 확인**

```bash
npx expo start --web
```

브라우저에서 `http://localhost:8081` 열기. 로그인 화면이 표시되는지 확인.

- [ ] **Step 4: dev-guest 로그인 동작 확인**

"개발용 익명으로 계속" 버튼 클릭 → 퀴즈 홈 화면으로 이동하는지 확인. 브라우저 콘솔에 "Missing or insufficient permissions" 에러가 없어야 한다.

- [ ] **Step 5: 커밋**

```bash
git add features/learner/provider.tsx
git commit -m "fix: 웹에서 LocalLearnerProfileStore 사용 — Firestore 권한 에러 수정

웹 플랫폼에서는 Firebase 설정 여부와 무관하게 LocalLearnerProfileStore를
사용하도록 profileStore 선택 조건을 수정한다.

웹 dev-guest 세션은 Firebase 인증 없이 anon: 키로 Firestore 접근을
시도하여 Missing or insufficient permissions 에러가 발생하는 문제를 해결한다.

트레이드오프: 웹에서 Google 로그인 시 프로필이 Firestore에 저장되지 않음.
현재 웹은 Playwright UI 테스트 용도이므로 허용 가능."
```

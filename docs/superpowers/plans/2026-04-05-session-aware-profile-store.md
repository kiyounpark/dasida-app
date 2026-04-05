# Session-Aware Profile Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Android dev 빌드에서 익명 로그인(dev guest) 시 "missing or insufficient permissions" 에러를 제거한다.

**Architecture:** `LearnerProfileStore`를 감싸는 `AnonymousAwareLearnerProfileStore` 프록시를 추가한다. 이 프록시는 `authClient.loadSession()`으로 현재 세션 상태를 확인한 뒤, 익명 세션이면 `LocalLearnerProfileStore`로, 인증 세션이면 `FirestoreLearnerProfileStore`로 위임한다. `provider.tsx`의 플랫폼 기반 조건을 이 프록시로 교체한다.

**Tech Stack:** TypeScript, AsyncStorage, Firestore, Firebase Auth

---

## 변경 파일 목록

| 상태 | 파일 | 역할 |
|---|---|---|
| 신규 생성 | `features/learner/anonymous-aware-learner-profile-store.ts` | 세션 기반 스토어 위임 프록시 |
| 수정 | `features/learner/provider.tsx` | 플랫폼 기반 → 프록시 기반 profileStore 교체 |

---

### Task 1: `AnonymousAwareLearnerProfileStore` 구현

**Files:**
- Create: `features/learner/anonymous-aware-learner-profile-store.ts`

- [ ] **Step 1: 파일 생성**

```typescript
// features/learner/anonymous-aware-learner-profile-store.ts
import type { AuthSession } from '@/features/auth/types';
import type { LearnerProfileStore } from './profile-store';
import type { LearnerProfile } from './types';

export class AnonymousAwareLearnerProfileStore implements LearnerProfileStore {
  constructor(
    private readonly loadSession: () => Promise<AuthSession | null>,
    private readonly authenticatedStore: LearnerProfileStore,
    private readonly anonymousStore: LearnerProfileStore,
  ) {}

  private async selectStore(): Promise<LearnerProfileStore> {
    const session = await this.loadSession();
    return session?.status === 'authenticated'
      ? this.authenticatedStore
      : this.anonymousStore;
  }

  async load(accountKey: string): Promise<LearnerProfile | null> {
    return (await this.selectStore()).load(accountKey);
  }

  async createInitial(accountKey: string): Promise<LearnerProfile> {
    return (await this.selectStore()).createInitial(accountKey);
  }

  async save(profile: LearnerProfile): Promise<void> {
    return (await this.selectStore()).save(profile);
  }

  async reset(accountKey: string): Promise<void> {
    return (await this.selectStore()).reset(accountKey);
  }
}
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add features/learner/anonymous-aware-learner-profile-store.ts
git commit -m "feat: add AnonymousAwareLearnerProfileStore proxy"
```

---

### Task 2: `provider.tsx` profileStore 교체

**Files:**
- Modify: `features/learner/provider.tsx`

현재 코드 (`provider.tsx` 약 55번째 줄):

```typescript
// 웹에서는 Firebase 설정 여부와 무관하게 로컬 store 사용
// (웹 dev-guest 세션은 Firebase 인증 없이 Firestore 접근 불가)
const profileStore =
  isFirebaseAuthConfigured() && process.env.EXPO_OS !== 'web'
    ? new FirestoreLearnerProfileStore()
    : new LocalLearnerProfileStore();
```

- [ ] **Step 1: import 추가**

`provider.tsx` 상단 import 목록에 추가:

```typescript
import { AnonymousAwareLearnerProfileStore } from '@/features/learner/anonymous-aware-learner-profile-store';
```

- [ ] **Step 2: profileStore 교체**

기존 `profileStore` 블록을 아래로 교체:

```typescript
// 웹: Firebase 인증 없이 Firestore 접근 불가 → 항상 로컬
// Android/iOS + Firebase 구성됨: 세션 상태 기반으로 위임
//   - 익명 세션 → LocalLearnerProfileStore (Firestore 권한 없음)
//   - 인증 세션 → FirestoreLearnerProfileStore (기기 간 동기화)
// Android/iOS + Firebase 미구성: 항상 로컬
const profileStore =
  isFirebaseAuthConfigured() && process.env.EXPO_OS !== 'web'
    ? new AnonymousAwareLearnerProfileStore(
        () => authClient.loadSession(),
        new FirestoreLearnerProfileStore(),
        new LocalLearnerProfileStore(),
      )
    : new LocalLearnerProfileStore();
```

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 4: Commit**

```bash
git add features/learner/provider.tsx
git commit -m "fix: profileStore를 세션 상태 기반으로 위임 — Android dev guest 익명 로그인 권한 에러 수정"
```

---

## 검증 방법

1. Android 에뮬레이터 또는 기기에서 `npm start` 실행
2. 로그인 화면 하단 **"개발용 익명으로 계속"** 버튼 클릭
3. 에러 없이 앱 진입 확인
4. 로그아웃 후 Google 로그인 → Firestore 동기화 정상 동작 확인
5. 웹에서 익명 로그인 → 기존과 동일하게 동작 확인

---

## 영향 범위

| 시나리오 | 변경 전 | 변경 후 |
|---|---|---|
| Android + 익명 | `FirestoreLearnerProfileStore` → 에러 | `LocalLearnerProfileStore` → 정상 |
| Android + Google 로그인 | `FirestoreLearnerProfileStore` → 정상 | `FirestoreLearnerProfileStore` → 정상 (동일) |
| iOS + 익명 | `FirestoreLearnerProfileStore` → 에러 | `LocalLearnerProfileStore` → 정상 |
| iOS + Apple/Google 로그인 | `FirestoreLearnerProfileStore` → 정상 | `FirestoreLearnerProfileStore` → 정상 (동일) |
| 웹 + 익명 | `LocalLearnerProfileStore` → 정상 | `LocalLearnerProfileStore` → 정상 (동일) |

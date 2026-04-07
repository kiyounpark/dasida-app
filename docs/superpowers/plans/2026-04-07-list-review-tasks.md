# listReviewTasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인 직후 Firestore에서 복습 데이터를 가져와 로컬 캐시에 저장하는 `listReviewTasks` 기능 구현

**Architecture:** Cloud Function GET API를 추가하고, `LearningHistoryRepository` 인터페이스에 `listReviewTasks`를 추가한다. `FirebaseLearningHistoryRepository`가 API를 호출해 응답을 로컬 캐시에 저장하고, `current-learner-controller.ts`의 `signIn` 함수에서 로그인 직후 호출한다. 실패 시 비차단(warn + 계속 진행)으로 처리한다.

**Tech Stack:** Firebase Functions v2, zod, AsyncStorage, `readLearningHistoryApiJson`

---

## 파일 구조

| 파일 | 변경 |
|---|---|
| `functions/src/learning-history.ts` | `listReviewTasks(accountKey)` 함수 추가 |
| `functions/src/list-review-tasks.ts` | Cloud Function 핸들러 신규 |
| `functions/src/index.ts` | 핸들러 export 추가 |
| `constants/env.ts` | `learningHistoryListReviewTasksUrl` 추가 |
| `.env` | `EXPO_PUBLIC_LIST_REVIEW_TASKS_URL` 추가 |
| `features/learning/history-repository.ts` | `LearningHistoryRepository` 인터페이스에 `listReviewTasks` 추가 |
| `features/learning/local-learning-history-repository.ts` | `listReviewTasks` + `cacheReviewTasks` 추가 |
| `features/learning/firebase-learning-history-repository.ts` | `listReviewTasks` 추가, `listReviewTasksUrl` 의존성 추가 |
| `features/learning/learning-history-repository-router.ts` | `listReviewTasks` 라우팅 추가 |
| `features/learning/create-learning-history-repository.ts` | `listReviewTasksUrl` 전달 |
| `features/learner/current-learner-controller.ts` | `signIn` 함수에 동기화 호출 추가 |

---

### Task 1: 서버 — `listReviewTasks` 함수 + Cloud Function 핸들러

**Files:**
- Modify: `functions/src/learning-history.ts`
- Create: `functions/src/list-review-tasks.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: `learning-history.ts`에 `listReviewTasks` 함수 추가**

`export async function getLearningAttemptResults` 바로 위에 추가한다.

```ts
export async function listReviewTasks(accountKey: string): Promise<ReviewTask[]> {
  const reviewTasksSnapshot = await getReviewTasksCollection(accountKey).get();
  return reviewTasksSnapshot.docs.map((doc) => ReviewTaskSchema.parse(doc.data()));
}
```

- [ ] **Step 2: `functions/src/list-review-tasks.ts` 파일 생성**

```ts
import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { authenticateLearningHistoryRequest, LearningHistoryAuthError } from './learning-history-auth';
import { listReviewTasks } from './learning-history';

const ListReviewTasksQuerySchema = z.object({
  accountKey: z.string().min(1).max(200),
});

export const listReviewTasksHandler = onRequest(
  {
    region: 'asia-northeast3',
    timeoutSeconds: 30,
    cors: true,
    invoker: 'public',
  },
  async (request, response) => {
    if (request.method !== 'GET') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const parsedQuery = ListReviewTasksQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      response.status(400).json({
        error: 'Invalid query',
        details: parsedQuery.error.flatten(),
      });
      return;
    }

    try {
      await authenticateLearningHistoryRequest(
        request.headers as Record<string, string | string[] | undefined>,
        parsedQuery.data.accountKey,
      );

      const reviewTasks = await listReviewTasks(parsedQuery.data.accountKey);
      response.status(200).json({ reviewTasks });
    } catch (error) {
      if (error instanceof LearningHistoryAuthError) {
        response.status(error.status).json({ error: error.message });
        return;
      }

      logger.error('listReviewTasks failed', error);
      response.status(500).json({
        error: 'Failed to list review tasks',
      });
    }
  },
);
```

- [ ] **Step 3: `functions/src/index.ts`에 핸들러 등록**

기존 export 목록 맨 아래에 추가한다.

```ts
export { listReviewTasksHandler as listReviewTasks } from './list-review-tasks';
```

- [ ] **Step 4: typecheck 확인**

```bash
cd functions && npm run build 2>&1 | tail -20
```

Expected: 에러 없음 (또는 기존 에러만)

- [ ] **Step 5: commit**

```bash
git add functions/src/learning-history.ts functions/src/list-review-tasks.ts functions/src/index.ts
git commit -m "feat(functions): listReviewTasks Cloud Function 추가"
```

---

### Task 2: 클라이언트 인터페이스 + 로컬 구현

**Files:**
- Modify: `features/learning/history-repository.ts`
- Modify: `features/learning/local-learning-history-repository.ts`

- [ ] **Step 1: `history-repository.ts` 인터페이스에 `listReviewTasks` 추가**

`LearningHistoryRepository` 타입의 `listAttemptResults` 바로 아래에 추가한다.

```ts
listReviewTasks(accountKey: string): Promise<ReviewTask[]>;
```

- [ ] **Step 2: `local-learning-history-repository.ts`에 `cacheReviewTasks` 추가**

`cacheAttemptResults` 메서드 아래에 추가한다.

```ts
async cacheReviewTasks(accountKey: string, reviewTasks: ReviewTask[]): Promise<void> {
  await writeLearningHistoryJson(getReviewTasksStorageKey(accountKey), reviewTasks);
}
```

- [ ] **Step 3: `local-learning-history-repository.ts`에 `listReviewTasks` 추가**

`cacheReviewTasks` 아래에 추가한다.

```ts
async listReviewTasks(accountKey: string): Promise<ReviewTask[]> {
  return readLearningHistoryJson<ReviewTask[]>(getReviewTasksStorageKey(accountKey), []);
}
```

- [ ] **Step 4: typecheck 확인**

```bash
npm run typecheck 2>&1 | grep -E "history-repository|local-learning"
```

Expected: 해당 파일 에러 없음

- [ ] **Step 5: commit**

```bash
git add features/learning/history-repository.ts features/learning/local-learning-history-repository.ts
git commit -m "feat: LearningHistoryRepository에 listReviewTasks 인터페이스 + 로컬 구현 추가"
```

---

### Task 3: 환경 변수 + Firebase 원격 구현

**Files:**
- Modify: `constants/env.ts`
- Modify: `.env`
- Modify: `features/learning/firebase-learning-history-repository.ts`

- [ ] **Step 1: `constants/env.ts`에 URL 상수 추가**

`learningHistoryImportLocalSnapshotUrl` 바로 아래에 추가한다.

```ts
export const learningHistoryListReviewTasksUrl = (
  process.env.EXPO_PUBLIC_LIST_REVIEW_TASKS_URL ?? ''
).trim();
```

- [ ] **Step 2: `.env`에 URL 추가**

기존 URL 목록 맨 아래에 추가한다.

```
EXPO_PUBLIC_LIST_REVIEW_TASKS_URL=https://asia-northeast3-dasida-app.cloudfunctions.net/listReviewTasks
```

- [ ] **Step 3: `firebase-learning-history-repository.ts` Dependencies에 URL 추가**

`Dependencies` 타입에 `listReviewTasksUrl` 추가한다.

```ts
type Dependencies = {
  authClient: AuthClient;
  recordLearningAttemptUrl: string;
  getLearnerSummaryUrl: string;
  saveFeaturedExamStateUrl: string;
  listLearningAttemptsUrl: string;
  getLearningAttemptResultsUrl: string;
  listReviewTasksUrl: string;  // 추가
};
```

- [ ] **Step 4: `firebase-learning-history-repository.ts`에 `listReviewTasks` 메서드 추가**

`listAttemptResults` 메서드 아래에 추가한다.

```ts
async listReviewTasks(accountKey: string): Promise<ReviewTask[]> {
  try {
    const payload = await this.withAuthorizedRequest(accountKey, (headers) =>
      readLearningHistoryApiJson<{ reviewTasks: ReviewTask[] }>(
        `${this.dependencies.listReviewTasksUrl}?accountKey=${encodeURIComponent(accountKey)}`,
        {
          method: 'GET',
          headers,
        },
        1,
      ),
    );

    await this.cache.cacheReviewTasks(accountKey, payload.reviewTasks);
    return payload.reviewTasks;
  } catch (error) {
    if (shouldUseLearningHistoryCacheFallback(error)) {
      this.logCacheFallback('listReviewTasks', error);
      return this.cache.listReviewTasks(accountKey);
    }

    throw error;
  }
}
```

- [ ] **Step 5: typecheck 확인**

```bash
npm run typecheck 2>&1 | grep -E "firebase-learning|env\.ts"
```

Expected: 해당 파일 에러 없음

- [ ] **Step 6: commit**

```bash
git add constants/env.ts .env features/learning/firebase-learning-history-repository.ts
git commit -m "feat: FirebaseLearningHistoryRepository에 listReviewTasks 추가"
```

---

### Task 4: Router + create 함수 연결

**Files:**
- Modify: `features/learning/learning-history-repository-router.ts`
- Modify: `features/learning/create-learning-history-repository.ts`

- [ ] **Step 1: `learning-history-repository-router.ts`에 `listReviewTasks` 라우팅 추가**

`listAttemptResults` 메서드 아래에 추가한다.

```ts
async listReviewTasks(accountKey: string): Promise<ReviewTask[]> {
  return (await this.resolveRepository(accountKey)).listReviewTasks(accountKey);
}
```

파일 상단 import에 `ReviewTask`가 없다면 추가한다.

```ts
import type {
  LearnerSummaryCurrent,
  LearningAttempt,
  LearningAttemptResult,
  ReviewTask,  // 추가
} from './types';
```

- [ ] **Step 2: `create-learning-history-repository.ts`에 URL 전달**

import에 `learningHistoryListReviewTasksUrl` 추가한다.

```ts
import {
  learningHistoryGetLearnerSummaryUrl,
  learningHistoryGetLearningAttemptResultsUrl,
  learningHistoryImportLocalSnapshotUrl,
  learningHistoryListLearningAttemptsUrl,
  learningHistoryListReviewTasksUrl,  // 추가
  learningHistoryRecordAttemptUrl,
  learningHistorySaveFeaturedExamStateUrl,
} from '@/constants/env';
```

`isLearningHistoryRemoteCrudConfigured`에 URL 추가한다.

```ts
export function isLearningHistoryRemoteCrudConfigured() {
  return Boolean(
    learningHistoryRecordAttemptUrl &&
      learningHistoryGetLearnerSummaryUrl &&
      learningHistorySaveFeaturedExamStateUrl &&
      learningHistoryListLearningAttemptsUrl &&
      learningHistoryGetLearningAttemptResultsUrl &&
      learningHistoryListReviewTasksUrl,  // 추가
  );
}
```

`FirebaseLearningHistoryRepository` 생성자에 URL 전달한다.

```ts
new FirebaseLearningHistoryRepository({
  authClient,
  recordLearningAttemptUrl: learningHistoryRecordAttemptUrl,
  getLearnerSummaryUrl: learningHistoryGetLearnerSummaryUrl,
  saveFeaturedExamStateUrl: learningHistorySaveFeaturedExamStateUrl,
  listLearningAttemptsUrl: learningHistoryListLearningAttemptsUrl,
  getLearningAttemptResultsUrl: learningHistoryGetLearningAttemptResultsUrl,
  listReviewTasksUrl: learningHistoryListReviewTasksUrl,  // 추가
})
```

- [ ] **Step 3: typecheck 전체 확인**

```bash
npm run typecheck 2>&1 | grep -v "peer-presence-preview\|use-review-session"
```

Expected: 기존 2개 에러 외 신규 에러 없음

- [ ] **Step 4: commit**

```bash
git add features/learning/learning-history-repository-router.ts features/learning/create-learning-history-repository.ts
git commit -m "feat: LearningHistoryRepositoryRouter에 listReviewTasks 라우팅 연결"
```

---

### Task 5: Controller — signIn 후 복습 동기화

**Files:**
- Modify: `features/learner/current-learner-controller.ts`

- [ ] **Step 1: `signIn` 함수에 `listReviewTasks` 호출 추가**

`signIn` 함수에서 로그인 완료 후 `buildSnapshotForSession` 호출 직전에 추가한다.

현재 코드 (line 322~350):

```ts
signIn: async (provider) => {
  const { previousSession, nextSession } = await authClient.signIn(provider);
  if (previousSession?.status !== 'anonymous' || nextSession.status !== 'authenticated') {
    return buildSnapshotForSession(nextSession, {
      authGateState: 'authenticated',
    });
  }

  try {
    const migrationStatus = await migrationService.importAnonymousSnapshot(
      previousSession.accountKey,
      nextSession.accountKey,
    );
    const migratedSummary =
      migrationStatus.state === 'completed' || migrationStatus.state === 'already_imported'
        ? migrationStatus.summary
        : null;

    return buildSnapshotForSession(nextSession, {
      authGateState: 'authenticated',
      summary: migratedSummary,
    });
  } catch (error) {
    console.warn('Failed to auto-import anonymous learning history after sign-in.', error);
    return buildSnapshotForSession(nextSession, {
      authGateState: 'authenticated',
      authNoticeMessage: AUTO_IMPORT_FAILURE_NOTICE,
    });
  }
},
```

위 코드를 아래로 교체한다.

```ts
signIn: async (provider) => {
  const { previousSession, nextSession } = await authClient.signIn(provider);

  // 복습 데이터 서버 동기화 (실패해도 로그인 흐름 계속)
  try {
    await learningHistoryRepository.listReviewTasks(nextSession.accountKey);
  } catch (error) {
    console.warn('Failed to sync review tasks after sign-in.', error);
  }

  if (previousSession?.status !== 'anonymous' || nextSession.status !== 'authenticated') {
    return buildSnapshotForSession(nextSession, {
      authGateState: 'authenticated',
    });
  }

  try {
    const migrationStatus = await migrationService.importAnonymousSnapshot(
      previousSession.accountKey,
      nextSession.accountKey,
    );
    const migratedSummary =
      migrationStatus.state === 'completed' || migrationStatus.state === 'already_imported'
        ? migrationStatus.summary
        : null;

    return buildSnapshotForSession(nextSession, {
      authGateState: 'authenticated',
      summary: migratedSummary,
    });
  } catch (error) {
    console.warn('Failed to auto-import anonymous learning history after sign-in.', error);
    return buildSnapshotForSession(nextSession, {
      authGateState: 'authenticated',
      authNoticeMessage: AUTO_IMPORT_FAILURE_NOTICE,
    });
  }
},
```

- [ ] **Step 2: typecheck 전체 확인**

```bash
npm run typecheck 2>&1 | grep -v "peer-presence-preview\|use-review-session"
```

Expected: 기존 에러 외 신규 에러 없음

- [ ] **Step 3: lint 확인**

```bash
npm run lint 2>&1
```

Expected: 기존 warning 2개 외 신규 에러 없음

- [ ] **Step 4: commit**

```bash
git add features/learner/current-learner-controller.ts
git commit -m "feat: 로그인 직후 listReviewTasks 호출로 복습 데이터 서버 동기화"
```

---

### Task 6: Cloud Function 배포 + 검증

- [ ] **Step 1: Cloud Function 배포**

```bash
cd functions && npm run build && cd .. && npx firebase deploy --only functions:listReviewTasks
```

Expected: `Deploy complete!` 출력

- [ ] **Step 2: 시뮬레이터에서 동작 확인**

1. 앱 실행 → Apple/Google 로그인
2. `console.warn` 로그 없이 로그인 완료되는지 확인
3. 홈 화면에서 복습 카드가 정상 표시되는지 확인

- [ ] **Step 3: 최종 push + log**

```bash
git push origin <브랜치명> && npm run log:commit
```

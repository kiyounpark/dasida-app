# 복습 일정 서버 동기화 (1단계) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline, 단일 세션 순차 실행).
> 각 태스크는 TDD. 테스트 실패 확인 → 최소 구현 → 통과 → 커밋. 태스크는 독립적으로 읽힐 수 있게 작성.

**Goal:** 인증 사용자의 복습 일정 스케줄러 변경(complete/spawn/overdue)을 서버(Firestore)에 영속해 split-brain 해소, FCM 토대 확보.
**Architecture:** 기존 `LearningHistoryRepositoryRouter` 패턴 미러링. 신규 `saveReviewTasks` Cloud Function + 고수준 영속 헬퍼, 클라 `RemoteReviewTaskStore`/`ReviewTaskStoreRouter`, 하드코딩 store 배선 교체.
**Tech Stack:** Expo RN + TypeScript, Firebase Cloud Functions v2(asia-northeast3) + Firestore, jest(클라) / node:test(서버), zod.

스펙: `docs/superpowers/specs/2026-05-18-review-schedule-server-sync-design.md`

---

## 확정 사실 (코드 검증됨)

- 서버 `functions/src/learning-history.ts`: `ReviewTaskSchema`/`ReviewTask`(export), `diffReviewTasks`(L589, 비공개), `getReviewTasksCollection`(L443, 비공개), `buildReviewTasks`(L811, export), `listReviewTasks`(L1091, export). 서버 `buildReviewTasks`는 기존 task 보존·증분·결정적 id·idempotent.
- 핸들러 패턴: `functions/src/list-review-tasks.ts`(GET) / `import-local-learning-history.ts`(POST, `authContext.kind !== 'firebase'` → 403).
- 핸들러 export: `functions/src/index.ts`.
- 서버 테스트: `functions/tests/*.test.ts` → `cd functions && npm test`.
- 클라 인터페이스: `features/learning/review-task-store.ts` `ReviewTaskStore = {load,saveAll,reset}`, `LocalReviewTaskStore`.
- 클라 인증 헬퍼: `firebase-learning-history-api.ts` (`readLearningHistoryApiJson`, `createRemoteAuthHeaders`, `shouldUseLearningHistoryCacheFallback`, `LearningHistoryApiError`); auth 컨텍스트 패턴은 `firebase-learning-history-repository.ts`의 `getRemoteAuthContext`/`withAuthorizedRequest`/`listReviewTasks` 참조.
- URL 상수: `@/constants/env` (`learningHistoryListReviewTasksUrl` 등).
- DI 팩토리: `features/learning/create-learning-history-repository.ts` (`isLearningHistoryRemoteCrudConfigured()` 게이트 + Router 구성).
- 소비처: `features/learner/provider.tsx:75` `learningHistoryRepository: createLearningHistoryRepository(authClient)`.
- 하드코딩 store: `use-review-session-screen.ts:75`, `use-quiz-hub-screen.ts:25` 둘 다 `new LocalReviewTaskStore()`.
- 클라 테스트: `npx jest <path>`.

---

## Task 1 — 서버 고수준 헬퍼 `saveReviewTasks(accountKey, nextTasks)`

**Files:** 수정 `functions/src/learning-history.ts`; 신규 테스트 `functions/tests/save-review-tasks.test.ts`

`recordLearningAttempt`가 reviewTasks를 영속하는 방식(기존 로드 → `diffReviewTasks` → `getReviewTasksCollection` batch upsert/delete)을 캡슐화한 export 함수 신설:

```ts
export async function saveReviewTasks(
  accountKey: string,
  nextTasks: ReviewTask[],
): Promise<ReviewTask[]> {
  const sanitized = nextTasks.map((t) => ReviewTaskSchema.parse(t));
  const existing = await listReviewTasks(accountKey);
  const { upserts, deletes } = diffReviewTasks(existing, sanitized);
  const col = getReviewTasksCollection(accountKey);
  const batch = col.firestore.batch();
  upserts.forEach((t) => batch.set(col.doc(t.id), t));
  deletes.forEach((t) => batch.delete(col.doc(t.id)));
  await batch.commit();
  return sortReviewTasks(sanitized);
}
```
(`sortReviewTasks`는 L504에 존재. batch 경로는 기존 recordLearningAttempt 영속부와 동형으로 맞춤 — 구현 시 해당 부분 실코드 확인 후 정렬.)

**테스트 관례 (조정됨):** functions 스위트는 순수 함수만 단위 테스트(Firestore 모킹/에뮬레이터 미사용).
따라서 순수 코어 `computeReviewTaskWrite(existing, nextRaw)` 를 분리해 테스트하고,
`saveReviewTasks`는 `recordLearningAttempt`(learning-history.ts:1010-1023)의 검증된 batch 패턴
(`firestore.batch()` + `getReviewTasksCollection().doc(id)` + `stripUndefined` + `{merge:true}` + delete)
을 그대로 미러링한 얇은 I/O 래퍼. Firestore 경로는 Task 2 핸들러 검증 + Expo 스모크로 커버.

순수 코어:
```ts
export function computeReviewTaskWrite(existing: ReviewTask[], nextRaw: ReviewTask[]) {
  const next = nextRaw.map((t) => ReviewTaskSchema.parse(t));
  const { upserts, deletes } = diffReviewTasks(existing, next);
  return { upserts, deletes, sorted: sortReviewTasks(next) };
}
export async function saveReviewTasks(accountKey: string, nextRaw: ReviewTask[]): Promise<ReviewTask[]> {
  const existing = await listReviewTasks(accountKey);
  const { upserts, deletes, sorted } = computeReviewTaskWrite(existing, nextRaw);
  const batch = getFirestore().batch();
  upserts.forEach((t) => batch.set(getReviewTasksCollection(accountKey).doc(t.id), stripUndefined(t), { merge: true }));
  deletes.forEach((t) => batch.delete(getReviewTasksCollection(accountKey).doc(t.id)));
  await batch.commit();
  return sorted;
}
```
(`getFirestore`/`stripUndefined`/`sortReviewTasks`/`getReviewTasksCollection`/`diffReviewTasks` 모두 동일 모듈 내 존재 — 구현 시 실제 시그니처 확인.)

- **Step 1 (실패 테스트):** `functions/tests/save-review-tasks.test.ts` — `computeReviewTaskWrite` 순수 테스트:
  (a) 기존 [A(day1,completed=false)] + next [A(completed=true), B(day1)] → upserts에 A·B, deletes 비어있음.
  (b) 기존 [A,B] + next [A] → deletes에 B.
  (c) next에 스키마 위반 객체 → throw.
  (d) sorted가 `sortReviewTasks` 순서와 일치.
- **Step 2:** `cd functions && npm test` → 신규 테스트 실패 확인.
- **Step 3:** `computeReviewTaskWrite` + `saveReviewTasks` 구현 (순수/래퍼 분리).
- **Step 4:** `cd functions && npm test` 통과 + `cd functions && npm run lint`(tsc).
- **Step 5:** `git commit -m "feat(functions): saveReviewTasks 영속 헬퍼 + 순수 코어 분리"`

## Task 2 — Cloud Function 핸들러 `save-review-tasks.ts`

**Files:** 신규 `functions/src/save-review-tasks.ts`; 수정 `functions/src/index.ts`; 신규 테스트 `functions/tests/save-review-tasks-handler.test.ts`

`list-review-tasks.ts` + `import-local-learning-history.ts` 합성:

```ts
const SaveReviewTasksBodySchema = z.object({
  accountKey: z.string().min(1).max(200),
  reviewTasks: z.array(ReviewTaskSchema).max(600),
});

export const saveReviewTasksHandler = onRequest(
  { region: 'asia-northeast3', timeoutSeconds: 30, cors: true, invoker: 'public' },
  async (request, response) => {
    if (request.method !== 'POST') { response.status(405).json({ error: 'Method not allowed' }); return; }
    const parsed = SaveReviewTasksBodySchema.safeParse(request.body);
    if (!parsed.success) { response.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() }); return; }
    try {
      const authContext = await authenticateLearningHistoryRequest(
        request.headers as Record<string, string | string[] | undefined>,
        parsed.data.accountKey,
      );
      if (authContext.kind !== 'firebase') { response.status(403).json({ error: 'Authenticated users only' }); return; }
      const reviewTasks = await saveReviewTasks(authContext.accountKey, parsed.data.reviewTasks);
      response.status(200).json({ reviewTasks });
    } catch (error) {
      if (error instanceof LearningHistoryAuthError) { response.status(error.status).json({ error: error.message }); return; }
      logger.error('saveReviewTasks failed', error);
      response.status(500).json({ error: 'Failed to save review tasks' });
    }
  },
);
```
`index.ts`에 `export { saveReviewTasksHandler as saveReviewTasks } from './save-review-tasks';`

**테스트 관례 (조정됨):** 기존 핸들러 테스트(`review-feedback`/`list-review-tasks`)는 `onRequest`
래퍼를 단위 테스트하지 않고 **스키마·순수 로직만** 검증. 동일하게 `SaveReviewTasksBodySchema`만
순수 테스트. 래퍼+인증+Firestore 경로는 에뮬레이터/Expo 스모크(Task 7)로 검증.

- **Step 1 (실패 테스트):** `functions/tests/save-review-tasks.test.ts`에 추가 — `SaveReviewTasksBodySchema`:
  (a) 정상 바디 통과, (b) accountKey 누락 reject, (c) reviewTasks 비배열 reject, (d) 601개 초과 reject.
- **Step 2:** `cd functions && npm test` 실패 확인.
- **Step 3:** 핸들러(`save-review-tasks.ts`, 스키마 export 포함) + `index.ts` export 구현.
- **Step 4:** `cd functions && npm test` 통과 + `cd functions && npm run lint`.
- **Step 5:** `git commit -m "feat(functions): saveReviewTasks Cloud Function 핸들러 + export"`

## Task 3 — `@/constants/env` URL + DI 게이트 확장

**Files:** 수정 `constants/env.ts`(또는 env 상수 정의 파일), `features/learning/create-learning-history-repository.ts`; 수정 테스트 해당 시

- `constants/env`에 `learningHistorySaveReviewTasksUrl` 추가 (기존 `learningHistoryListReviewTasksUrl`과 동일 규약/소스).
- **수정(실행 중 결정)**: `isLearningHistoryRemoteCrudConfigured()`에 새 URL을 추가하지 **않는다**
  — 기존 배포에 `SAVE_REVIEW_TASKS_URL` 미설정 시 학습기록 전체가 remote→local로 퇴행하기 때문.
  대신 Task 5에서 **복습 task 전용 게이트** `isReviewTaskRemoteSyncConfigured()`
  (list + save URL 모두 존재) 신설, `createReviewTaskStore`만 사용. 기존 게이트 불변.

- **Step 1 (실패 테스트):** `create-learning-history-repository` 기존 테스트가 있으면 거기에 "saveReviewTasksUrl 누락 시 remote 비구성" 케이스 추가; 없으면 Task 5 라우터 테스트에서 커버하므로 본 태스크는 타입체크로 검증.
- **Step 2:** `npx tsc --noEmit` 실패(미정의 심볼) 확인.
- **Step 3:** 상수 + 게이트 추가.
- **Step 4:** `npx tsc --noEmit` 통과.
- **Step 5:** `git commit -m "chore(env): learningHistorySaveReviewTasksUrl + remote 구성 게이트"`

## Task 4 — `RemoteReviewTaskStore`

**Files:** 신규 `features/learning/remote-review-task-store.ts`; 신규 테스트 `features/learning/remote-review-task-store.test.ts`

`ReviewTaskStore` 구현. 내부에 `LocalReviewTaskStore` 미러 위임. auth 패턴은 `firebase-learning-history-repository.ts` 참조.

```ts
export class RemoteReviewTaskStore implements ReviewTaskStore {
  private readonly mirror = new LocalReviewTaskStore();
  constructor(private readonly deps: {
    authClient: AuthClient; listReviewTasksUrl: string; saveReviewTasksUrl: string;
  }) {}

  async load(accountKey: string): Promise<ReviewTask[]> {
    try {
      const { reviewTasks } = await this.authed(accountKey, (h) =>
        readLearningHistoryApiJson<{ reviewTasks: ReviewTask[] }>(
          `${this.deps.listReviewTasksUrl}?accountKey=${encodeURIComponent(accountKey)}`,
          { method: 'GET', headers: h }, 1));
      await this.mirror.saveAll(accountKey, reviewTasks);
      return reviewTasks;
    } catch (e) {
      if (shouldUseLearningHistoryCacheFallback(e)) return this.mirror.load(accountKey);
      throw e;
    }
  }

  async saveAll(accountKey: string, tasks: ReviewTask[]): Promise<void> {
    try {
      await this.authed(accountKey, (h) =>
        readLearningHistoryApiJson<{ reviewTasks: ReviewTask[] }>(
          this.deps.saveReviewTasksUrl,
          { method: 'POST', headers: { 'Content-Type': 'application/json', ...h },
            body: JSON.stringify({ accountKey, reviewTasks: tasks }) }, 1));
      await this.mirror.saveAll(accountKey, tasks);
    } catch (e) {
      if (shouldUseLearningHistoryCacheFallback(e)) { await this.mirror.saveAll(accountKey, tasks); return; }
      throw e;
    }
  }

  async reset(accountKey: string): Promise<void> { await this.mirror.reset(accountKey); }

  private async authed<T>(accountKey: string, run: (h: Record<string,string>) => Promise<T>) {
    const ctx = await this.deps.authClient.getRemoteAuthContext(accountKey);
    try { return await run(createRemoteAuthHeaders(ctx)); }
    catch (e) {
      if (ctx.kind === 'firebase' && e instanceof LearningHistoryApiError && e.code === 'UNAUTHORIZED') {
        const r = await this.deps.authClient.getRemoteAuthContext(accountKey, { forceRefresh: true });
        return run(createRemoteAuthHeaders(r));
      }
      throw e;
    }
  }
}
```

- **Step 1 (실패 테스트):** authClient/fetch 모킹으로 (a) load 성공 → 미러 갱신·반환, (b) load 네트워크 실패 → 미러 폴백, (c) saveAll 성공 → POST 바디 검증·미러 갱신, (d) saveAll 실패 → 미러 보존(throw 안 함), (e) UNAUTHORIZED → forceRefresh 재시도.
- **Step 2:** `npx jest features/learning/remote-review-task-store.test.ts` 실패 확인.
- **Step 3:** 구현.
- **Step 4:** 동 테스트 통과.
- **Step 5:** `git commit -m "feat(learning): RemoteReviewTaskStore (서버 동기화 + 미러 폴백)"`

## Task 5 — `ReviewTaskStoreRouter` + 팩토리

**Files:** 신규 `features/learning/review-task-store-router.ts`; 수정 `features/learning/create-learning-history-repository.ts`; 신규 테스트 `features/learning/review-task-store-router.test.ts`

`learning-history-repository-router.ts` 동형:

```ts
export class ReviewTaskStoreRouter implements ReviewTaskStore {
  constructor(private readonly deps: {
    authClient: AuthClient; localStore: ReviewTaskStore; remoteStore: ReviewTaskStore | null;
  }) {}
  private async resolve(accountKey: string): Promise<ReviewTaskStore> {
    const session = await this.deps.authClient.loadSession();
    if (!session) throw new Error('Authentication is required before accessing review tasks.');
    if (session.accountKey !== accountKey) throw new Error('Review task store account mismatch.');
    if (session.status === 'authenticated') {
      if (!this.deps.remoteStore) throw new Error('Remote review task store is not configured for authenticated users.');
      return this.deps.remoteStore;
    }
    return this.deps.localStore;
  }
  async load(a: string) { return (await this.resolve(a)).load(a); }
  async saveAll(a: string, t: ReviewTask[]) { return (await this.resolve(a)).saveAll(a, t); }
  async reset(a: string) { return (await this.resolve(a)).reset(a); }
}
```
`create-learning-history-repository.ts`에 추가:
```ts
export function createReviewTaskStore(authClient: AuthClient): ReviewTaskStore {
  const localStore = new LocalReviewTaskStore();
  const remoteStore = isLearningHistoryRemoteCrudConfigured()
    ? new RemoteReviewTaskStore({
        authClient,
        listReviewTasksUrl: learningHistoryListReviewTasksUrl,
        saveReviewTasksUrl: learningHistorySaveReviewTasksUrl,
      })
    : null;
  return new ReviewTaskStoreRouter({ authClient, localStore, remoteStore });
}
```

- **Step 1 (실패 테스트):** authClient 모킹 — authenticated→remote, guest→local, remote 미구성+authenticated→throw, accountKey 불일치→throw. + `createReviewTaskStore` 스모크.
- **Step 2:** `npx jest features/learning/review-task-store-router.test.ts` 실패.
- **Step 3:** 구현.
- **Step 4:** 통과.
- **Step 5:** `git commit -m "feat(learning): ReviewTaskStoreRouter + createReviewTaskStore 팩토리"`

## Task 6 — provider 노출 + 훅 배선 교체

**Files:** 수정 `features/learner/provider.tsx`, `features/learner/current-learner-controller.ts`(노출 타입 필요 시), `features/quiz/hooks/use-review-session-screen.ts`, `features/quiz/hooks/use-quiz-hub-screen.ts`; 수정 테스트 `use-review-session-screen.test.ts`

- `provider.tsx:75` 인근에서 `createReviewTaskStore(authClient)`를 단일 생성, context로 노출(`learningHistoryRepository`와 동일 경로). `useCurrentLearner()`(또는 동등 훅)에서 `reviewTaskStore` 접근 가능하게.
- `use-review-session-screen.ts:75` `const store = new LocalReviewTaskStore();` 제거 → 훅 내에서 노출된 `reviewTaskStore` 사용. `onComplete`의 `completeReviewTask`/`spawnMistakeReviewTasks` 인자로 그대로 전달(시그니처 불변).
- `use-quiz-hub-screen.ts:25` `const hubReviewStore = new LocalReviewTaskStore();` 제거 → 동일하게 노출 store 사용 (`applyOverduePenalties`/`rescheduleAllReviewNotifications` 인자 교체).
- `use-review-session-screen.test.ts`: store 의존성 주입 방식 변경에 맞춰 mock store 주입 경로 수정(기존 테스트가 LocalReviewTaskStore를 직접 mock했다면 노출 store mock으로 전환). 동작 동일 보장.

- **Step 1 (실패 테스트):** `use-review-session-screen.test.ts`에 "주입된 reviewTaskStore로 complete/spawn이 호출된다(로컬 mock 주입 시 기존과 동일 결과)" 케이스 추가/수정 → 현재 코드(하드코딩)에서 실패.
- **Step 2:** `npx jest features/quiz/hooks/use-review-session-screen.test.ts` 실패 확인.
- **Step 3:** provider 노출 + 두 훅 배선 교체.
- **Step 4:** `npx jest features/quiz/hooks/use-review-session-screen.test.ts features/learning/review-scheduler.test.ts` 통과(회귀 포함).
- **Step 5:** `git commit -m "refactor(quiz): 복습 store를 라우티드 store로 배선 (하드코딩 제거)"`

## Task 7 — 전체 회귀 + 타입 + Expo 검증

**Files:** 없음(검증)

- **Step 1:** `npx jest` 전체 그린.
- **Step 2:** `npx tsc --noEmit` (루트) + `cd functions && npx tsc -p tsconfig.json --noEmit` 그린.
- **Step 3:** 게스트→로그인 전환 검증(스펙 3.5): 기존 `importLocalLearningHistory` 경로가 reviewTasks를 운반함을 코드/테스트로 확인. `ReviewTaskStore.reset` 호출처 grep → 서버 reset 기대 경로 없음 확인(있으면 별도 이슈로 보고, 본 PR 범위 밖).
- **Step 4:** Expo 스모크 — `npx expo start` 후: (a) 게스트 복습 완료 → 로컬 동작 무변, (b) 인증 사용자 복습 완료 → 재진입 시 일정 일관. (네이티브 의존성 변경 없음 → prebuild 불필요. 시뮬레이터 검증 불가 시 그 사실을 PR에 명시.)
- **Step 5:** `git commit -m "test(review-sync): 전체 회귀·타입·전환 검증" --allow-empty` (검증 결과 메모는 PROGRESS.md/PR에).

---

## 자기 점검 (계획 ↔ 스펙)

- 스펙 §3.1~3.5 전부 태스크로 매핑: 헬퍼(T1)·핸들러(T2)·env/게이트(T3)·RemoteStore(T4)·Router/팩토리(T5)·배선(T6)·전환&reset 검증(T7).
- 플레이스홀더 없음: 파일 경로·심볼·테스트 명령·커밋 메시지 구체화. 미확정이던 URL/DI/소비처/러너는 코드로 확정 반영.
- 시그니처 일관: `ReviewTaskStore = {load,saveAll,reset}` 전 태스크 동일. `saveReviewTasks(accountKey, nextTasks): Promise<ReviewTask[]>` 서버/핸들러 일치.
- 리스크(중복/순서): 서버 멱등성으로 안전(T1에서 idempotent 케이스 테스트, T6에서 scheduler 회귀).
- 비범위(FCM/탭가드/중복알림) 침범 없음.
- 네이티브 빌드 규칙: 패키지 변경 없음 → `expo prebuild --clean` 불필요(T7 명시).

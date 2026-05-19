# 학습 기록 재전송 큐 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans 로 task 단위로 구현한다.

**Goal:** `recordAttempt` 원격 POST 실패 시 입력을 로컬 큐에 적재하고 네트워크 복구 시 자동 재전송해 완료된 모의고사/진단/복습 기록 유실을 막는다.
**Architecture:** AsyncStorage 기반 계정별 FIFO 큐 모듈을 신설하고, `FirebaseLearningHistoryRepository.recordAttempt` 실패 폴백에서 enqueue, 성공 시·앱 부팅/로그인 시 flush. 라우터는 authed→firebase 위임, guest→no-op.
**Tech Stack:** TypeScript, React Native, AsyncStorage, Jest.

## File Structure Map

- `features/learning/pending-attempt-queue.ts` (신규): FIFO 큐 영속 (enqueue/load/remove/clear, upsert by attemptId, 상한 50).
- `features/learning/pending-attempt-queue.test.ts` (신규): 큐 단위 테스트.
- `constants/storage-keys.ts` (수정): `pendingAttemptsPrefix` 추가.
- `features/learning/history-repository.ts` (수정): 인터페이스에 `flushPendingAttempts`.
- `features/learning/firebase-learning-history-repository.ts` (수정): enqueue + flush 구현.
- `features/learning/firebase-learning-history-repository.test.ts` (신규): 폴백 enqueue / 성공 flush 테스트.
- `features/learning/local-learning-history-repository.ts` (수정): no-op `flushPendingAttempts`.
- `features/learning/learning-history-repository-router.ts` (수정): 패스스루.
- `features/learner/current-learner-controller.ts` (수정): 부팅/로그인 best-effort flush 배선.

## 사전 확인

- [ ] **Step 0: 테스트 러너 확인** — `npx jest features/learning/local-learning-history-repository.test.ts` 실행, 기존 그린 확인(베이스라인).

---

### Task 1: pending-attempt-queue 모듈 + 테스트

**Files:**
- Create: `features/learning/pending-attempt-queue.ts`
- Modify: `constants/storage-keys.ts`
- Test: `features/learning/pending-attempt-queue.test.ts`

- [ ] **Step 1: storage key 추가** — `constants/storage-keys.ts`의 `StorageKeys` 객체에 `pendingAttemptsPrefix: 'dasida/pending-attempts/'` 추가.
- [ ] **Step 2: 실패 테스트 작성** — `pending-attempt-queue.test.ts`에 다음 케이스 작성(AsyncStorage 모킹은 기존 테스트의 모킹 방식 따름):
  - enqueue 후 load가 동일 순서(FIFO) 반환.
  - 동일 attemptId 재enqueue 시 1건(교체).
  - 51건 enqueue 시 oldest drop, 길이 50.
  - removePendingAttempt(attemptId) 후 해당 항목만 제거.
  - 손상 JSON 항목 스킵 + 나머지 유지.
  - clearPendingAttempts 후 빈 배열.
- [ ] **Step 3: 테스트 실패 확인** — `npx jest features/learning/pending-attempt-queue.test.ts` → 모듈 부재로 실패 확인.
- [ ] **Step 4: 모듈 구현** — `pending-attempt-queue.ts`에 `enqueuePendingAttempt`, `loadPendingAttempts`, `removePendingAttempt`, `clearPendingAttempts` 구현. 키 = `StorageKeys.pendingAttemptsPrefix + accountKey`. upsert by `attemptId`, `MAX_PENDING = 50` oldest-drop + `console.warn`, 항목별 try/catch 파싱.
- [ ] **Step 5: 테스트 통과 확인** — `npx jest features/learning/pending-attempt-queue.test.ts` → 그린.
- [ ] **Step 6: 커밋** — `git add` 위 3파일, `git commit -m "feat(learning): add pending attempt queue store"`.

### Task 2: repository 인터페이스 + 로컬 no-op

**Files:**
- Modify: `features/learning/history-repository.ts`
- Modify: `features/learning/local-learning-history-repository.ts`

- [ ] **Step 1: 인터페이스 확장** — `LearningHistoryRepository` 타입에 `flushPendingAttempts(accountKey: string): Promise<void>` 추가.
- [ ] **Step 2: 로컬 no-op 구현** — `LocalLearningHistoryRepository`에 `async flushPendingAttempts() {}` 추가(게스트는 로컬이 진실원천 → 대상 아님).
- [ ] **Step 3: 타입체크** — `npx tsc --noEmit` 해당 영역 에러 없음 확인.
- [ ] **Step 4: 커밋** — `git commit -m "feat(learning): add flushPendingAttempts to repository interface"`.

### Task 3: FirebaseLearningHistoryRepository enqueue + flush + 테스트

**Files:**
- Modify: `features/learning/firebase-learning-history-repository.ts`
- Test: `features/learning/firebase-learning-history-repository.test.ts`

- [ ] **Step 1: 실패 테스트 작성** — `firebase-learning-history-repository.test.ts` 신규. `withAuthorizedRequest`/api 헬퍼를 모킹해:
  - POST가 NETWORK_ERROR → `enqueuePendingAttempt` 호출됨 + 캐시 폴백 payload 반환(기존 계약).
  - POST 성공 → 큐에 1건 있을 때 flush가 재POST→성공→큐 비움; 빈 큐면 추가 호출 없음.
  - flush 중 항목 POST 실패 → 중단, 나머지 보존.
  - 같은 attemptId 큐 1건(멱등).
- [ ] **Step 2: 테스트 실패 확인** — `npx jest features/learning/firebase-learning-history-repository.test.ts` → 실패.
- [ ] **Step 3: enqueue 구현** — `recordAttempt` catch의 `shouldUseLearningHistoryCacheFallback` 분기에서 `cache.recordAttempt(input)` 전에 `await enqueuePendingAttempt(input)`(실패해도 흐름 유지하도록 try/catch 감쌈).
- [ ] **Step 4: flush 구현** — public `async flushPendingAttempts(accountKey)`: 재진입 가드 인스턴스 플래그 → `loadPendingAttempts` → FIFO 순회: 각 항목 `withAuthorizedRequest`로 `recordLearningAttemptUrl` POST → 성공 시 `cache.cacheRecord` + `removePendingAttempt` → `shouldUseLearningHistoryCacheFallback` 에러면 break(나머지 보존) → 비폴백 에러면 throw.
- [ ] **Step 5: 성공 후 드레인 배선** — `recordAttempt` 성공 경로 `cache.cacheRecord(payload)` 직후 `void this.flushPendingAttempts(input.accountKey).catch(() => {})`.
- [ ] **Step 6: 테스트 통과 확인** — `npx jest features/learning/firebase-learning-history-repository.test.ts` → 그린.
- [ ] **Step 7: 커밋** — `git commit -m "feat(learning): replay failed attempts via pending queue"`.

### Task 4: 라우터 패스스루 + 컨트롤러 배선

**Files:**
- Modify: `features/learning/learning-history-repository-router.ts`
- Modify: `features/learner/current-learner-controller.ts`

- [ ] **Step 1: 라우터 패스스루** — `LearningHistoryRepositoryRouter`에 `async flushPendingAttempts(accountKey) { return (await this.resolveRepository(accountKey)).flushPendingAttempts(accountKey); }`.
- [ ] **Step 2: signIn 배선** — current-learner-controller.ts signIn의 기존 listReviewTasks try/catch(444-449) 인접에 `try { await learningHistoryRepository.flushPendingAttempts(nextSession.accountKey); } catch (e) { console.warn('Failed to flush pending attempts after sign-in.', e); }`.
- [ ] **Step 3: bootstrap 배선** — `readCurrentSnapshot`의 인증 세션 분기에서 동일 best-effort flush 1회(중복 호출 무해, 멱등). 정확 삽입 지점은 세션 accountKey 확보 직후·기존 summary 로드 인접.
- [ ] **Step 4: 타입체크** — `npx tsc --noEmit` 에러 없음.
- [ ] **Step 5: 라우터 테스트(있으면 확장/없으면 스모크)** — authed→firebase flush 위임, guest→local no-op 단위 테스트.
- [ ] **Step 6: 커밋** — `git commit -m "feat(learning): flush pending attempts on bootstrap and sign-in"`.

### Task 5: 회귀 + 마무리

- [ ] **Step 1: 전체 관련 스위트** — `npx jest features/learning` 그린 확인.
- [ ] **Step 2: 타입체크 전체** — `npx tsc --noEmit` 그린.
- [ ] **Step 3: 푸시 + PR** — `git push -u origin claude/sync-exam-data-vcmDw`, 드래프트 PR 생성(요약: 재전송 큐, 적용 범위 모의고사/진단/복습, 비목표 명시).
- [ ] **Step 4: 종료 알림** — `npm run notify:done -- "학습 기록 재전송 큐 구현 + 테스트"` (웹훅 미설정이면 no-op).

## 검증 기준 (완료 정의)

- 인증 사용자 완료 시 POST 실패 → 큐 적재, 사용자 흐름 막힘 없음(기존 반환 계약 유지).
- 다음 성공 / 부팅 / 로그인 중 하나에서 큐 자동 드레인 → 서버 반영.
- 같은 attemptId 재전송 멱등(서버 merge) → 중복 무해.
- 게스트 경로 무영향(no-op).
- 기존 learning 스위트 전부 그린, 타입체크 통과.

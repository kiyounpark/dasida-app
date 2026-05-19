# 학습 기록 재전송 큐 구현 계획 (v2)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans 로 task 단위 구현.
> v2: 독립 검증 반영 — 서버 replay 모드(C1), poison 3분류(C2), 큐 mutex(M1), 계정 assert(M2), 재귀금지 테스트(M5).

**Goal:** `recordAttempt` POST 실패 시 로컬 큐 적재 후 네트워크 복구 시 자동 재전송하되, 재전송이 복습 일정을 후퇴시키지 않고(서버 replay 모드) poison 항목이 큐를 막지 않게 한다.
**Architecture:** AsyncStorage 계정별 FIFO 큐(계정별 async mutex). FirebaseLearningHistoryRepository 실패→enqueue, 성공/부팅/로그인→flush(`replay:true`). 서버 recordLearningAttempt에 replay 모드 추가(attempt·results만 멱등 upsert, reviewTasks 무변경).
**Tech Stack:** TypeScript, React Native, AsyncStorage, Firebase Functions, Jest.

## File Structure Map

- 신규 `features/learning/pending-attempt-queue.ts`: mutex 직렬화 FIFO 큐(enqueue/load/remove/bump/clear, upsert, cap 100 loud, item 8 dead-letter).
- 신규 `features/learning/pending-attempt-queue.test.ts`.
- 신규 `features/learning/firebase-learning-history-repository.test.ts`.
- 수정 `constants/storage-keys.ts`: `pendingAttemptsPrefix`.
- 수정 `features/learning/history-repository.ts`: interface `flushPendingAttempts`.
- 수정 `features/learning/firebase-learning-history-repository.ts`: enqueue + flush(3분류/replay/assert/no-recursion).
- 수정 `features/learning/local-learning-history-repository.ts`: no-op flush.
- 수정 `features/learning/learning-history-repository-router.ts`: 패스스루.
- 수정 `features/learner/current-learner-controller.ts`: bootstrap/signIn best-effort flush.
- 수정 `functions/src/record-learning-attempt.ts`: `replay` 파싱·전달.
- 수정 `functions/src/learning-history.ts`: `recordLearningAttempt(input, { replay })` 분기.
- 수정/신규 `functions/src/learning-history.test.ts`: C1 회귀.

## 사전 확인

- [ ] **Step 0: 베이스라인** — `npx jest features/learning/local-learning-history-repository.test.ts` 그린 확인.

---

### Task 1: 서버 replay 모드 (C1) + 회귀 테스트

**Files:** Modify `functions/src/learning-history.ts`, `functions/src/record-learning-attempt.ts`; Test `functions/src/learning-history.test.ts`

- [ ] **Step 1: C1 실패 테스트** — `learning-history.test.ts`에 server 단위 테스트(기존 functions 테스트 모킹 관례 따름): 기존 reviewTasks에 미완료 `day3`(source=diagnostic, weakness W) 존재 상태에서 동일 source·W를 topWeaknesses로 갖는 stale diagnostic input을 `recordLearningAttempt(input, { replay: true })` → reviewTasks 컬렉션 무변경(day3 보존, day1 미생성), attempt/results는 merge upsert, summary 재빌드. 그리고 `{ replay:false }`(기존)는 종전대로 day3 삭제·day1 생성(회귀 불변 확인).
- [ ] **Step 2: 실패 확인** — `npx jest functions/src/learning-history.test.ts` → replay 미구현으로 실패.
- [ ] **Step 3: 시그니처 변경** — `recordLearningAttempt(input, options?: { replay?: boolean })`. `replay===true`면 `buildReviewTasks`/`diffReviewTasks` 및 reviewTask batch 연산 전부 스킵(attempt·results batch.set merge만), 이후 기존대로 loadLearnerHistory→buildSummary→summary set. `replay` falsy면 기존 코드 경로 그대로.
- [ ] **Step 4: 핸들러 전달** — `record-learning-attempt.ts`: `const replay = request.body?.replay === true;` 파싱 후 `recordLearningAttempt(parsedRequest.data, { replay })`. 스키마 불변(replay는 attempt 형제, 검증 불필요한 boolean coercion).
- [ ] **Step 5: 통과 확인** — `npx jest functions/src/learning-history.test.ts` 그린. `npx tsc --noEmit`(functions) 그린.
- [ ] **Step 6: 커밋** — `git commit -m "feat(functions): add replay mode to recordLearningAttempt (no review-task rebuild)"`.

### Task 2: pending-attempt-queue 모듈 + 테스트 (M1/M3/C2-보강)

**Files:** Create `features/learning/pending-attempt-queue.ts`, `pending-attempt-queue.test.ts`; Modify `constants/storage-keys.ts`

- [ ] **Step 1: storage key** — `StorageKeys`에 `pendingAttemptsPrefix: 'dasida/pending-attempts/'`.
- [ ] **Step 2: 실패 테스트** — 케이스: FIFO 순서, attemptId upsert(attemptCount 보존), removePendingAttempt, bumpAttemptCount, clear, **mutex 직렬화**(동시 enqueue+remove 인터리브 후 무손실), MAX_PENDING=100 초과 oldest-drop + error 로그, MAX_ITEM_ATTEMPTS=8 초과 dead-letter 드롭, 손상 JSON 항목 스킵.
- [ ] **Step 3: 실패 확인** — `npx jest features/learning/pending-attempt-queue.test.ts`.
- [ ] **Step 4: 구현** — 항목 `{ input, attemptCount, enqueuedAt }`. 모듈 내 `Map<accountKey, Promise>` promise-chain mutex로 모든 RMW 직렬화. `enqueuePendingAttempt`(upsert by attemptId), `loadPendingAttempts`(손상 스킵), `removePendingAttempt`, `bumpAttemptCount`, `clearPendingAttempts`. cap 100 oldest-drop+`console.error`+(분석 이벤트 헬퍼 있으면 호출). 항목 attemptCount>8 시 호출측이 dead-letter 판단할 수 있도록 카운트만 책임(드롭 정책은 repo flush가 수행).
- [ ] **Step 5: 통과 확인** — 그린.
- [ ] **Step 6: 커밋** — `git commit -m "feat(learning): add mutex-serialized pending attempt queue"`.

### Task 3: repository 인터페이스 + 로컬 no-op

**Files:** Modify `features/learning/history-repository.ts`, `local-learning-history-repository.ts`

- [ ] **Step 1: 인터페이스** — `LearningHistoryRepository`에 `flushPendingAttempts(accountKey: string): Promise<void>`.
- [ ] **Step 2: 로컬 no-op** — `LocalLearningHistoryRepository.flushPendingAttempts` 빈 async.
- [ ] **Step 3: 타입체크** — `npx tsc --noEmit` 영역 에러 없음.
- [ ] **Step 4: 커밋** — `git commit -m "feat(learning): add flushPendingAttempts to repository interface"`.

### Task 4: Firebase repo enqueue + flush (C2/M2/M5) + 테스트

**Files:** Modify `features/learning/firebase-learning-history-repository.ts`; Test `firebase-learning-history-repository.test.ts`

- [ ] **Step 1: 실패 테스트** — api 헬퍼/`withAuthorizedRequest` 모킹:
  - POST NETWORK_ERROR → enqueue 호출 + 캐시 폴백 payload 반환(기존 계약). enqueue throw mock → 그래도 캐시 폴백 반환(흐름 미차단).
  - POST 성공 → 큐 1건이면 flush가 `{attempt,replay:true}`로 재POST→성공→remove+cacheRecord; 빈 큐 no-op.
  - **C2**: 큐[bad,good], bad=HTTP 400 → bad 드롭+good 전송됨. bad=503 → break, bad 보존, attemptCount+1. bad=401 → break 보존.
  - **M5**: flush 경로가 `this.recordAttempt` 미호출(spy assert).
  - **M2**: 큐 항목 accountKey≠세션 → 드롭+미전송.
- [ ] **Step 2: 실패 확인** — `npx jest features/learning/firebase-learning-history-repository.test.ts`.
- [ ] **Step 3: enqueue** — catch의 `shouldUseLearningHistoryCacheFallback` 분기: `cache.recordAttempt(input)` 전에 `try{ await enqueuePendingAttempt(input) }catch(e){ console.warn }`. 기존 폴백 반환 그대로.
- [ ] **Step 4: flush 구현** — `async flushPendingAttempts(accountKey)`(큐 mutex 하): `loadPendingAttempts` FIFO 순회. (a) `item.input.accountKey!==accountKey` → remove+loud warn, continue. (b) raw `withAuthorizedRequest(accountKey, ...)` → `recordLearningAttemptUrl` POST body `{attempt:item.input, replay:true}`(this.recordAttempt 미호출). (c) 결과 분류 — 성공: `cache.cacheRecord(payload)`+remove, continue. transient(LearningHistoryApiError code NETWORK_ERROR/TIMEOUT 또는 status∈{500,502,503,504}): `bumpAttemptCount`; 새 count>8 → remove+loud warn(dead-letter)+continue, else **break**. UNAUTHORIZED(code UNAUTHORIZED): **break**. permanent(그 외 LearningHistoryApiError, 4xx 등): remove+loud warn(dead-letter)+continue.
- [ ] **Step 5: 성공 후 드레인** — 성공 경로 `cache.cacheRecord(payload)` 직후 `void this.flushPendingAttempts(input.accountKey).catch(()=>{})`.
- [ ] **Step 6: 통과 확인** — 그린.
- [ ] **Step 7: 커밋** — `git commit -m "feat(learning): replay failed attempts with poison handling"`.

### Task 5: 라우터 패스스루 + 컨트롤러 배선

**Files:** Modify `learning-history-repository-router.ts`, `current-learner-controller.ts`

- [ ] **Step 1: 라우터** — `flushPendingAttempts(accountKey)` → `(await this.resolveRepository(accountKey)).flushPendingAttempts(accountKey)`.
- [ ] **Step 2: signIn 배선** — listReviewTasks try/catch(445-449) 인접에 `try{ await learningHistoryRepository.flushPendingAttempts(nextSession.accountKey) }catch(e){ console.warn('Failed to flush pending attempts after sign-in.',e) }`.
- [ ] **Step 3: bootstrap 배선** — `readCurrentSnapshot` 인증 분기, accountKey 확보 직후 동일 best-effort flush 1회(멱등, 중복 무해).
- [ ] **Step 4: 타입체크** — `npx tsc --noEmit` 그린.
- [ ] **Step 5: 라우터 테스트** — authed→firebase 위임, guest→local no-op.
- [ ] **Step 6: 커밋** — `git commit -m "feat(learning): flush pending attempts on bootstrap and sign-in"`.

### Task 6: 회귀 + 마무리

- [ ] **Step 1: 스위트** — `npx jest features/learning` + `npx jest functions/src/learning-history.test.ts` 그린.
- [ ] **Step 2: 타입체크 전체** — `npx tsc --noEmit` 그린.
- [ ] **Step 3: 푸시** — `git push -u origin claude/sync-exam-data-vcmDw`.
- [ ] **Step 4: PR #28 갱신** — 본문을 구현 반영(드래프트 유지 or ready 결정은 사용자 확인).
- [ ] **Step 5: 종료 알림** — `npm run notify:done -- "재전송 큐 + 서버 replay 모드 구현/테스트"`(웹훅 미설정 no-op).

## 검증 기준 (완료 정의)

- 인증 사용자 POST 실패 → 큐 적재, 사용자 흐름·반환 계약 무변.
- 다음 성공/부팅/로그인 중 하나에서 큐 드레인, 서버 반영.
- **재전송이 복습 일정 후퇴·중복 없음**(서버 replay 모드, C1 회귀 테스트 그린).
- **poison(4xx) 항목이 큐 미차단**, 후속 정상 항목 정상 전송(C2 테스트 그린).
- 동시 enqueue/flush 무손실(M1), 계정 스코프 assert(M2), flush 비재귀(M5).
- 게스트 무영향(no-op). 기존 learning·functions 스위트 그린, 타입체크 통과.

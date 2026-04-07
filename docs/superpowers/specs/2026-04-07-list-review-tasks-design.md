# listReviewTasks 설계 문서

날짜: 2026-04-07

---

## 배경

복습 데이터(ReviewTask)는 `recordAttempt` 호출 시 Cloud Function이 Firestore에 저장하고 있다. 그러나 클라이언트가 로그인 후 서버에서 복습 데이터를 가져오는 경로가 없다. 새 기기에서 로그인하거나 로컬 캐시가 초기화된 경우 복습 일정이 사라진다.

모의고사 완료 시에는 `recordAttempt` 응답에 갱신된 reviewTasks가 포함되어 로컬 캐시가 자동 갱신되므로 별도 처리가 필요 없다.

---

## 목표

로그인 직후 서버(Firestore)에서 reviewTasks 전체를 가져와 로컬 캐시에 저장한다.

---

## 범위 밖

- 오프라인 복습 지원 (나중에 전송 큐) — 별도 작업
- 익명 유저 — 기존 로컬 전용 유지
- 모의고사 완료 후 캐시 갱신 — 이미 동작 중

---

## 설계

### 1. Cloud Function — `listReviewTasks`

- **경로**: GET `/listReviewTasks?accountKey=<accountKey>`
- **인증**: 기존 `authenticateLearningHistoryRequest` 동일
- **응답**: `{ reviewTasks: ReviewTask[] }`
- **구현**: `getReviewTasksCollection(accountKey).get()` — 기존 패턴과 동일

파일: `functions/src/list-review-tasks.ts` 신규, `functions/src/index.ts` 등록

### 2. 클라이언트 — `FirebaseLearningHistoryRepository.listReviewTasks`

```ts
async listReviewTasks(accountKey: string): Promise<ReviewTask[]> {
  // GET /listReviewTasks?accountKey=...
  // 성공: 로컬 캐시 저장 후 반환
  // 실패(네트워크): 에러 throw
}
```

- `LearningHistoryRepositoryRouter`에도 라우팅 추가
- `LocalLearningHistoryRepository`에 stub 추가 (익명 유저용 — 로컬 캐시에서 읽기)

### 3. 로그인 초기화 — 동기화 호출

`current-learner-controller.ts`의 `signIn` 함수 내부, 로그인 완료 직후에 호출한다.
- 성공: `reviewTaskStore.saveAll(accountKey, reviewTasks)` → `dasida/review-tasks/${accountKey}` 저장
- 실패(네트워크): 조용히 넘어가거나 에러 전파 — **정책 결정 필요**

> 참고: `buildSnapshot`이 `reviewTaskStore.load(accountKey)`를 통해 홈 상태를 구성하므로,
> `saveAll` 후 `buildSnapshotForSession`을 호출하면 자동으로 최신 복습 데이터가 반영된다.

### 4. 환경 변수

`EXPO_PUBLIC_LIST_REVIEW_TASKS_URL` 추가 (기존 패턴 동일)

---

## 데이터 흐름

```
로그인 완료
  → listReviewTasks GET 호출
  → Cloud Function → Firestore reviewTasks 컬렉션 읽기
  → { reviewTasks } 응답
  → 로컬 캐시(AsyncStorage) 저장
  → 복습 세션 정상 진입 가능

모의고사 완료 (기존 유지)
  → recordAttempt POST
  → 서버 Firestore 갱신 + 응답에 reviewTasks 포함
  → 로컬 캐시 자동 덮어씀
```

---

## 오프라인 처리

인터넷 없는 경우 `listReviewTasks` 실패 → 복습 불가 안내.
오프라인 큐잉은 이 스펙 범위 밖.

---

## 변경 파일 목록

| 파일 | 변경 |
|---|---|
| `functions/src/list-review-tasks.ts` | 신규 |
| `functions/src/index.ts` | 핸들러 등록 |
| `features/learning/firebase-learning-history-repository.ts` | `listReviewTasks` 추가 |
| `features/learning/learning-history-repository-router.ts` | 라우팅 추가 |
| `features/learning/history-repository.ts` | 인터페이스 추가 |
| `features/learning/local-learning-history-repository.ts` | stub 추가 |
| `.env` / `constants/env.ts` | `LIST_REVIEW_TASKS_URL` 추가 |
| `features/learner/current-learner-controller.ts` | `signIn` 함수에 `listReviewTasks` 호출 추가 |

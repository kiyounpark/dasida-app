# 복습 일정 서버 동기화 (1단계) — 설계

- 날짜: 2026-05-18
- 상태: 기획중
- 슬러그: review-schedule-server-sync
- 후속: FCM 서버 주도 푸시 (별도 스펙, 본 작업의 토대 위에 얹음)

## 1. 문제

복습 일정(`reviewTasks`)의 "두뇌"가 둘로 갈라져 split-brain이 발생한다.

- **서버**: 인증 사용자의 `recordAttempt`는 Cloud Function으로 가고, 서버 `buildReviewTasks`가
  시도 기록에서 reviewTasks를 증분 갱신해 Firestore `users/{accountKey}/reviewTasks`에 task별 문서로 저장한다.
- **클라이언트**: `completeReviewTask` / `spawnMistakeReviewTasks` / `applyOverduePenalties`
  (review-scheduler.ts)는 `use-review-session-screen.ts:75`와 `use-quiz-hub-screen.ts`에서
  하드코딩된 `new LocalReviewTaskStore()`(AsyncStorage)만 변경한다. 서버로 전파되지 않는다.

결과: 인증 사용자도 완료 마킹·오답 day1 생성·기한초과 패널티가 폰 로컬에만 남아
기기 변경/재설치 시 유실되고, 다른 기기와 어긋난다.

## 2. 목표 / 비목표

**목표**
- 인증 사용자의 복습 일정 스케줄러 변경(complete/spawn/overdue)을 서버(Firestore)에 영속.
- 게스트/익명 사용자는 기존대로 로컬 유지.
- reviewTasks가 서버에 task별 문서로 쿼리 가능하게 유지 → 후속 FCM 발송 함수의 토대.
- 기존 `LearningHistoryRepositoryRouter` 패턴과 일관.

**비목표 (이번 범위 아님)**
- 스케줄러 로직을 서버로 이전(B안). 현행 클라 유지.
- FCM 발송 함수/스케줄드 잡/푸시 토큰. 별도 후속 스펙.
- 중복 알림 제거, 알림 탭 가드 (별도 작업).

## 3. 접근 (A안: 라우터 미러링)

### 3.1 신규 Cloud Function — `saveReviewTasks` (POST)

- 경로/리전: 기존 learning-history 함수와 동일 패턴 (`asia-northeast3`, cors, invoker public).
- 입력: `{ accountKey: string, reviewTasks: ReviewTask[] }` — 전체 목록(`ReviewTaskStore.saveAll` 의미 그대로).
- 인증: `authenticateLearningHistoryRequest`, **firebase 인증 사용자만**(아니면 403).
- 입력 검증: 기존 `ReviewTaskSchema` 배열, 길이 상한 600(import 스키마와 동일).
- **영속 헬퍼 신설(검토 반영)**: `diffReviewTasks`·`getReviewTasksCollection`은
  learning-history.ts에서 **비공개**라 저수준 export는 지양한다. 대신
  **고수준 `saveReviewTasks(accountKey, nextTasks): Promise<ReviewTask[]>`**
  를 learning-history.ts에 신설한다 — 내부에서 기존 reviewTasks 로드 → `diffReviewTasks` →
  `getReviewTasksCollection`에 batch upsert/delete → 저장된 목록 반환. (recordLearningAttempt의
  reviewTasks 영속 방식과 동형.) Cloud Function 핸들러는 이 헬퍼를 호출하는 얇은 래퍼.
- `functions/src/index.ts`에 `saveReviewTasks`로 export.

### 3.2 클라이언트 — `RemoteReviewTaskStore implements ReviewTaskStore`

`ReviewTaskStore` = `{ load, saveAll, reset }` 인터페이스 그대로 구현.

- `load(accountKey)`: GET `listReviewTasks` (기존 `firebase-learning-history-api` 헬퍼/인증 패턴 재사용)
  → 성공 시 로컬 미러 캐시 갱신 후 반환. 네트워크 실패 시 로컬 캐시 폴백
  (`shouldUseLearningHistoryCacheFallback`와 동일 정책).
- `saveAll(accountKey, tasks)`: POST `saveReviewTasks`. 성공 시 로컬 미러 갱신.
  네트워크 실패 시 **로컬 캐시에 기록**(변경 유실 방지) + 경고 로그 → 다음 동기화 때 재수렴.
- `reset(accountKey)`: 로컬 미러만 클리어. 서버 reset은 기존 계정 초기화 흐름이 담당하므로
  본 store의 책임 밖(명시).

캐시 미러는 기존 `LocalReviewTaskStore`(동일 AsyncStorage 키)를 내부 위임으로 재사용.

### 3.3 클라이언트 — `ReviewTaskStoreRouter implements ReviewTaskStore`

`LearningHistoryRepositoryRouter`와 동형:

- `resolveStore(accountKey)`: 세션 로드 → 없으면 에러 → `accountKey` 불일치 가드
  → `session.status === 'authenticated'`면 `RemoteReviewTaskStore`, 아니면 `LocalReviewTaskStore`.
- 의존성(authClient, listReviewTasksUrl, saveReviewTasksUrl)은 **`create-learning-history-repository.ts`**
  (`createLearningHistoryRepository(authClient)`, 검토로 확정)에서 라우터와 함께 구성.
  여기에 `createReviewTaskStore(authClient)`(또는 동 파일에서 라우티드 store 동반 반환)를 추가.

### 3.4 배선

- `use-review-session-screen.ts:75`, `use-quiz-hub-screen.ts:25`의 하드코딩
  `new LocalReviewTaskStore()` 제거 (둘 다 코드로 확인됨).
- 학습자 provider/controller에서 라우티드 store를 단일 생성해 노출
  (`recordAttempt`를 노출하는 동일 경로). 훅은 그것을 주입받아 사용.

### 3.5 게스트→로그인 전환 (검토 반영)

게스트는 `LocalReviewTaskStore`에 task가 쌓이고, 로그인 시 라우티드 store가 원격으로 전환된다.
기존 `importLocalLearningHistory` / `importAnonymousHistory` 흐름이 reviewTasks를 이미 서버로
운반하므로 **신규 코드 불필요**. 단 플랜에서 "로그인 후 원격 store가 import된 task를 반영"을
검증 항목으로 둔다. 또한 `ReviewTaskStore.reset`을 호출하는 프로덕션 경로가 서버 reset을
기대하지 않는지 플랜에서 확인(현 설계상 reset은 로컬 미러 한정).

## 4. 데이터 흐름 (복습 완료 onComplete)

순서: `recordAttempt` → `completeReviewTask` → `spawnMistakeReviewTasks`
(→ `rescheduleAllReviewNotifications` → `router.back()`).

인증 사용자 기준:

1. `recordAttempt` → 서버. 서버 `buildReviewTasks(input, existing)`가
   weakness-practice 경로에서 활성 task를 completed로 마킹하고 다음 단계 task를 추가
   (id = `createTaskId(stage, weaknessId, sourceId)`, 결정적·멱등).
2. `completeReviewTask` → 라우티드 store. 서버에서 최신 로드 → 활성 task completed +
   다음 단계 추가 → `saveAll`(서버). **서버가 1에서 이미 동일 작업을 했더라도
   task id가 결정적이고 `if (some(id)) return` 가드가 있어 멱등** → 중복 안전.
3. `spawnMistakeReviewTasks` → 서버 buildReviewTasks가 하지 않는 "첫 시도 오답 약점 day1 생성/강등".
   서버에서 최신 로드 → 변형 → `saveAll`(서버). 이 단계가 서버 동기화의 실질 핵심.
4. 알림 재예약은 기존대로(로컬 OS), 동기화된 reviewTasks 기준.

게스트: 1은 로컬 repo, 2~3은 `LocalReviewTaskStore` — 기존과 동일.

## 5. 핵심 리스크와 처리

- **클라 completeReviewTask vs 서버 buildReviewTasks 중복**: 서버 로직이 기존 task 보존·증분·
  결정적 id·idempotent. 따라서 클라 completeReviewTask를 그대로 둬도(A안 원칙: 스케줄러 클라 유지)
  중복 적용이 안전. 별도 분기 없이 (a) 멱등 더블적용 채택. 플랜에서 멱등성 회귀 테스트로 고정.
- **순서/경쟁**: 각 store 연산이 매번 서버에서 fresh load 후 saveAll. `saveReviewTasks`는
  diff 기반 upsert/delete라 마지막 일관 상태로 수렴. 동일 세션 내 순차 실행이라 경쟁 낮음.
- **네트워크 실패**: `saveAll` 실패 시 로컬 미러에 보존 + 다음 `load`/동기화 때 서버와 재수렴.
  최소한 단일 기기 경험은 기존 로컬 수준 유지(퇴행 없음).
- **applyOverduePenalties**: 앱 시작/허브 진입 시 라우티드 store로 동작 → 서버 일정 기준 패널티 후 saveAll.

## 6. 테스트

- 서버(순수 단위, 관례 일치): `computeReviewTaskWrite` diff/sanitize/정렬, `SaveReviewTasksBodySchema`
  accept/reject. (functions 스위트는 Firestore 모킹/에뮬레이터 미사용 — 순수 함수만 단위 테스트.)
- 서버: `buildReviewTasks` 멱등성 — 동일 weakness-practice 입력 + 이미 completed/nextStage 존재 시 불변.
- 서버 I/O(`saveReviewTasks` batch)·`onRequest` 래퍼·인증 분기: 에뮬레이터/Expo 스모크로 검증
  (검증된 `recordLearningAttempt` batch 패턴 미러링이라 단위 모킹 인프라 신설 회피).
- 클라: `RemoteReviewTaskStore` load/saveAll 성공·네트워크 폴백 경로.
- 클라: `ReviewTaskStoreRouter` authed→remote, guest→local 분기.
- 회귀: `review-scheduler.test.ts`가 라우티드 store(로컬 구현 주입)로도 그린 유지.
- Expo: 인증 사용자 복습 완료 → 재로그인/다른 기기 시 일정 일관, 게스트 경로 무영향.

## 7. 영향 파일 (예상)

- 신규: `functions/src/save-review-tasks.ts`(얇은 핸들러), `features/learning/remote-review-task-store.ts`,
  `features/learning/review-task-store-router.ts` (+ 각 테스트).
- 수정: `functions/src/index.ts`(export), `functions/src/learning-history.ts`(고수준
  `saveReviewTasks` 헬퍼 신설), `features/learning/create-learning-history-repository.ts`(라우티드
  store 구성/노출), `features/learner/current-learner-controller.ts` 또는 provider(노출 배선),
  `features/quiz/hooks/use-review-session-screen.ts`, `features/quiz/hooks/use-quiz-hub-screen.ts`,
  `features/learning/firebase-learning-history-api.ts`(saveReviewTasksUrl 추가).

## 8. 자기 점검 / 검토 반영

- 코드 대조 검토 완료. 반영된 수정 3건:
  1. 저수준 헬퍼(diff/collection) 비공개 확인 → 고수준 `saveReviewTasks` 헬퍼 신설로 확정(3.1).
  2. DI 지점을 `create-learning-history-repository.ts`로 명시(3.3).
  3. 게스트→로그인 전환 + reset 검증 항목 신설(3.5).
- 멱등성 전제: 서버 `buildReviewTasks`(learning-history.ts:811) 보존·증분·결정적 id·idempotent
  가드를 코드로 확인.
- 플레이스홀더/미정 항목 없음. 상한값 600은 import 스키마 준용으로 확정.
- 비목표로 FCM·탭가드·중복알림 명시 분리 → 범위 누수 차단.
- 게스트 경로 무영향이 데이터 흐름·테스트·전환 시나리오에 각각 명시됨.

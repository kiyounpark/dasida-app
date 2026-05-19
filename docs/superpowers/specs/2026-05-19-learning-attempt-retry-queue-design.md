# 학습 기록 재전송 큐 — 설계

- 날짜: 2026-05-19
- 상태: 기획중
- 슬러그: learning-attempt-retry-queue

## 1. 문제

인증 사용자가 모의고사·10문제 약점진단·복습 세션을 **완료**하면
`recordAttempt`가 Cloud Function으로 POST된다. 이 POST가 네트워크 실패·타임아웃·5xx면
`FirebaseLearningHistoryRepository.recordAttempt`(firebase-learning-history-repository.ts:102-109)는
로컬 캐시로 폴백하고 끝난다. **재전송·재시도·복구 큐가 없다.**

결과: 사용자가 다 끝낸 시험/진단/복습 한 회차가 그 순간 네트워크가 죽어 있으면
서버에 영영 도달하지 못하고, 다른 기기에도 안 보인다. 조용히(경고 없음), 복구 불가.

발생 빈도는 낮다(완료 직후 단발 POST의 짧은 창). 그러나 (1) 무경고 (2) 복구 불가
(3) 막는 비용이 싸다 → 보험성 작업으로 채택.

## 2. 목표 / 비목표

**목표**
- `recordAttempt` 원격 POST 실패 시 입력 payload를 로컬 영속 큐에 적재.
- 네트워크 복구 후(다음 성공 시 + 앱 부팅 시) 큐를 FIFO로 자동 재전송.
- 모의고사·약점진단·복습 — 셋 모두 같은 `recordAttempt` 길목이라 단일 변경으로 커버.
- `attemptId` 기준 서버 멱등을 활용해 재전송 중복 안전.
- 기존 폴백 동작(로컬 캐시 기록)·단일 기기 경험에 퇴행 없음.

**비목표 (이번 범위 아님)**
- 푸는 도중/복습 도중의 "중간 진행" 동기화(체크포인트). 별도 큰 기능.
- `saveFeaturedExamState` / `saveReviewTasks` 등 다른 쓰기 경로 재전송.
  단 큐 모듈은 그쪽도 후속 확장 가능하게 일반화해 설계(배선만 recordAttempt 한정).
- 알림 동기화(다른 브랜치 진행 중).
- 게스트→로그인 마이그레이션(기존 importLocalLearningHistory가 이미 처리, 무영향 확인만).

## 3. 접근

### 3.1 신규 모듈 — `features/learning/pending-attempt-queue.ts`

AsyncStorage 기반 계정별 FIFO 큐. 저장 단위 = `FinalizedAttemptInput`(서버로 보내는 그 payload).

- 스토리지 키: `StorageKeys.pendingAttemptsPrefix = 'dasida/pending-attempts/'` + accountKey.
- API (일반화, 후속 확장 대비):
  - `enqueuePendingAttempt(input: FinalizedAttemptInput): Promise<void>`
  - `loadPendingAttempts(accountKey: string): Promise<FinalizedAttemptInput[]>`
  - `removePendingAttempt(accountKey: string, attemptId: string): Promise<void>`
  - `clearPendingAttempts(accountKey: string): Promise<void>`
- 상한: 큐 길이 `MAX_PENDING = 50`. 초과 시 가장 오래된 항목 drop + 경고 로그
  (무한 성장 방지; 50회 연속 미전송은 비현실적이므로 실손실 무시 가능).
- 동일 `attemptId` 재적재 시 기존 항목 교체(중복 누적 방지, upsert by attemptId).

### 3.2 `FirebaseLearningHistoryRepository` 변경

- `recordAttempt` 실패 폴백 분기(현 102-109):
  `shouldUseLearningHistoryCacheFallback(error)`면 **로컬 캐시 기록(기존 유지) + 큐 enqueue**
  후 기존대로 캐시 payload 반환. (사용자 흐름은 기존과 동일하게 막힘 없이 진행.)
- `recordAttempt` 성공 직후: 캐시 기록 후 `void this.flushPendingAttempts(accountKey)`
  (fire-and-forget, 실패 swallow — 네트워크가 살아있다는 신호이므로 이때 드레인).
- 신규 public `flushPendingAttempts(accountKey: string): Promise<void>`:
  큐 로드 → FIFO 순회 → 각 항목 `withAuthorizedRequest`로 재POST →
  성공 시 `cache.cacheRecord` + `removePendingAttempt` → 실패(재전송용 폴백 에러)면
  **중단**(나머지 보존, 다음 기회에). 재진입 가드(flush 중복 실행 방지 플래그).

### 3.3 배선 — 부팅/로그인 트리거

`current-learner-controller.ts`의 기존 best-effort 패턴(signIn:444-449의
`listReviewTasks` try/catch)과 동형으로, 인증 세션 확보 지점에서 1회 flush 호출:

- `signIn` 직후(이미 listReviewTasks 호출하는 그 블록에 인접).
- `bootstrap` 경로(재기동 시 복구) — `readCurrentSnapshot` 인증 분기에서 best-effort 1회.
- 호출은 `learningHistoryRepository.flushPendingAttempts(accountKey)`를 try/catch로 감싸
  실패해도 로그인/부팅 흐름에 영향 없음. (라우터는 authed→remote이므로 게스트면 no-op이 되도록
  라우터에 `flushPendingAttempts` 패스스루 추가, 로컬 repo는 빈 구현.)

### 3.4 라우터/인터페이스

`LearningHistoryRepository`에 `flushPendingAttempts(accountKey): Promise<void>` 추가.
- `FirebaseLearningHistoryRepository`: 3.2 구현.
- `LocalLearningHistoryRepository`: no-op(게스트는 큐 대상 아님 — 항상 로컬이 진실원천).
- `LearningHistoryRepositoryRouter`: `resolveRepository` 통해 패스스루.

## 4. 데이터 흐름

1. 완료 → `recordAttempt` POST 실패 → 로컬 캐시 기록(기존) + 큐 enqueue → 사용자엔 성공처럼 보임(기존과 동일, 단 이제 큐에 남음).
2. 이후 같은 계정의 다음 `recordAttempt` 성공 → 성공 직후 `flushPendingAttempts` → 큐 항목 재POST → 서버 도달, 큐 비움.
3. 새 attempt가 없어도 → 다음 앱 부팅/로그인 시 `flushPendingAttempts` → 복구.
4. 서버는 `attemptId`로 merge(멱등) → 폴백 시 실제로는 서버 도달했으나 응답만 유실된 경우라도 재전송 안전(중복 무해).

## 5. 핵심 리스크와 처리

- **중복 전송**: 서버 `recordLearningAttempt`가 `attemptId` 기준 `{ merge: true }`(learning-history.ts:1018, 코드 확인). 재전송 멱등 → 안전.
- **부분 큐 손상**: 항목별 독립 직렬화. 파싱 실패 항목은 스킵+경고(전체 큐 폐기 금지).
- **flush 경쟁(동시 호출)**: 인스턴스 재진입 가드 플래그로 직렬화. 최악의 경우 한 항목 중복 POST → 멱등이라 무해.
- **무한 성장**: MAX_PENDING=50 상한 + oldest-drop.
- **게스트**: 라우터가 local repo로 분기 → flush no-op, enqueue 경로 미진입(로컬이 진실원천). 무영향.
- **계정 불일치**: enqueue/flush 모두 input/세션의 accountKey 키 사용. 라우터의 기존 account mismatch 가드 그대로.

## 6. 테스트

- `pending-attempt-queue.test.ts`: enqueue/load/remove/clear, upsert by attemptId, MAX 상한 oldest-drop, 손상 항목 스킵, 영속(재로드).
- `firebase-learning-history-repository.test.ts`(신규 또는 확장):
  - POST 실패 → 큐 enqueue + 캐시 폴백 반환(기존 반환 계약 유지).
  - POST 성공 → flush가 큐 드레인(성공 항목 제거), 빈 큐면 no-op.
  - flush 중 항목 실패 → 중단, 나머지 보존.
  - 멱등: 같은 attemptId 두 번 → 큐에 1건.
- 라우터: authed→firebase flush 위임, guest→local no-op.
- 회귀: 기존 `local-learning-history-repository.test.ts` 그린 유지.
- Expo 스모크: 인증 사용자 완료 시 비행기모드 → 복귀/재기동 후 서버 반영, 다른 기기에서 확인.

## 7. 영향 파일 (예상)

- 신규: `features/learning/pending-attempt-queue.ts` (+ `.test.ts`),
  `features/learning/firebase-learning-history-repository.test.ts`(없으면 신규).
- 수정: `constants/storage-keys.ts`(pendingAttemptsPrefix),
  `features/learning/history-repository.ts`(인터페이스에 flushPendingAttempts),
  `features/learning/firebase-learning-history-repository.ts`(enqueue/flush),
  `features/learning/local-learning-history-repository.ts`(no-op flush),
  `features/learning/learning-history-repository-router.ts`(패스스루),
  `features/learner/current-learner-controller.ts`(부팅/로그인 best-effort flush 배선).

## 8. 자기 점검

- 단일 길목(`recordAttempt`) 확인: 모의고사 use-exam-result-screen.ts:73,
  진단 :127-140, 복습 use-review-session-screen.ts:537-579 — 모두 동일 메서드 경유(코드 확인).
- 서버 멱등(attemptId merge) 코드 확인 → 재전송 안전 전제 성립.
- 기존 폴백 반환 계약 보존 → 호출부 무변경, 퇴행 없음.
- 비목표(중간 동기화/다른 쓰기 경로/알림) 명시 분리 → 범위 누수 차단.
- 큐 모듈 일반화하되 배선은 recordAttempt 한정(사용자 확정 범위).
- 플레이스홀더/미정 없음. 상한 50은 명시 근거로 확정.

# 학습 기록 재전송 큐 — 설계 (v2, 독립 검증 반영)

- 날짜: 2026-05-19
- 상태: 기획중
- 슬러그: learning-attempt-retry-queue
- 개정: v2 — 1·2차 레드팀 + 독립 리뷰어 교차검증 결과 반영. C1/C2 해소 + M1~M5 보강.

## 1. 문제

인증 사용자가 모의고사·10문제 약점진단·복습 세션을 **완료**하면 `recordAttempt`가
Cloud Function으로 POST된다. 이 POST가 네트워크 실패·타임아웃·5xx면
`FirebaseLearningHistoryRepository.recordAttempt`(firebase-learning-history-repository.ts:102-109)는
로컬 캐시로 폴백만 하고 끝난다. **재전송·복구 큐가 없다.** 결과적으로 완료된 한 회차가
조용히(무경고) 서버에 도달하지 못하고 다른 기기에도 안 보이며 복구 불가.

발생 빈도는 낮으나(완료 직후 단발 POST의 짧은 창) 무경고·복구불가이고 막는 비용이 싸 보험성 채택.

## 2. 목표 / 비목표

**목표**
- `recordAttempt` 원격 POST 실패 시 입력 payload를 로컬 영속 큐에 적재.
- 네트워크 복구 후(다음 성공 시 + 앱 부팅/로그인 시) 큐를 FIFO로 자동 재전송.
- **재전송이 복습 일정/요약을 후퇴·중복시키지 않음**(C1 해소, 서버 replay 모드).
- 영구 실패 항목이 큐 전체를 막지 않음(C2 해소, poison 처리).
- 모의고사·진단·복습 — 셋 모두 같은 `recordAttempt` 길목이라 단일 클라 변경으로 커버.
- 기존 폴백 동작·반환 계약·단일 기기 경험에 퇴행 없음.

**비목표**
- 푸는/복습 도중 "중간 진행" 동기화(체크포인트). 별도 기능.
- `saveFeaturedExamState`/`saveReviewTasks` 등 다른 쓰기 경로 재전송.
  단 큐 모듈은 후속 확장 가능하게 일반화(배선은 recordAttempt 한정).
- 알림 동기화(다른 브랜치).
- 사용자 가시 "동기화 대기" 인디케이터(잔여 리스크 M3 명시 후 수용).

## 3. 접근

### 3.0 핵심 결함과 결정 (검증 산출물)

| ID | 결함 | 해소 |
|----|------|------|
| C1 | 서버 `recordLearningAttempt`가 재전송 시점 **라이브** reviewTasks 기준 `buildReviewTasks` 재구성 → stale 진단/featured-exam 재전송이 day3/day7 미완료 task 삭제·day1 리셋(learning-history.ts:998-1015, 875-880). attemptId merge는 attempt/results 문서에만 멱등, reviewTasks/summary는 순서 의존. | **서버 replay 모드 신설**(3.3). 재전송은 attempt·results만 멱등 upsert, reviewTasks 재구성 스킵. |
| C2 | `shouldUseLearningHistoryCacheFallback`가 400/404까지 fallback로 분류(api.ts:17-22,44-52) → flush가 break → poison 항목이 FIFO head에서 큐 전체 영구 차단, 후속 정상 항목까지 동반 유실. | flush 전용 **3분류 에러 처리**(3.2) + 항목별 시도 카운터 dead-letter. |
| M1 | enqueue vs flush-remove의 AsyncStorage read-modify-write 비원자 → lost-update로 방금 저장분 유실 가능. 인메모리 플래그만으론 부족. | 큐 모듈 **계정별 async mutex**로 모든 변경 직렬화(3.1). |
| M2 | 큐 accountKey 스코프 불변식 미명문/미assert. flush 루프가 item.accountKey==session 미검증. | 불변식 명문화 + flush 루프 accountKey 일치 assert·불일치 스킵(3.2). |
| M3 | cap 초과 silent oldest-drop = 막으려던 그 무경고 유실. | C2 해소로 큐가 실제 비워져 도달 난이도↑. cap 100, drop을 error 레벨 + 분석 이벤트로 시끄럽게. 잔여 리스크로 명시 수용(5). |
| M4 | 로컬 폴백 client buildReviewTasks vs 서버 replay 결과 발산. | flush 성공 시 `cache.cacheRecord`가 서버 payload로 재수렴. 발산은 유한·자가치유로 명시(5). |
| M5 | 성공 경로 flush 재귀 위험. | flush는 raw authorized POST만, `this.recordAttempt` 절대 미호출, 항목 성공이 추가 flush 미유발. 테스트로 고정(6). |

### 3.1 신규 모듈 — `features/learning/pending-attempt-queue.ts`

AsyncStorage 기반 계정별 FIFO 큐. 항목 = `{ input: FinalizedAttemptInput; attemptCount: number; enqueuedAt: string }`.

- 키: `StorageKeys.pendingAttemptsPrefix('dasida/pending-attempts/') + accountKey`.
- **계정별 async mutex**(모듈 내 promise-chain Map<accountKey, Promise>)로 enqueue/remove/clear/flush의
  load-modify-write를 전부 직렬화 → M1 lost-update 차단.
- API:
  - `enqueuePendingAttempt(input)`: upsert by `input.attemptId`(중복 누적 방지), `attemptCount` 보존.
  - `loadPendingAttempts(accountKey)`: FIFO 배열. 손상 항목 try/catch 스킵+경고(전체 폐기 금지).
  - `removePendingAttempt(accountKey, attemptId)`.
  - `bumpAttemptCount(accountKey, attemptId)`: 시도 카운트 +1.
  - `clearPendingAttempts(accountKey)`.
- 상한 `MAX_PENDING = 100`. 초과 시 oldest drop + **error 레벨 로그 + (가능하면) 분석 이벤트**(M3, 시끄럽게).
- 항목별 `MAX_ITEM_ATTEMPTS = 8`: 전송 시도 누적 초과 시 dead-letter(드롭+loud warn) — 무한 wedge 방지(C2 보강).

### 3.2 `FirebaseLearningHistoryRepository` 변경

- **enqueue**: `recordAttempt` catch의 `shouldUseLearningHistoryCacheFallback` 분기에서
  `cache.recordAttempt(input)` 전에 `try { await enqueuePendingAttempt(input) } catch(logwarn)` —
  enqueue 실패해도 기존 캐시 폴백·반환 계약 그대로 진행(M4/Minor: 흐름 미차단).
- **성공 후 드레인**: 성공 경로 `cache.cacheRecord(payload)` 직후
  `void this.flushPendingAttempts(input.accountKey).catch(() => {})`.
- **flush** `flushPendingAttempts(accountKey)`(public, 큐 mutex 하에 실행):
  1. 루프 항목별 `assert item.input.accountKey === accountKey` — 불일치 시 드롭+loud warn(M2).
  2. raw authorized POST(`withAuthorizedRequest` + `recordLearningAttemptUrl`,
     body `{ attempt: input, replay: true }`). **`this.recordAttempt` 절대 미호출**(M5).
  3. 결과별 처리(C2 3분류, `LearningHistoryApiError.status`/`code` 기준 — `shouldUse...` 미사용):
     - 성공: `cache.cacheRecord(payload)` + `removePendingAttempt` → 다음 항목.
     - **transient**(code NETWORK_ERROR/TIMEOUT(status 0), 또는 status∈{500,502,503,504}):
       `bumpAttemptCount`; count>MAX_ITEM_ATTEMPTS면 dead-letter 드롭+loud warn 후 계속,
       아니면 **break**(나머지 보존, 다음 트리거 재시도).
     - **permanent**(기타 4xx: 400/404/409/422 등 — code HTTP_ERROR & status∈4xx\{401,403}):
       해당 항목 **드롭+loud warn(dead-letter)** 후 **continue**(큐 미차단).
     - **UNAUTHORIZED**(401/403, withAuthorizedRequest의 1회 강제리프레시 후에도):
       **break**(보존 — 재로그인 후 가능). poison 아님.
  4. 재진입은 mutex가 직렬화(인메모리 플래그 대체, M1).

### 3.3 서버 — `recordLearningAttempt` replay 모드 (신규, 하위호환)

- `record-learning-attempt.ts` 핸들러: `request.body?.replay`(optional boolean) 파싱,
  `recordLearningAttempt(parsed.data, { replay })` 전달. 미전송 시 false(구 클라 무영향).
- `recordLearningAttempt(input, options?: { replay?: boolean })`:
  - **replay=true**: `buildReviewTasks`/`diffReviewTasks` **전면 스킵**. batch에 attempt(merge)·
    results(merge)만. reviewTasks 컬렉션 **무변경**(삭제·upsert 없음) → C1 후퇴 원천 차단.
    이후 기존대로 `loadLearnerHistory`→`buildSummary`→summary set
    (전체 history 기준이라 순서 무관·정합, 복구된 attempt가 통계에 반영되어 이득).
  - **replay=false/미지정**: 기존 경로 그대로(무변경).
- 입력 스키마(`FinalizedAttemptInputSchema`)는 불변. `replay`는 body 최상위(attempt와 형제).

### 3.4 라우터/인터페이스/배선

- `LearningHistoryRepository`에 `flushPendingAttempts(accountKey): Promise<void>` 추가.
- `LocalLearningHistoryRepository`: no-op(게스트는 큐 대상 아님 — enqueue 미진입, 로컬 진실원천).
- `LearningHistoryRepositoryRouter`: `resolveRepository` 패스스루(authed→firebase, guest→no-op).
- `current-learner-controller.ts`: signIn의 기존 listReviewTasks try/catch(445-449) 인접 +
  bootstrap 인증 분기에서 best-effort `flushPendingAttempts` 1회(try/catch 스왈로).

## 4. 데이터 흐름

1. 완료 → POST 실패 → enqueue(+attemptCount=0) + 기존 캐시 폴백 반환(사용자 흐름 무변).
2. 다음 `recordAttempt` 성공 → 직후 flush → 큐 항목 `replay:true` 재POST.
3. 새 attempt 없어도 → 다음 부팅/로그인 시 flush 복구.
4. 서버: replay → attempt·results만 멱등 upsert, reviewTasks 무변경, summary는 전체 history 재빌드 → **복습 일정 후퇴 없음**.
5. flush 성공 항목은 `cache.cacheRecord`로 로컬을 서버 payload에 재수렴(M4 자가치유).

## 5. 핵심 리스크와 처리

- **C1 후퇴**: 서버 replay 모드로 reviewTasks 재구성 자체를 안 함 → 구조적 제거. 서버 단위테스트로 고정.
- **C2 poison wedge**: 4xx=permanent 드롭+continue, 5xx/network=transient break, 401=break-preserve,
  항목 MAX_ITEM_ATTEMPTS dead-letter. 큐가 항상 진행 → wedge 불가.
- **M1 경쟁**: 계정별 mutex로 enqueue/remove/flush 전 변경 직렬화. 더블송신은 replay 멱등이라 무해(C1 해소로 "멱등=무해" 전제 성립).
- **M2 계정 스코프**: enqueue는 FirebaseLearningHistoryRepository(=authed 전용 라우팅)에서만 발생 — 불변식 명문화. flush 루프 accountKey assert.
- **M3 cap drop**: C2 해소로 100 도달 비현실. drop은 error 로그+분석 이벤트로 가시화. **잔여 리스크로 명시 수용**(사용자 가시 인디케이터는 비목표).
- **M4 발산**: 로컬 폴백 client 계산 vs 서버 replay 결과 차이는 flush 성공 시 cacheRecord 재수렴 + 다음 listReviewTasks GET로 수렴. 유한·자가치유로 수용.
- **M5 재귀**: flush는 raw POST 전용, recordAttempt 미호출, 항목 성공이 flush 미유발. 테스트로 고정.
- **기기 로컬 한계(정직)**: 큐는 기기 로컬. 원본 기기가 끝내 재접속 안 하면(분실/파손) 여전히 유실.
  "영구 유실 → 재접속까지 유실"로 창을 축소할 뿐 제거가 아님. 과대광고 금지.

## 6. 테스트

- `pending-attempt-queue.test.ts`: enqueue/load/remove/clear, attemptId upsert, mutex 직렬화(enqueue 도중 remove 인터리브 무손실), MAX_PENDING loud drop, MAX_ITEM_ATTEMPTS dead-letter, 손상 항목 스킵, 영속.
- `firebase-learning-history-repository.test.ts`:
  - POST 실패 → enqueue + 캐시 폴백 반환(기존 계약 유지), enqueue 예외 시에도 흐름 미차단.
  - 성공 → flush 드레인(`replay:true` 바디 검증), 빈 큐 no-op.
  - **C2**: 항목1 HTTP 400 → 드롭+continue, 항목2 정상 전송됨(큐 미차단). 항목1 503 → break+보존+attemptCount+1. 401 → break 보존.
  - **M5**: flush가 `recordAttempt` 미호출 assert.
  - 멱등: 같은 attemptId 큐 1건.
- 서버 `learning-history` 단위: **C1** — 스케줄 advance(day3 존재) 후 stale diagnostic을 `replay:true`로
  recordLearningAttempt → reviewTasks 컬렉션 무변경(day3 미삭제, day1 미생성), attempt/results merge, summary 재빌드.
  replay=false 경로 회귀 불변.
- 라우터: authed→firebase 위임, guest→no-op.
- 회귀: 기존 `features/learning`·`functions` 스위트 그린, `tsc --noEmit`.
- Expo 스모크: 인증 사용자 완료 시 비행기모드 → 복귀/재기동 후 서버 반영, 진행했던 복습 일정 후퇴 없음, 타 기기 확인.

## 7. 영향 파일

- 신규: `features/learning/pending-attempt-queue.ts`(+test),
  `features/learning/firebase-learning-history-repository.test.ts`.
- 수정: `constants/storage-keys.ts`, `features/learning/history-repository.ts`(interface),
  `features/learning/firebase-learning-history-repository.ts`(enqueue/flush/replay body),
  `features/learning/local-learning-history-repository.ts`(no-op flush),
  `features/learning/learning-history-repository-router.ts`(패스스루),
  `features/learner/current-learner-controller.ts`(배선),
  `functions/src/record-learning-attempt.ts`(replay 파싱·전달),
  `functions/src/learning-history.ts`(`recordLearningAttempt` options.replay 분기),
  `functions/src/learning-history.test.ts`(C1 회귀, 있으면 확장/없으면 신규).

## 8. 자기 점검 / 검증 반영

- 1차 레드팀(C1·C2·큐경쟁·기기로컬 한계) + 사용자 결정(C1=서버 replay 모드) + 독립 리뷰어
  교차검증(C1·C2 확증, M1~M5 정밀화) 전부 반영.
- 서버 replay 분기는 하위호환(구 클라 replay 미전송→기존 경로). 스키마 불변.
- 단일 길목(`recordAttempt`) 재확인: 실사용 3경로 모두 controller `recordAttempt` 경유.
  단 dev-guest seedPreview에 추가 호출부 존재 → "literal single-caller 아님" 명시(범위 무관).
- "attemptId merge=안전" 과확장 오류를 reviewTasks/summary 범위에서 정정(C1).
- 플레이스홀더/미정 없음. 상한 100·항목시도 8은 명시 근거로 확정.

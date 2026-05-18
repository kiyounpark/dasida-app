# 복습 알림 서버 주도 푸시 (2단계, FCM) — 설계

- 날짜: 2026-05-18
- 상태: 기획중
- 슬러그: review-fcm-server-push
- 선행: `review-schedule-server-sync`(1단계) — 본 작업은 1단계가 만든
  task별 reviewTasks 문서 위에 얹는다.

## 1. 문제

현재 복습 알림은 **로컬 OS 스케줄**(`expo-notifications`)이다
(`features/quiz/notifications/review-notification-scheduler.ts`).

- 오늘 due인 대표 task 1건에 대해 아침 7:30 / 저녁 20:00 예약.
- 재예약은 **앱을 열어야** 일어남(`use-notification-opt-in.ts`,
  `use-quiz-hub-screen.ts`의 `rescheduleAllReviewNotifications`).

결과: 사용자가 앱을 며칠 안 열면 새 복습이 생겨도 알림이 안 간다.
복습 리텐션의 핵심인 "이탈한 사용자 끌어오기"가 구조적으로 불가능하다.

1단계로 인증 사용자의 reviewTasks가 서버 Firestore에 task별 문서로
쿼리 가능하게 영속되었으므로, 서버가 앱과 무관하게 due task를 조회해
푸시를 보낼 수 있는 토대가 마련됐다.

## 2. 목표 / 비목표

**목표**
- 인증 사용자에게 앱 실행과 무관하게 서버 주도 복습 알림 발송.
- 발송 시점/대상/문구는 현행 로컬과 동일: 아침 7:30·저녁 20:00(KST),
  "오늘(KST) due이고 미완료인 task가 있을 때만", 기존 카피 재사용.
- 게스트/익명 사용자는 기존 로컬 알림 그대로(무영향).
- 인증 사용자의 로컬 알림 예약 경로는 비활성화해 중복 발송 차단.
- 1단계처럼 배포와 활성을 게이트로 분리(머지·배포·활성 독립).

**비목표 (이번 범위 아님)**
- Raw FCM/APNs 직접 호출. Expo Push 방식 채택(내부적으로 FCM/APNs 사용).
- Expo push receipt 비동기 폴링/재시도.
- overdue(밀린) task 리마인드, 알림 세부 on/off 설정, 딥링크 정교화.
- 전면 요약 doc 동기화(1단계에서 이미 후속으로 분리됨).

## 3. 접근 (Expo Push + collectionGroup 쿼리 + Firestore 게이트)

### 3.1 배달 경로

```
서버 → Expo Push 서비스 → ┬→ (Android) FCM  → 폰
                          └→ (iOS)     APNs → 폰
```

Expo가 FCM/APNs 호출을 대행. 앱은 Expo managed + `expo-notifications`
`~0.32` + firebase JS SDK 구조라 Expo Push가 최소 설정 경로.
RN Firebase/네이티브 APNs 키 작업 불필요.

### 3.2 클라이언트 — 푸시 토큰 등록 + 로컬 비활성

- 알림 권한 grant 시 `getExpoPushTokenAsync()`로 Expo push token 취득,
  `POST registerPushToken`으로 서버에 등록.
  (`getExpoPushTokenAsync`는 EAS projectId 필요 — §8 선행 조건.)
- 토큰 등록 호출은 **인증 사용자**에서만(세션 status='authenticated').
- **인증 사용자는 `scheduleReviewNotifications`/`rescheduleAllReviewNotifications`
  호출 경로를 비활성화**(중복 발송 방지). 게스트/익명은 기존 로컬 유지.
- **전환 시 기존 로컬 알림 취소(필수)**: 인증 경로 진입 시(기존 인증
  사용자 업데이트, 게스트→로그인 전환 포함) 이미 예약돼 있던 `review_*`
  로컬 알림을 1회 취소한다(`rescheduleAllReviewNotifications`의 기존 취소
  로직 재사용 — 단 인증 사용자는 취소 후 재예약하지 않음). 이 단계가
  빠지면 업데이트 직후 기존 예약분 + 서버 푸시가 만료 전까지 중복 수신.
- 비활성 분기 지점: `use-notification-opt-in.ts`(현재 `LocalReviewTaskStore`
  하드코딩 + `scheduleReviewNotifications` 직접 호출),
  `use-quiz-hub-screen.ts`(`rescheduleAllReviewNotifications`).
  세션 status로 분기. 1단계 `ReviewTaskStoreRouter`의 인증 판별과 동일 기준.
- 토큰 등록 URL은 1단계 패턴과 동일하게 `constants/env.ts`에
  `EXPO_PUBLIC_REGISTER_PUSH_TOKEN_URL`로 노출. 미설정이면 등록 스킵
  (앱 측 게이트, 무영향).

### 3.3 서버 — 토큰 저장 함수 `registerPushToken` (POST)

- 경로/리전: 1단계 함수와 동일 패턴(`asia-northeast3`, cors, invoker public).
- 인증: `authenticateLearningHistoryRequest`, firebase 인증 사용자만(아니면 403).
- 입력: `{ accountKey: string, token: string, platform: 'ios'|'android' }`.
  `token`은 Expo push token 형식(`ExponentPushToken[...]`) 검증.
- 저장: `users/{accountKey}` 문서의 `pushTokens` 배열.
  요소 형태 `{ token, platform, updatedAt: ISO }`.
  - 같은 `token`이 이미 있으면 `updatedAt`만 갱신(중복 추가 안 함).
  - 배열 상한 10. 초과 시 가장 오래된 `updatedAt` 제거.
- `functions/src/index.ts`에 export.

### 3.4 서버 — 스케줄드 함수 `sendReviewReminders`

- `firebase-functions/v2/scheduler`의 `onSchedule`.
  리전 `asia-northeast3`, `timeZone: 'Asia/Seoul'`,
  스케줄 2건(아침/저녁) — `'30 7 * * *'`, `'0 20 * * *'`
  (또는 동일 핸들러를 슬롯 인자와 함께 두 정의로 export).
- 동작:
  1. **Firestore 게이트 확인**: `config/notifications` 문서의 `enabled`가
     `true`가 아니면 즉시 종료(로그만). → 콘솔에서 토글, 재배포 불필요.
  2. **collectionGroup 쿼리**: `collectionGroup('reviewTasks')`
     `where('completed','==',false)`
     `where('scheduledFor','>=', `​`${D}T00:00:00.000Z`​`)`
     `where('scheduledFor','<', `​`${Dnext}T00:00:00.000Z`​`)`.
     - **경계 규칙(중요)**: `addDays`(learning-history.ts:473)는
       `new Date(ts).toISOString()` → `scheduledFor`는 완료시각을 유지한
       **UTC `...Z` ISO**. 현행 로컬 due 판정은 `scheduledFor.slice(0,10)
       === today`(저장 문자열의 날짜 앞 10자리). 이 의미와 1:1 일치하려면
       경계를 **KST instant→UTC 변환이 아니라**, 오늘 날짜 라벨
       `D`(=디바이스 로컬=KST 달력 날짜, `toLocalDateString` 기준)에 대해
       **저장 표현과 동일하게** `[`​`${D}T00:00:00.000Z`​`, `​`${Dnext}T00:00:00.000Z`​`)`
       로 잡는다. (KST instant 변환을 쓰면 UTC 15:00~24:00에 완료된
       task가 하루 늦게 발송되어 로컬 동작과 어긋남.)
     - `accountKey`는 결과 doc의 `ref.parent.parent.id`로 추출.
  3. 결과를 `accountKey`별로 dedupe(사용자 1명당 알림 1건).
  4. **슬롯 가드**: `users/{accountKey}`의 `lastReminderSentAt`(슬롯별
     날짜) 확인 — 같은 슬롯(아침/저녁) 같은 날짜 이미 보냈으면 스킵.
  5. 사용자별 `pushTokens` 조회 → Expo Push API 배치 전송
     (`https://exp.host/--/api/v2/push/send`, 100건 단위 청크).
  6. 응답 티켓에서 `DeviceNotRegistered`인 토큰을 `pushTokens`에서 제거.
  7. 발송 성공 시 `lastReminderSentAt` 슬롯/날짜 갱신.
- 메시지 카피: 기존 `scheduleReviewNotifications`의 아침/저녁 title·body·
  `weaknessId→diagnosisMap.labelKo` 라벨 로직을 **순수 함수로 추출해 공유**
  (클라/서버 카피 드리프트 방지). data 페이로드는 기존과 동형
  (`taskId`, `notificationType: 'review_reminder'`).

### 3.5 게이트 (배포/활성 분리)

- 발송 게이트: Firestore `config/notifications.enabled` (서버 런타임 읽기).
  콘솔 토글로 즉시 on/off, 재배포 불필요. 사고 시 즉시 차단.
- 토큰 등록 게이트: `EXPO_PUBLIC_REGISTER_PUSH_TOKEN_URL`(앱 빌드 값).
  미설정이면 등록 스킵 → 함수 배포해도 토큰 0 → 발송 0(이중 안전).
- 두 게이트가 모두 갖춰지기 전까지 사용자 영향 0.

### 3.6 인덱스

collectionGroup `reviewTasks`에 대한 복합 인덱스
(`completed` ASC, `scheduledFor` ASC) 필요. 본 저장소에 firestore.indexes.json
배포 타깃이 없으므로 **콘솔에서 수동 생성**(쿼리 첫 실행 시 Firestore가
콘솔 생성 링크를 에러로 제공 — 그 링크로 1클릭 생성). 핸드오프에 명시.

## 4. 데이터 흐름

**토큰 등록 (인증 사용자, 권한 grant 시)**
1. 권한 grant → `getExpoPushTokenAsync()` → token.
2. `POST registerPushToken` → `users/{accountKey}.pushTokens` upsert.
3. 인증 사용자: 로컬 `scheduleReviewNotifications` 경로 비활성(스킵).

**발송 (서버, KST 7:30 / 20:00)**
1. 게이트 off → 종료.
2. collectionGroup 쿼리로 오늘(KST) 미완료 due task 조회.
3. accountKey dedupe → 슬롯 가드 통과분만.
4. `pushTokens`로 Expo Push 배치 전송 → 무효 토큰 정리 → 슬롯 가드 갱신.

**게스트/익명**: 토큰 등록·서버 발송 경로 모두 미진입.
기존 로컬 스케줄 그대로 — 무영향(테스트로 고정).

## 5. 핵심 리스크와 처리

- **중복 발송(인증 사용자 로컬+서버)**: §3.2에서 인증 사용자 로컬 예약
  경로 비활성. 누락 시 사용자가 2건 수신 → 회귀 테스트로 고정(인증 분기).
- **날짜 경계 의미 불일치(정정 반영)**: 경계는 KST instant→UTC 변환이
  아니라, 오늘 날짜 라벨 `D`에 대해 `[`​`${D}T00:00:00.000Z`​`,
  `​`${Dnext}T00:00:00.000Z`​`)`로 잡아 현행 `scheduledFor.slice(0,10)
  === today`와 1:1 일치(§3.4 경계 규칙). 순수 함수로 분리해 경계값
  단위 테스트: UTC 15:00~23:59에 완료된 task(과거 버그 케이스),
  자정 인접, 라벨 D 계산. 사용자 전원 KST 가정 — 스펙 명시.
- **함수 중복 실행**: 슬롯 가드(`lastReminderSentAt` 슬롯/날짜)로 같은
  슬롯 1일 1회 보장. onSchedule 재시도/중복에도 멱등.
- **무효 토큰 누적**: 발송 응답의 `DeviceNotRegistered` 토큰 즉시 제거 +
  배열 상한 10. receipt 비동기 폴링은 비범위(후속).
- **1단계 미배포 상태에서 2단계 동작**: 1단계 게이트가 꺼져 있으면 서버
  reviewTasks가 비어 collectionGroup 결과 0 → 발송 0. 즉 1단계 배포·
  활성이 2단계 *실효*의 선행 조건(스펙·핸드오프에 명시, 안전 실패).
- **요약 doc staleness**: 1단계와 동일 경계 — 본 작업은 reviewTasks
  서브컬렉션만 읽으므로 영향 없음.

## 6. 테스트

- 서버 순수 단위(1단계 관례 일치, Firestore 모킹/에뮬레이터 미사용):
  - KST→UTC 오늘 범위 계산(7:30/20:00, 자정 경계).
  - accountKey dedupe.
  - 슬롯 가드(같은 슬롯/날짜 재실행 시 스킵).
  - 토큰 upsert(중복 token 갱신, 상한 10 가지치기), 무효 토큰 제거.
  - 입력 스키마 accept/reject(`registerPushToken` body, token 형식).
  - 카피 생성 순수 함수(아침/저녁, label 유/무) — 클라와 동일 출력.
- 클라:
  - 인증 사용자: 토큰 등록 호출 + 로컬 스케줄 경로 비활성.
  - 인증 경로 진입 시 기존 `review_*` 로컬 예약 1회 취소(재예약 안 함).
  - 게스트→로그인 전환: 취소 발생 + 토큰 등록 진입.
  - 게스트/익명: 토큰 등록 미진입 + 로컬 스케줄 기존대로.
  - `EXPO_PUBLIC_REGISTER_PUSH_TOKEN_URL` 미설정 시 등록 스킵.
- 회귀: 기존 `review-notification-scheduler` 게스트 경로 그린 유지.
- 서버 I/O(onSchedule 래퍼·collectionGroup·Expo Push fetch·배치):
  Expo 스모크로 검증(1단계처럼 단위 모킹 인프라 신설 회피).
- Expo 스모크(사용자 몫): 실제 푸시 수신 — 환경 제약으로 자동화 불가.

## 7. 영향 파일 (예상)

- 신규: `functions/src/register-push-token.ts`,
  `functions/src/send-review-reminders.ts`,
  `functions/src/review-reminder-core.ts`(KST 범위·dedupe·슬롯 가드·
  토큰 정리 순수 로직 + 테스트),
  `features/quiz/notifications/review-reminder-copy.ts`(클라/서버 공유
  카피 순수 함수 + 테스트),
  `features/learning/register-push-token-api.ts`(+ 테스트).
- 수정: `functions/src/index.ts`(export 2건),
  `functions/src/learning-history.ts` 또는 신규 모듈(공유 카피 참조),
  `constants/env.ts`(`EXPO_PUBLIC_REGISTER_PUSH_TOKEN_URL`),
  `features/quiz/notifications/review-notification-scheduler.ts`
  (카피 로직 공유 함수로 추출),
  `features/quiz/hooks/use-notification-opt-in.ts`(인증 분기: 토큰 등록
  + 로컬 스케줄 비활성),
  `features/quiz/hooks/use-quiz-hub-screen.ts`(인증 시 reschedule 스킵),
  `functions/package.json`(필요 시 scheduler 의존 — v2 scheduler는
  firebase-functions 포함).

## 8. 사용자 수동 핸드오프 (구현 완료 후 당신이 직접)

구현·테스트 그린 후, 아래를 **순서대로** 직접 수행해야 실제 동작:

0. **(선행) 푸시 자격증명 — 생략 불가**:
   - EAS projectId가 앱 설정에 존재(`getExpoPushTokenAsync`가 요구 —
     없으면 토큰 취득 단계에서 throw).
   - **Android**: Expo/EAS 프로젝트에 **FCM V1 service account 키
     업로드**(없으면 안드로이드 푸시가 조용히 실패 — 에러도 안 남).
   - **iOS**: APNs 키가 EAS에 등록.
   이 3개가 없으면 이후 단계가 모두 통과해도 실제 알림이 안 온다.
1. **(선행) 1단계 배포·활성**:
   `firebase deploy --only functions:saveReviewTasks` →
   출력 URL을 `EXPO_PUBLIC_SAVE_REVIEW_TASKS_URL`에 설정 → 1단계 스모크.
   (이게 안 되면 2단계가 읽을 서버 reviewTasks가 비어 발송 0.)
2. **2단계 함수 배포**:
   `firebase deploy --only functions:registerPushToken,functions:sendReviewReminders`
3. **토큰 등록 URL 설정 + 앱 재빌드**:
   `registerPushToken` 출력 URL을 `EXPO_PUBLIC_REGISTER_PUSH_TOKEN_URL`에
   설정 → 새 빌드(앱 빌드 값이라 재빌드 필요).
4. **인덱스 생성**: `sendReviewReminders` 첫 실행 로그의 Firestore
   인덱스 생성 링크로 복합 인덱스 1클릭 생성(또는 콘솔 수동).
5. **푸시 수신 스모크**: 새 빌드에서 권한 grant → 토큰 등록 확인 →
   실제 알림 수신 확인(아침/저녁 슬롯).
6. **메인 스위치 ON**: Firestore 콘솔에서 `config/notifications.enabled`
   = `true`. → 이때부터 실제 발송 시작. 문제 시 같은 값 `false`로 즉시 차단.

스위치 요약:
- 발송 on/off = Firestore `config/notifications.enabled` (콘솔 토글, 재배포 불필요)
- 토큰 등록 통로 = `EXPO_PUBLIC_REGISTER_PUSH_TOKEN_URL` (앱 값, 재빌드 필요)

## 9. 자기 점검

- 코드 대조: `scheduledFor` ISO 저장(`learning-history.ts:206,254`),
  `addDays`가 `toISOString()` UTC 정규화(`learning-history.ts:473`) →
  경계 규칙 정정(§3.4/§5), `users/{accountKey}` 실제 doc·summary 경로
  (`learning-history.ts:436,452`), 1단계 인증 패턴
  (`learning-history-auth.ts`), 로컬 스케줄 진입점
  (`use-notification-opt-in.ts:12,51,80`, `review-notification-scheduler.ts`)
  확인. firestore.indexes.json 배포 타깃 부재 확인 → 콘솔 생성으로 명시.
- 자기검토 반영 3건: (1) 날짜 경계 KST-instant→날짜라벨 규칙으로 정정,
  (2) 전환 시 기존 로컬 알림 취소 단계 신설(§3.2), (3) 푸시 자격증명
  (EAS projectId·FCM·APNs) §8 선행 0번으로 명시.
- 멱등성: 슬롯 가드로 함수 재시도/중복 실행 안전.
- 게스트 무영향: 데이터 흐름·테스트·리스크에 각각 명시.
- 1단계 의존을 "안전 실패(발송 0)"로 처리 + 핸드오프 1번에 선행 명시.
- 플레이스홀더/미정 없음. 상한 10·청크 100은 확정값(Expo Push 권장 청크).
- 비목표(Raw FCM/receipt 폴링/overdue/세부설정)로 범위 누수 차단.

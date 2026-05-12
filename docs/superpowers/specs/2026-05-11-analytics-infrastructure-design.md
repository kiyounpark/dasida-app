# Design: 분석 인프라 도입 (Firebase Analytics + BigQuery)

생성: 2026-05-11
브랜치: claude/vigilant-elgamal-250661
상태: DRAFT
모드: 분석 인프라

## 문제 정의

DASIDA는 출시 전 단계지만, 사용자 행동 데이터를 측정할 인프라가 없다. 현재 모든 UX 결정(예: "복습 없는 날 모의고사 CTA가 적절한가")이 직관에 의존하고 있으며, 출시 후에도 데이터로 검증할 방법이 없는 상태로 결정이 누적되고 있다.

이 spec의 목적은 **출시 시점에 핵심 사용자 행동을 측정할 수 있는 분석 인프라**를 도입하는 것이다. 결제 모델 결정과 모의고사 CTA UX 결정은 이 인프라가 깔린 *이후*에 데이터를 보며 별도 spec에서 다룬다.

## 현재 상태

### 이미 갖춰진 것
- `firebase` web SDK 설치됨 (`^12.10.0`)
- `google-services.json` (Android Firebase 설정) 저장소에 있음
- 자체 이벤트 로깅 1건 존재: `features/analytics/diagnosis-analytics.ts` — Firestore `users/{uid}/events`에 `diagnosis_completed` 1종만 기록 (쓰기 전용, 읽는 코드 없음)
- `expo-notifications`로 로컬 알림 스케줄링 동작 중

### 없는 것
- Firebase Analytics 패키지 (`@react-native-firebase/analytics`)
- iOS Firebase 설정 파일 (`GoogleService-Info.plist`)
- GA4 대시보드 및 BigQuery 연결
- `screen_view`, `mock_exam_started`, `card_cta_pressed` 등 funnel 추적 이벤트
- 알림 클릭 추적 (`expo-notifications` 응답 리스너에 분석 발화 없음)

## 결정 사항 (전제)

이번 spec에서 합의된 전제:

1. **GA4 + BigQuery export**를 분석 도구로 채택한다 (Firestore 직접 쓰기 방식 폐기).
2. **`@react-native-firebase/analytics`**를 사용한다. web Firebase SDK의 `getAnalytics`는 React Native에서 동작하지 않으며, `expo-firebase-analytics`는 deprecated.
3. **Native module 도입에 따라 `npx expo prebuild --clean` → `npx expo run:ios` 절차가 필수**다.
4. 기존 `diagnosis-analytics.ts`의 Firestore 쓰기는 **폐기**하고 GA4 호출로 교체한다 (외부 인터페이스 `logDiagnosisCompleted`는 유지 가능).
5. **결제 모델 결정은 이 spec 범위 밖**이다. 결제 관련 이벤트는 "스켈레톤"으로만 spec에 명시하고, 실제 코드는 결제 spec에서 추가한다.
6. 모의고사 CTA UX 결정은 이 인프라 가동 후 데이터 보고 별도 spec에서 진행한다.
7. **PII(개인식별정보) 미전송 원칙**: 이메일, 전화번호, 실명, 학교명 등 식별 정보는 어떤 이벤트 파라미터에도 포함하지 않는다. 사용자 식별이 필요한 분석은 Firebase `setUserId(firebaseUid)`만 사용한다 (해시된 UID는 PII 아님). 게스트/익명 사용자는 `setUserId` 호출 없이 이벤트만 발화한다.
8. **익명/게스트 사용자 발화 정책**: GA4 이벤트는 익명 사용자에게도 발화한다 (가입 funnel 추적에 필수). 기존 `diagnosis-analytics.ts`의 "`user:` prefix 없으면 발화 안 함" 정책은 폐기. 단, `setUserId`는 인증된 사용자에게만 호출.
9. **`screen_view` 명명 규칙**: 화면 이름은 expo-router 경로가 아니라 **도메인 이름(snake_case)** 으로 발화한다. 예: `quiz_hub`, `mock_exam_intro`, `review_session`, `weakness_practice`. 라우트 경로가 바뀌어도 분석 연속성을 보장하기 위함.

## 추진 이유 (현재 결정 동기)

- 출시 후 사용자 행동을 모르는 상태로 운영이 시작되면, 모든 후속 결정이 추측의 누적이 된다.
- GA4 + BigQuery는 무료 tier 안에서 시작 가능하며, 표준 분석 도구를 빠르게 제공한다.
- 결제 모델 결정이 다가오는 시점에 "어떤 기능에 사용자가 가치를 느끼는가" 데이터가 있으면 결정 품질이 비약적으로 올라간다.

## 범위

### 포함 (이번 spec)

#### Layer 1: 인프라
- `@react-native-firebase/app`, `@react-native-firebase/analytics` 설치
- iOS `GoogleService-Info.plist` 추가
- `npx expo prebuild --clean` + `npx expo run:ios` 재빌드
- 공통 wrapper 함수 (`features/analytics/log-event.ts` 또는 기존 `features/analytics/` 안에 통합) — GA4 호출 일원화
- `expo-router` 라우트 변경 시 `screen_view` 자동 발화 hook
- `expo-notifications` 응답 리스너에서 `notification_opened` 발화
- `review-notification-scheduler.ts`의 알림 예약 시 `data`에 `type`, `taskId`, `scheduledAt` 같은 식별 정보 포함
- Firebase 콘솔에서 BigQuery export 활성화 (수동 설정 항목으로 spec에 명시)
- 기존 `diagnosis-analytics.ts`의 Firestore 쓰기 폐기 (GA4로 교체)

#### Layer 2: 핵심 12 이벤트

| 이벤트 이름 | 발화 위치 | 파라미터 |
|---|---|---|
| `diagnosis_started` | 진단 시작 hook | `source` |
| `diagnosis_completed` | (기존 발화 위치 유지, 내부 GA4로 교체) | `source`, `weaknessId`, `examId?`, `problemNumber?` |
| `graduation_reached` | `homeState.journey.currentStateKey`가 `journey_graduated`로 전이된 순간 1회 | — |
| `review_started` | 복습 세션 시작 | `taskId` |
| `review_completed` | 복습 세션 완료 | `taskId`, `correctCount`, `totalCount` |
| `mock_exam_started` | 모의고사 진입 | `examId`, `source` (`'no_review_day_card'` / `'exam_selection'` / `'journey_hub'` 등) |
| `mock_exam_completed` | 모의고사 완료 | `examId`, `durationSec`, `correctCount`, `totalCount` |
| `weakness_practice_started` | 약점 보완 시작 | `weaknessId` |
| `weakness_practice_completed` | 약점 보완 완료 | `weaknessId`, `correctCount`, `totalCount` |
| `no_review_day_card_viewed` | `NoReviewDayCard` mount 시 | `daysUntilNextReview` |
| `no_review_day_card_cta_pressed` | 카드 내 CTA 클릭 시 | `daysUntilNextReview` |
| `notification_opened` | `expo-notifications` 응답 리스너 | `notificationType`, `taskId?`, `scheduledAt`, `openedAt` |

> 주: 현재 알림은 복습 알림(`review_reminder`) 한 종류이며 `taskId`로 충분하다. 향후 약점 보완 알림 등 새로운 알림 종류가 추가될 때, 해당 알림 spec에서 `weaknessId?` 등 추가 식별 파라미터를 함께 정의한다.

자동 발화 (코드 추가 불필요): `first_open`, `session_start`, `app_remove`.
`screen_view`는 expo-router 연결 hook으로 자동화.

### 결제 이벤트 스켈레톤 (Phase 2 — 결제 spec 후 활성화)

자리만 잡아둠. 이번 구현에서는 박지 않는다.

- `paywall_viewed` — 파라미터: `source`, `planShown`
- `paywall_dismissed` — 파라미터: `source`, `timeSpentSec`
- `purchase_started` — 파라미터: `planId`, `price`, `currency`
- `purchase` (GA4 표준) — 파라미터: `transactionId`, `planId`, `value`, `currency`
- `purchase_failed` — 파라미터: `planId`, `reason`

구독 모델 채택 시 추가 예정: `trial_started`, `trial_converted`, `trial_canceled`, `subscription_renewed`, `subscription_canceled`, `subscription_expired`.

구현 권장: **RevenueCat** (Firebase Analytics와 자동 연동, 환불/취소/갱신 처리 포함). 최종 결정은 결제 spec에서.

### 제외 (이번 spec 밖)

- 결제 모델 자체 결정 (별도 brainstorming)
- 모의고사 CTA UX 변경 결정 (인프라 가동 후 데이터 기반 별도 spec)
- 미니 모의고사 신설 (검증 안 된 가설)
- 문제 단위(`problem_index`) 세부 이탈 추적 — 1차 출시 후 완료율 보고 정말 낮으면 그때 추가
- 마케팅 캠페인용 UTM 자동 캡처 설정 — 출시 직전 체크리스트로 별도 작업
- 광고 플랫폼(Google Ads, Meta) 연동 — 마케팅 spec에서

## 접근 방식

### 선택: Approach C (인프라 일원화)

세 가지 안을 비교했다.

**Approach A — Firestore 자체 이벤트 확장 (현 구조 유지)**
- 요약: 기존 `users/{uid}/events` 컬렉션을 확장해 모든 이벤트 저장
- 장점: 기존 코드 재사용, 앱 안에서 이벤트 데이터 읽기 가능
- 단점: funnel/retention 분석 도구 없음 (직접 구현), Firestore write 비용 증가, 표준화 부재

**Approach B — GA4 + Firestore 이중 발화**
- 요약: GA4로 분석, Firestore에도 동시 기록 (앱 로직이 읽을 가능성 대비)
- 장점: 양쪽 장점 결합 가능
- 단점: 코드 복잡도 2배, 비용 2배, 현재 Firestore events를 *읽는 코드가 전무* — 이중화의 이득이 없음

**Approach C — GA4 + BigQuery 일원화 (채택)**
- 요약: 분석은 GA4만 사용, Firestore events 컬렉션 폐기
- 장점: 코드 단순, 비용 최저, 표준 분석 도구 풀 활용, BigQuery로 깊은 SQL 분석 가능
- 단점: 앱 안에서 이벤트 읽기 불가 (필요해지면 사용자 프로필/상태에 별도 저장)
- 채택 이유: 현재 Firestore events를 읽는 코드가 한 곳도 없음. 순수 분석 데이터를 분석 전용 도구에 두는 것이 정합적.

## 구현 시 주의 (네이티브 빌드)

CLAUDE.md 규칙에 따른 절차:

```
1. npm install @react-native-firebase/app @react-native-firebase/analytics
2. iOS GoogleService-Info.plist 파일 처리:
   a. Firebase 콘솔에서 iOS 앱 등록 후 GoogleService-Info.plist 다운로드
   b. 저장소 안 안전한 경로(예: config/firebase/GoogleService-Info.plist)에 커밋
   c. app.json / app.config의 @react-native-firebase/app plugin 설정에서
      googleServicesFile: "./config/firebase/GoogleService-Info.plist" 지정
   d. prebuild가 자동으로 ios/{앱이름}/ 경로에 복사
   ※ ios/ 폴더는 prebuild --clean 시 재생성되므로 직접 plist를 ios/ 안에
      두면 안 됨. plugin 설정으로 관리하는 것이 필수.
3. android의 google-services.json도 동일 패턴으로 plugin 설정 추가
4. app.json에 @react-native-firebase/app, @react-native-firebase/analytics
   plugin 명시
5. npx expo prebuild --clean
6. npx expo run:ios
```

이 순서를 어기면 검정화면(JS 번들 로드 실패) 발생.

## 성공 기준

1. iOS, Android 양쪽 빌드에서 GA4 DebugView로 12개 이벤트가 발화되는 것이 확인된다.
2. Firebase 콘솔에서 BigQuery export가 활성화되어 다음 날 BigQuery dataset에 데이터가 도착한다.
3. GA4 탐색(Exploration)에서 다음 funnel이 그려진다:
   - 진단 시작 → 진단 완료
   - 모의고사 시작(`source = 'no_review_day_card'`) → 모의고사 완료
   - 알림 클릭 → 그 직후 복습/모의고사 활동
4. 기존 `logDiagnosisCompleted` 호출 코드는 변경 없이 그대로 동작하며, 내부적으로 GA4로 송신된다.
5. `expo-router` 화면 전환 시 `screen_view`가 자동으로 발화된다.

## 열린 질문

- BigQuery 무료 tier(저장 10GB, 쿼리 1TB/월)를 초과하기 시작하는 사용자 규모 가늠은? (출시 후 운영 시점에 확인)
- `graduation_reached`의 정확한 발화 위치: `homeState` 변경 감지 hook에서 처리할지, journey state 전이 로직 안에서 처리할지. (구현 단계에서 코드 확인 후 결정)
- 만 14세 미만 사용자에 대한 GA4 데이터 수집 정책 — 한국 개인정보보호법상 미성년자 동의 절차 필요. 동의 받기 전까지 익명 발화로 제한할지, 동의 후에만 발화할지. (출시 전 법적 검토 필요)
- 개발 빌드에서 production GA4 프로젝트와 분리할지 (별도 Firebase 프로젝트 vs `__DEV__` 플래그로 발화 차단). 일단 `__DEV__`에서 DebugView로만 보내는 방향이 유력하나, 운영 데이터 오염 방지를 위해 구현 단계에서 확정.

## 의존성

- Firebase 콘솔 접근 권한 (iOS 앱 등록, BigQuery export 토글)
- iOS 빌드 환경 (`GoogleService-Info.plist` 배치 후 prebuild + run:ios 검증 가능)
- 결제 spec(별도 트랙) — 이 spec의 Phase 2 이벤트 활성화는 결제 spec 진행에 의존

## 작업 우선순위 (다음 단계)

이 spec 승인 후:

1. `/superpowers:writing-plans`로 실행 plan 작성 (단계별 작업, 검증 포인트)
2. 구현: 인프라 → 이벤트 박기 → DebugView 검증
3. 출시 → 1~2주 데이터 축적
4. (별도) 결제 모델 brainstorming → 결제 spec → 결제 이벤트 활성화
5. (별도) 모의고사 CTA UX brainstorming (데이터 기반)

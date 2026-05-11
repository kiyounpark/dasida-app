# 분석 인프라 도입 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Firebase Analytics(GA4) + BigQuery export를 DASIDA에 도입하고, 12개 핵심 사용자 행동 이벤트를 박는다. 기존 Firestore 직접 쓰기 방식의 분석 코드는 GA4로 일원화한다.

**Architecture:** `@react-native-firebase/analytics`로 native module 도입 → `features/analytics/log-event.ts` 단일 타입드 wrapper → 화면/훅/컴포넌트에서 wrapper 호출. 알림 응답과 expo-router 라우트 변경은 전용 hook으로 GA4 자동 통합.

**Tech Stack:** React Native (Expo, new arch), `@react-native-firebase/app`, `@react-native-firebase/analytics`, expo-router, expo-notifications, Jest + React Native Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-11-analytics-infrastructure-design.md`

---

## File Structure

새로 만들거나 수정할 파일:

```
features/analytics/
  event-types.ts                          [NEW] 모든 이벤트 이름·파라미터 타입 정의
  log-event.ts                            [NEW] 타입드 wrapper (logEvent, setAnalyticsUserId)
  use-screen-tracking.ts                  [NEW] expo-router 라우트 변경 → screen_view 발화
  diagnosis-analytics.ts                  [MOD] Firestore 제거, GA4 호출로 교체
  __tests__/
    log-event.test.ts                     [NEW]
    diagnosis-analytics.test.ts           [NEW]
    use-screen-tracking.test.tsx          [NEW]

app/_layout.tsx                           [MOD] screen tracking hook 부착, 알림 리스너에서 notification_opened 발화
features/quiz/notifications/
  review-notification-scheduler.ts        [MOD] 알림 예약 시 data에 type/scheduledAt 추가
features/quiz/components/
  no-review-day-card.tsx                  [MOD] viewed/cta_pressed 발화
features/quiz/hooks/
  use-diagnostic-screen.ts                [MOD] diagnosis_started 발화
  use-quiz-hub-screen.ts                  [MOD] graduation_reached 발화 (journey 상태 전이 감지)
features/quiz/exam/hooks/
  use-exam-diagnosis.ts                   [MOD] mock_exam_started/completed 발화
  (모의고사 시작/완료 다른 hook도 동일 패턴)
features/quiz/review/                     [MOD] review_started/completed 발화
features/quiz/weakness/                   [MOD] weakness_practice_started/completed 발화

config/firebase/
  GoogleService-Info.plist                [NEW] Firebase 콘솔에서 다운로드 (수동)
  google-services.json                    [MOVE] 기존 루트의 파일을 이쪽으로 이동

app.json                                  [MOD] plugin 설정 (@react-native-firebase/app, /analytics)
```

설계 원칙:
- 모든 GA4 호출은 `log-event.ts`의 `logEvent(name, params)` 한 곳을 거친다. 타입 안전성 + 호출 위치 grep 용이.
- `event-types.ts`가 single source of truth — 이벤트 이름이나 파라미터 추가 시 여기 먼저.
- 화면별 이벤트 발화는 **컴포넌트가 아니라 hook 안**에서. 컴포넌트는 UI 책임만.

---

## Task 1: Firebase 콘솔 설정 (사용자 수동 작업)

이 작업은 코드가 아니라 외부 콘솔 설정이라 사용자가 직접 수행한다. 완료 전까지 다음 task 진행 불가.

**Files:**
- Create: `config/firebase/GoogleService-Info.plist`
- Move: `google-services.json` → `config/firebase/google-services.json`

- [ ] **Step 1: Firebase 콘솔에서 iOS 앱 등록**

https://console.firebase.google.com → DASIDA 프로젝트 → 설정 → 일반 → 앱 추가 → iOS
- iOS 번들 ID: `com.dasida.app` (app.json의 `expo.ios.bundleIdentifier`와 정확히 일치)
- 앱 닉네임: DASIDA iOS
- App Store ID는 비워둬도 됨

- [ ] **Step 2: GoogleService-Info.plist 다운로드 및 배치**

다운로드한 plist를 `config/firebase/GoogleService-Info.plist`에 저장.

```bash
mkdir -p config/firebase
mv ~/Downloads/GoogleService-Info.plist config/firebase/
```

- [ ] **Step 3: 기존 google-services.json 이동**

```bash
git mv google-services.json config/firebase/google-services.json
```

- [ ] **Step 4: BigQuery export 활성화 (Firebase 콘솔)**

Firebase 콘솔 → 프로젝트 설정 → 통합 → BigQuery → 연결.
- 데이터셋 위치: `us-central1` 또는 `asia-northeast3` (한국 리전 가능)
- 일일 export + 스트리밍 export 둘 다 체크
- Google Analytics 데이터 포함 체크

- [ ] **Step 5: 커밋**

```bash
git add config/firebase/
git rm google-services.json  # 이동했으므로 루트의 원본은 git이 알아서 정리 (mv를 git mv로 했으면 자동)
git commit -m "chore(analytics): add Firebase config files for iOS + relocate Android config"
```

---

## Task 2: 패키지 설치 + app.json plugin 설정

**Files:**
- Modify: `package.json`
- Modify: `app.json`

- [ ] **Step 1: react-native-firebase 패키지 설치**

```bash
npm install @react-native-firebase/app @react-native-firebase/analytics
```

- [ ] **Step 2: app.json plugins 배열에 Firebase plugin 추가**

`app.json`의 `expo.plugins` 배열에 다음 항목을 추가. 기존 `expo-notifications` 항목 위쪽에 삽입.

```json
"plugins": [
  "expo-router",
  "expo-apple-authentication",
  [
    "@react-native-firebase/app",
    {
      "ios": {
        "googleServicesFile": "./config/firebase/GoogleService-Info.plist"
      },
      "android": {
        "googleServicesFile": "./config/firebase/google-services.json"
      }
    }
  ],
  "@react-native-firebase/analytics",
  [
    "expo-notifications",
    ...
```

또한 `expo.android.googleServicesFile`의 기존 값을 `"./config/firebase/google-services.json"`으로 갱신 (이전엔 루트 경로였음).

- [ ] **Step 3: 커밋**

```bash
git add package.json package-lock.json app.json
git commit -m "feat(analytics): install @react-native-firebase + configure plugin"
```

---

## Task 3: prebuild + dev build 검증

**Files:** (없음, 네이티브 폴더 재생성)

- [ ] **Step 1: prebuild --clean 실행**

```bash
npx expo prebuild --clean
```

성공 시 `ios/`, `android/` 폴더가 재생성되며, plist/json 파일이 자동으로 native 프로젝트에 복사됨.

- [ ] **Step 2: ios/{앱이름}/GoogleService-Info.plist 존재 확인**

```bash
find ios -name "GoogleService-Info.plist"
```

기대: `ios/다시다/GoogleService-Info.plist` 또는 유사 경로에 존재.

- [ ] **Step 3: iOS 시뮬레이터에서 빌드 + 실행**

```bash
npx expo run:ios
```

기대: 검정화면 없이 앱 실행, splash → 정상 진입.

- [ ] **Step 4: Firebase 자동 이벤트 발화 확인 (DebugView)**

```bash
# 시뮬레이터에서 GA DebugView 활성화 (iOS)
xcrun simctl launch --console booted com.dasida.app -FIRDebugEnabled
```

Firebase 콘솔 → Analytics → DebugView에서 `first_open`, `session_start` 이벤트가 약 30초~1분 내에 나타나는지 확인.

안 나타나면 `Info.plist`에 `FirebaseAppDelegateProxyEnabled = NO`나 `IS_ANALYTICS_ENABLED = NO` 같은 차단 키 있는지 확인. 없으면 시뮬레이터 재시작.

- [ ] **Step 5: Android 빌드 + 동일 확인**

```bash
npx expo run:android
```

DebugView에서 Android 디바이스도 동일하게 `first_open`/`session_start` 잡히는지.

- [ ] **Step 6: 커밋**

이 시점에 native 폴더가 변경되었으므로 커밋. 단 ios/android/ 폴더 자체를 커밋할지는 프로젝트 정책 확인 필요. 기존 .gitignore에 `ios/`, `android/`가 있다면 prebuild 산출물은 커밋하지 않음.

```bash
git status  # 확인 후
git add -p  # 의미 있는 변경만 (있다면)
git commit -m "chore(analytics): verify Firebase native integration on iOS + Android" --allow-empty
```

---

## Task 4: 이벤트 타입 정의 (event-types.ts)

**Files:**
- Create: `features/analytics/event-types.ts`

- [ ] **Step 1: 타입 파일 작성**

```typescript
// features/analytics/event-types.ts

/**
 * DASIDA에서 발화하는 모든 분석 이벤트의 단일 source of truth.
 * 새 이벤트 추가 시 여기에 먼저 등록.
 */

export type EventName =
  | 'diagnosis_started'
  | 'diagnosis_completed'
  | 'graduation_reached'
  | 'review_started'
  | 'review_completed'
  | 'mock_exam_started'
  | 'mock_exam_completed'
  | 'weakness_practice_started'
  | 'weakness_practice_completed'
  | 'no_review_day_card_viewed'
  | 'no_review_day_card_cta_pressed'
  | 'notification_opened';

export type ExamSource =
  | 'no_review_day_card'
  | 'exam_selection'
  | 'journey_hub'
  | 'other';

export type DiagnosisSource = 'exam' | 'unit';

export type NotificationType = 'review_reminder' | 'unknown';

// 이벤트별 파라미터 스키마 (PII 금지 — 식별 정보는 setUserId만)
export type EventParams = {
  diagnosis_started: { source: DiagnosisSource };
  diagnosis_completed: {
    source: DiagnosisSource;
    weakness_id: string;
    exam_id?: string;
    problem_number?: number;
  };
  graduation_reached: Record<string, never>;
  review_started: { task_id: string };
  review_completed: {
    task_id: string;
    correct_count: number;
    total_count: number;
  };
  mock_exam_started: { exam_id: string; source: ExamSource };
  mock_exam_completed: {
    exam_id: string;
    duration_sec: number;
    correct_count: number;
    total_count: number;
  };
  weakness_practice_started: { weakness_id: string };
  weakness_practice_completed: {
    weakness_id: string;
    correct_count: number;
    total_count: number;
  };
  no_review_day_card_viewed: { days_until_next_review: number };
  no_review_day_card_cta_pressed: { days_until_next_review: number };
  notification_opened: {
    notification_type: NotificationType;
    task_id?: string;
    scheduled_at?: string;
    opened_at: string;
  };
};

/**
 * screen_view 이벤트의 화면 이름 (도메인 이름, snake_case).
 * expo-router 라우트 경로가 아니라 이쪽을 GA4로 전송.
 */
export type ScreenName =
  | 'quiz_hub'
  | 'mock_exam_intro'
  | 'mock_exam_session'
  | 'review_session'
  | 'weakness_practice'
  | 'diagnostic_screen'
  | 'sign_in'
  | 'onboarding'
  | 'history'
  | 'profile'
  | 'unknown';
```

- [ ] **Step 2: 커밋**

```bash
git add features/analytics/event-types.ts
git commit -m "feat(analytics): define event-types single source of truth"
```

---

## Task 5: log-event wrapper (TDD)

**Files:**
- Create: `features/analytics/__tests__/log-event.test.ts`
- Create: `features/analytics/log-event.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// features/analytics/__tests__/log-event.test.ts
import { logEvent, setAnalyticsUserId, logScreenView } from '../log-event';

const mockLogEvent = jest.fn();
const mockSetUserId = jest.fn();
const mockLogScreenView = jest.fn();

jest.mock('@react-native-firebase/analytics', () => ({
  __esModule: true,
  default: () => ({
    logEvent: mockLogEvent,
    setUserId: mockSetUserId,
    logScreenView: mockLogScreenView,
  }),
}));

describe('log-event wrapper', () => {
  beforeEach(() => {
    mockLogEvent.mockReset();
    mockSetUserId.mockReset();
    mockLogScreenView.mockReset();
  });

  describe('logEvent', () => {
    it('forwards event name and params to firebase analytics', () => {
      logEvent('review_started', { task_id: 'task-abc' });
      expect(mockLogEvent).toHaveBeenCalledWith('review_started', {
        task_id: 'task-abc',
      });
    });

    it('forwards events with no params', () => {
      logEvent('graduation_reached', {});
      expect(mockLogEvent).toHaveBeenCalledWith('graduation_reached', {});
    });

    it('does not throw if firebase logEvent rejects', async () => {
      mockLogEvent.mockRejectedValueOnce(new Error('network down'));
      expect(() =>
        logEvent('diagnosis_started', { source: 'exam' }),
      ).not.toThrow();
    });
  });

  describe('setAnalyticsUserId', () => {
    it('calls firebase setUserId with provided uid', () => {
      setAnalyticsUserId('uid-123');
      expect(mockSetUserId).toHaveBeenCalledWith('uid-123');
    });

    it('clears user id when called with null', () => {
      setAnalyticsUserId(null);
      expect(mockSetUserId).toHaveBeenCalledWith(null);
    });
  });

  describe('logScreenView', () => {
    it('calls firebase logScreenView with screen name as both class and name', () => {
      logScreenView('mock_exam_intro');
      expect(mockLogScreenView).toHaveBeenCalledWith({
        screen_name: 'mock_exam_intro',
        screen_class: 'mock_exam_intro',
      });
    });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx jest features/analytics/__tests__/log-event.test.ts
```

기대: `Cannot find module '../log-event'` 같은 에러.

- [ ] **Step 3: log-event.ts 구현**

```typescript
// features/analytics/log-event.ts
import analytics from '@react-native-firebase/analytics';

import type { EventName, EventParams, ScreenName } from './event-types';

/**
 * 모든 GA4 이벤트 발화의 단일 진입점.
 * PII 금지 원칙: params에는 이메일/실명/전화번호 등 식별 정보를 절대 포함하지 않는다.
 *
 * 발화는 fire-and-forget — 분석 실패가 UX에 영향 주면 안 됨.
 */
export function logEvent<K extends EventName>(
  name: K,
  params: EventParams[K],
): void {
  try {
    const result = analytics().logEvent(name as string, params as Record<string, unknown>);
    if (result && typeof (result as Promise<void>).catch === 'function') {
      (result as Promise<void>).catch(() => {});
    }
  } catch {
    // 분석 발화 실패는 무시
  }
}

/**
 * 인증된 사용자에게 Firebase UID를 분석 사용자 식별자로 설정한다.
 * UID는 PII가 아니며 해시된 값. 익명/게스트는 null로 호출.
 */
export function setAnalyticsUserId(uid: string | null): void {
  try {
    const result = analytics().setUserId(uid);
    if (result && typeof (result as Promise<void>).catch === 'function') {
      (result as Promise<void>).catch(() => {});
    }
  } catch {
    // 무시
  }
}

/**
 * 화면 진입 이벤트. screen_class와 screen_name 모두 도메인 이름으로 통일.
 */
export function logScreenView(screen: ScreenName): void {
  try {
    const result = analytics().logScreenView({
      screen_name: screen,
      screen_class: screen,
    });
    if (result && typeof (result as Promise<void>).catch === 'function') {
      (result as Promise<void>).catch(() => {});
    }
  } catch {
    // 무시
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx jest features/analytics/__tests__/log-event.test.ts
```

기대: 모든 테스트 PASS.

- [ ] **Step 5: 커밋**

```bash
git add features/analytics/log-event.ts features/analytics/__tests__/log-event.test.ts
git commit -m "feat(analytics): add typed log-event wrapper with PII-safe API"
```

---

## Task 6: diagnosis-analytics.ts 마이그레이션 (TDD)

기존 Firestore 직접 쓰기를 GA4 호출로 교체. 외부 인터페이스(`logDiagnosisCompleted` 함수 시그니처)는 유지하여 호출부 변경 불필요.

**Files:**
- Modify: `features/analytics/diagnosis-analytics.ts`
- Create: `features/analytics/__tests__/diagnosis-analytics.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// features/analytics/__tests__/diagnosis-analytics.test.ts
import { logDiagnosisCompleted } from '../diagnosis-analytics';
import { logEvent } from '../log-event';

jest.mock('../log-event', () => ({
  logEvent: jest.fn(),
}));

describe('logDiagnosisCompleted (migrated to GA4)', () => {
  beforeEach(() => {
    (logEvent as jest.Mock).mockReset();
  });

  it('fires diagnosis_completed via logEvent for authenticated user', () => {
    logDiagnosisCompleted({
      accountKey: 'user:firebase-uid-abc',
      source: 'exam',
      weaknessId: 'weakness-1',
      examId: 'exam-2024-09',
      problemNumber: 7,
    });

    expect(logEvent).toHaveBeenCalledWith('diagnosis_completed', {
      source: 'exam',
      weakness_id: 'weakness-1',
      exam_id: 'exam-2024-09',
      problem_number: 7,
    });
  });

  it('also fires for anonymous/guest users (no user: prefix)', () => {
    logDiagnosisCompleted({
      accountKey: 'guest:anon-123',
      source: 'unit',
      weaknessId: 'weakness-2',
    });

    expect(logEvent).toHaveBeenCalledWith('diagnosis_completed', {
      source: 'unit',
      weakness_id: 'weakness-2',
    });
  });

  it('omits undefined optional fields from params', () => {
    logDiagnosisCompleted({
      accountKey: 'user:uid',
      source: 'unit',
      weaknessId: 'w-3',
    });

    expect(logEvent).toHaveBeenCalledWith('diagnosis_completed', {
      source: 'unit',
      weakness_id: 'w-3',
    });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx jest features/analytics/__tests__/diagnosis-analytics.test.ts
```

기대: 기존 구현이 Firestore 호출이라 mock된 logEvent가 호출 안 됨 → 실패.

- [ ] **Step 3: diagnosis-analytics.ts 마이그레이션**

```typescript
// features/analytics/diagnosis-analytics.ts
import { logEvent } from './log-event';

export type DiagnosisCompletedSource = 'exam' | 'unit';

export interface LogDiagnosisCompletedParams {
  accountKey: string;
  source: DiagnosisCompletedSource;
  weaknessId: string;
  examId?: string;
  problemNumber?: number;
}

/**
 * 진단 완료 이벤트.
 * 기존 Firestore 직접 쓰기에서 GA4로 마이그레이션됨 (2026-05).
 * accountKey의 user:/guest: 구분 없이 모든 사용자에게 발화 (가입 funnel 추적).
 */
export function logDiagnosisCompleted(params: LogDiagnosisCompletedParams): void {
  const eventParams: {
    source: DiagnosisCompletedSource;
    weakness_id: string;
    exam_id?: string;
    problem_number?: number;
  } = {
    source: params.source,
    weakness_id: params.weaknessId,
  };

  if (params.examId !== undefined) {
    eventParams.exam_id = params.examId;
  }
  if (params.problemNumber !== undefined) {
    eventParams.problem_number = params.problemNumber;
  }

  logEvent('diagnosis_completed', eventParams);
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx jest features/analytics/__tests__/diagnosis-analytics.test.ts
```

기대: PASS.

- [ ] **Step 5: 호출부 회귀 확인**

```bash
grep -rn "logDiagnosisCompleted" --include="*.ts" --include="*.tsx" | grep -v __tests__
```

기대: `use-diagnostic-screen.ts`, `use-exam-diagnosis.ts` 등에서 호출 중. 시그니처 변경 없으므로 수정 불필요.

전체 테스트 돌려 회귀 없는지:
```bash
npx jest features/
```

- [ ] **Step 6: 커밋**

```bash
git add features/analytics/diagnosis-analytics.ts features/analytics/__tests__/diagnosis-analytics.test.ts
git commit -m "refactor(analytics): migrate diagnosis-analytics from Firestore to GA4"
```

---

## Task 7: 인증 사용자에게 setUserId 호출

**Files:**
- Modify: `features/learner/provider.tsx` 또는 `current-learner-controller.ts` (인증 상태 변화 감지 지점)

먼저 위치 파악:

- [ ] **Step 1: 인증 상태 변화 hook 찾기**

```bash
grep -rn "authGateState\|setProfile\|firebaseUid" features/learner/ | head -10
```

찾을 곳: `authGateState`가 `'authenticated'`로 전이되는 지점, 또는 user profile이 로드된 시점.

- [ ] **Step 2: setAnalyticsUserId 호출 추가**

해당 파일에 다음을 추가 (정확한 위치는 step 1에서 찾은 곳):

```typescript
import { setAnalyticsUserId } from '@/features/analytics/log-event';

// 인증 완료 후 user 객체가 있을 때:
useEffect(() => {
  if (authGateState === 'authenticated' && profile?.firebaseUid) {
    setAnalyticsUserId(profile.firebaseUid);
  } else if (authGateState === 'required') {
    setAnalyticsUserId(null);
  }
}, [authGateState, profile?.firebaseUid]);
```

- [ ] **Step 3: 테스트 (mock 기반)**

provider 테스트 파일이 있다면 추가, 없으면 수동 검증으로 대체.

```bash
npx jest features/learner/
```

- [ ] **Step 4: 커밋**

```bash
git add features/learner/
git commit -m "feat(analytics): set Firebase analytics userId on auth"
```

---

## Task 8: screen_view tracking hook (TDD)

**Files:**
- Create: `features/analytics/__tests__/use-screen-tracking.test.tsx`
- Create: `features/analytics/use-screen-tracking.ts`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// features/analytics/__tests__/use-screen-tracking.test.tsx
import { renderHook } from '@testing-library/react-native';
import { useScreenTracking } from '../use-screen-tracking';
import { logScreenView } from '../log-event';

jest.mock('../log-event', () => ({
  logScreenView: jest.fn(),
}));

const segmentsMock = jest.fn<string[], []>();
jest.mock('expo-router', () => ({
  useSegments: () => segmentsMock(),
}));

describe('useScreenTracking', () => {
  beforeEach(() => {
    (logScreenView as jest.Mock).mockReset();
  });

  it('logs quiz_hub when segments=[(tabs), quiz]', () => {
    segmentsMock.mockReturnValue(['(tabs)', 'quiz']);
    renderHook(() => useScreenTracking());
    expect(logScreenView).toHaveBeenCalledWith('quiz_hub');
  });

  it('logs mock_exam_intro for quiz/mock-exam-intro', () => {
    segmentsMock.mockReturnValue(['quiz', 'mock-exam-intro']);
    renderHook(() => useScreenTracking());
    expect(logScreenView).toHaveBeenCalledWith('mock_exam_intro');
  });

  it('logs review_session for quiz/review-session', () => {
    segmentsMock.mockReturnValue(['quiz', 'review-session']);
    renderHook(() => useScreenTracking());
    expect(logScreenView).toHaveBeenCalledWith('review_session');
  });

  it('logs sign_in for sign-in route', () => {
    segmentsMock.mockReturnValue(['sign-in']);
    renderHook(() => useScreenTracking());
    expect(logScreenView).toHaveBeenCalledWith('sign_in');
  });

  it('logs unknown for unmapped route', () => {
    segmentsMock.mockReturnValue(['totally-new-route']);
    renderHook(() => useScreenTracking());
    expect(logScreenView).toHaveBeenCalledWith('unknown');
  });

  it('does not re-fire when segments are unchanged', () => {
    segmentsMock.mockReturnValue(['(tabs)', 'quiz']);
    const { rerender } = renderHook(() => useScreenTracking());
    rerender({});
    expect(logScreenView).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npx jest features/analytics/__tests__/use-screen-tracking.test.tsx
```

- [ ] **Step 3: 구현**

```typescript
// features/analytics/use-screen-tracking.ts
import { useEffect, useRef } from 'react';
import { useSegments } from 'expo-router';

import { logScreenView } from './log-event';
import type { ScreenName } from './event-types';

/**
 * expo-router segments를 GA4 도메인 화면 이름으로 매핑.
 * 라우트 경로가 바뀌어도 이 매핑만 갱신하면 분석 연속성 보장.
 */
function segmentsToScreenName(segments: string[]): ScreenName {
  const key = segments.join('/');
  switch (key) {
    case '(tabs)/quiz':
      return 'quiz_hub';
    case 'quiz/mock-exam-intro':
      return 'mock_exam_intro';
    case 'quiz/mock-exam-session':
      return 'mock_exam_session';
    case 'quiz/review-session':
      return 'review_session';
    case 'quiz/weakness-practice':
      return 'weakness_practice';
    case 'quiz/diagnostic':
      return 'diagnostic_screen';
    case '(tabs)/history':
      return 'history';
    case '(tabs)/profile':
      return 'profile';
    case 'sign-in':
      return 'sign_in';
    case 'onboarding':
      return 'onboarding';
    default:
      return 'unknown';
  }
}

/**
 * expo-router 라우트 변화 시 GA4 screen_view 자동 발화.
 * 같은 화면 재진입은 발화하지 않음 (중복 방지).
 */
export function useScreenTracking(): void {
  const segments = useSegments();
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const key = segments.join('/');
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;

    const screen = segmentsToScreenName(segments as unknown as string[]);
    logScreenView(screen);
  }, [segments]);
}
```

- [ ] **Step 4: 테스트 통과**

```bash
npx jest features/analytics/__tests__/use-screen-tracking.test.tsx
```

- [ ] **Step 5: _layout.tsx에 hook 부착**

`app/_layout.tsx`의 `RootLayout` 안에 추가. `AuthGateRedirector` 옆에 새 컴포넌트로 격리.

```typescript
// app/_layout.tsx 의 imports에 추가:
import { useScreenTracking } from '@/features/analytics/use-screen-tracking';

// AuthGateRedirector 함수 아래에 추가:
function ScreenTracker() {
  useScreenTracking();
  return null;
}

// RootLayout의 JSX 안 <AuthGateRedirector /> 옆에 <ScreenTracker /> 추가:
<SplashGate />
<AuthGateRedirector />
<ScreenTracker />
<Stack>
  ...
```

- [ ] **Step 6: 커밋**

```bash
git add features/analytics/use-screen-tracking.ts features/analytics/__tests__/use-screen-tracking.test.tsx app/_layout.tsx
git commit -m "feat(analytics): auto-fire screen_view on expo-router segment change"
```

---

## Task 9: 알림 응답 추적 (notification_opened)

**Files:**
- Modify: `features/quiz/notifications/review-notification-scheduler.ts`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: scheduler에서 알림 data에 식별 정보 포함**

`review-notification-scheduler.ts`의 `Notifications.scheduleNotificationAsync` 호출 부근을 찾아 `content.data`에 다음 필드 추가:

```typescript
// 변경 전 (예시):
await Notifications.scheduleNotificationAsync({
  content: {
    title: '...',
    body: '...',
    data: { taskId },
  },
  trigger: { ... },
});

// 변경 후:
const scheduledAt = new Date(triggerDate).toISOString();
await Notifications.scheduleNotificationAsync({
  content: {
    title: '...',
    body: '...',
    data: {
      taskId,
      notificationType: 'review_reminder' as const,
      scheduledAt,
    },
  },
  trigger: { ... },
});
```

정확한 위치는 `grep -n "scheduleNotificationAsync" features/quiz/notifications/`로 확인.

- [ ] **Step 2: _layout.tsx의 알림 응답 리스너에 notification_opened 발화 추가**

기존 코드:
```typescript
const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
  const taskId = response.notification.request.content.data?.taskId as string | undefined;
  if (taskId) {
    router.push({ pathname: '/quiz/review-session', params: { taskId } });
  }
});
```

변경:
```typescript
import { logEvent } from '@/features/analytics/log-event';
import type { NotificationType } from '@/features/analytics/event-types';

// ...

const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
  const data = response.notification.request.content.data ?? {};
  const taskId = data.taskId as string | undefined;
  const notificationType = (data.notificationType as NotificationType | undefined) ?? 'unknown';
  const scheduledAt = data.scheduledAt as string | undefined;

  logEvent('notification_opened', {
    notification_type: notificationType,
    task_id: taskId,
    scheduled_at: scheduledAt,
    opened_at: new Date().toISOString(),
  });

  if (taskId) {
    router.push({ pathname: '/quiz/review-session', params: { taskId } });
  }
});
```

cold-start 캡처 부분(`getLastNotificationResponse`)도 동일하게 notification_opened 발화 추가 (앱 종료 상태에서 알림 탭 케이스).

- [ ] **Step 3: 수동 테스트 — 알림 스케줄 → 시뮬레이터에서 탭 → DebugView**

```bash
# 시뮬레이터에서 짧은 시간 뒤 발생하는 테스트 알림 예약 (개발자 도구 화면 활용)
```

기대: 알림 탭 시 DebugView에 `notification_opened` 이벤트 발화 확인.

- [ ] **Step 4: 커밋**

```bash
git add features/quiz/notifications/review-notification-scheduler.ts app/_layout.tsx
git commit -m "feat(analytics): track notification_opened with type + scheduled timing"
```

---

## Task 10: 진단 시작 이벤트 (diagnosis_started)

**Files:**
- Modify: `features/quiz/hooks/use-diagnostic-screen.ts` 그리고 `features/quiz/exam/hooks/use-exam-diagnosis.ts`

- [ ] **Step 1: diagnosis_started 발화 추가**

각 파일에서 진단 시작 지점(보통 첫 문제를 사용자에게 보여주기 직전 또는 hook 마운트 시) 찾기:

```bash
grep -n "logDiagnosisCompleted" features/quiz/hooks/use-diagnostic-screen.ts features/quiz/exam/hooks/use-exam-diagnosis.ts
```

각 파일에 import 추가하고, `useEffect`로 mount 시 발화:

```typescript
import { logEvent } from '@/features/analytics/log-event';

// hook 본문에 추가:
useEffect(() => {
  logEvent('diagnosis_started', { source: 'unit' }); // exam hook은 'exam'
}, []);
```

- [ ] **Step 2: 테스트 회귀 확인**

```bash
npx jest features/quiz/
```

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/hooks/use-diagnostic-screen.ts features/quiz/exam/hooks/use-exam-diagnosis.ts
git commit -m "feat(analytics): fire diagnosis_started at session start"
```

---

## Task 11: 복습 이벤트 (review_started, review_completed)

**Files:**
- Modify: 복습 시작/완료 hook 또는 컴포넌트

- [ ] **Step 1: 복습 세션 시작/완료 지점 찾기**

```bash
grep -rn "review.*session\|reviewCompleted\|onComplete" features/quiz/ --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v test | head -20
```

후보:
- `app/quiz/review-session.tsx` 또는 `features/quiz/review/hooks/use-review-session.ts`
- 완료 핸들러 (`onReviewFinished`, `onSubmitReview` 등)

- [ ] **Step 2: review_started 발화**

```typescript
import { logEvent } from '@/features/analytics/log-event';

// 복습 hook 마운트 시:
useEffect(() => {
  if (taskId) {
    logEvent('review_started', { task_id: taskId });
  }
}, [taskId]);
```

- [ ] **Step 3: review_completed 발화**

```typescript
// 완료 핸들러 안:
function handleReviewComplete(result: ReviewResult) {
  logEvent('review_completed', {
    task_id: taskId,
    correct_count: result.correctCount,
    total_count: result.totalCount,
  });
  // 기존 완료 처리...
}
```

- [ ] **Step 4: 테스트 회귀**

```bash
npx jest features/quiz/
```

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/
git commit -m "feat(analytics): fire review_started + review_completed events"
```

---

## Task 12: 모의고사 이벤트 (mock_exam_started, mock_exam_completed) + source 파라미터

**Files:**
- Modify: 모의고사 진입 화면 + 완료 hook
- Modify: `features/quiz/components/no-review-day-card.tsx` (눌렀을 때 source 전달)
- Modify: `features/quiz/components/exam-selection-screen-view.tsx` (마찬가지)

- [ ] **Step 1: 모의고사 진입 hook 찾기**

```bash
grep -rn "mock.*exam\|mockExam" features/quiz/ --include="*.ts" --include="*.tsx" | grep -v test | head -15
```

후보 파일들:
- `features/quiz/components/mock-exam-intro-screen-view.tsx`
- `features/quiz/exam/...` 시작 hook

- [ ] **Step 2: mock_exam_started 발화 — source 전달 패턴**

핵심: 모의고사 시작 hook이 `source` 파라미터를 받도록 변경. 호출하는 화면(NoReviewDayCard, ExamSelectionScreen 등)이 각자 자기 source를 넘김.

```typescript
// 모의고사 시작 hook (예시):
import type { ExamSource } from '@/features/analytics/event-types';

interface StartMockExamOptions {
  examId: string;
  source: ExamSource;
}

export function startMockExam({ examId, source }: StartMockExamOptions) {
  logEvent('mock_exam_started', { exam_id: examId, source });
  // 기존 시작 로직...
}
```

- [ ] **Step 3: 호출부에서 source 전달**

`no-review-day-card.tsx`의 onPressExam을 호출하는 부모(`quiz-hub-screen-view.tsx` 또는 `use-quiz-hub-screen.ts`)에서 `startMockExam`을 부를 때 `source: 'no_review_day_card'` 전달.

마찬가지로 `exam-selection-screen-view.tsx`에서는 `source: 'exam_selection'`, journey hub에서는 `'journey_hub'`.

- [ ] **Step 4: mock_exam_completed 발화**

완료 화면 또는 완료 핸들러에 추가:

```typescript
function handleExamComplete(result: MockExamResult) {
  logEvent('mock_exam_completed', {
    exam_id: result.examId,
    duration_sec: result.durationSec,
    correct_count: result.correctCount,
    total_count: result.totalCount,
  });
}
```

- [ ] **Step 5: 테스트 회귀**

```bash
npx jest features/quiz/
```

- [ ] **Step 6: 커밋**

```bash
git add features/quiz/
git commit -m "feat(analytics): fire mock_exam_started (with source) + mock_exam_completed"
```

---

## Task 13: 약점 보완 이벤트 (weakness_practice_started/completed)

**Files:**
- Modify: 약점 보완 hook

- [ ] **Step 1: 약점 보완 지점 찾기**

```bash
grep -rn "weakness.*practice\|weaknessPractice" features/quiz/ --include="*.ts" --include="*.tsx" | grep -v test | head -10
```

- [ ] **Step 2: 시작/완료 발화 추가**

```typescript
import { logEvent } from '@/features/analytics/log-event';

// 시작:
useEffect(() => {
  logEvent('weakness_practice_started', { weakness_id: weaknessId });
}, [weaknessId]);

// 완료 핸들러:
function handleComplete(result) {
  logEvent('weakness_practice_completed', {
    weakness_id: weaknessId,
    correct_count: result.correctCount,
    total_count: result.totalCount,
  });
}
```

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/
git commit -m "feat(analytics): fire weakness_practice events"
```

---

## Task 14: NoReviewDayCard 이벤트 (viewed, cta_pressed)

**Files:**
- Modify: `features/quiz/components/no-review-day-card.tsx`

- [ ] **Step 1: viewed 이벤트 (mount 시 발화)**

`no-review-day-card.tsx`에 useEffect 추가:

```typescript
import { useEffect } from 'react';
import { logEvent } from '@/features/analytics/log-event';

export function NoReviewDayCard({ nextTask, onPressExam }: Props) {
  const isTablet = useIsTablet();
  const daysUntil = getDaysUntil(nextTask.scheduledFor);

  useEffect(() => {
    logEvent('no_review_day_card_viewed', {
      days_until_next_review: daysUntil,
    });
  }, [daysUntil]);

  // ... 기존 코드
}
```

- [ ] **Step 2: cta_pressed 이벤트 (CTA 클릭 시)**

`onPressExam`을 wrapping:

```typescript
const handlePressExam = useCallback(() => {
  logEvent('no_review_day_card_cta_pressed', {
    days_until_next_review: daysUntil,
  });
  onPressExam();
}, [daysUntil, onPressExam]);

// Pressable의 onPress를 handlePressExam로 교체
<Pressable style={styles.examBtn} onPress={handlePressExam} accessibilityLabel="모의고사 시작하기">
```

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/components/no-review-day-card.tsx
git commit -m "feat(analytics): track no-review-day card view + CTA press"
```

---

## Task 15: 졸업 도달 이벤트 (graduation_reached)

**Files:**
- Modify: `features/quiz/hooks/use-quiz-hub-screen.ts` 또는 journey state 전이 로직 위치

졸업은 한 번만 발화되어야 한다. 클라이언트 상태로는 매 mount마다 발화될 수 있으므로, **사용자별 로컬 마커**로 중복 방지.

- [ ] **Step 1: journey 상태 전이 감지 지점 결정**

`use-quiz-hub-screen.ts:278`의 `const isGraduated = journey?.currentStateKey === 'journey_graduated';` 가 가장 자연스러운 감지 지점.

- [ ] **Step 2: 발화 + 중복 방지 로직 추가**

```typescript
import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logEvent } from '@/features/analytics/log-event';

// hook 본문 안:
const graduationLoggedRef = useRef(false);

useEffect(() => {
  if (!isGraduated) return;
  if (graduationLoggedRef.current) return;

  const key = `analytics.graduation_logged.${profile?.firebaseUid ?? 'guest'}`;
  void (async () => {
    const already = await AsyncStorage.getItem(key);
    if (already) return;
    logEvent('graduation_reached', {});
    await AsyncStorage.setItem(key, new Date().toISOString());
    graduationLoggedRef.current = true;
  })();
}, [isGraduated, profile?.firebaseUid]);
```

`AsyncStorage` import 경로가 프로젝트 컨벤션과 다를 수 있으니 기존 사용 예 확인:

```bash
grep -rn "AsyncStorage" features/ --include="*.ts" | head -5
```

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/hooks/use-quiz-hub-screen.ts
git commit -m "feat(analytics): fire graduation_reached once per user lifetime"
```

---

## Task 16: 통합 검증 — DebugView 전수 확인 + spec 성공 기준 매핑

이 task는 코드 변경이 없는 수동 검증 task. 모든 이벤트가 실제 device/시뮬레이터에서 발화되는지 확인.

- [ ] **Step 1: DebugView 활성화 후 빌드 실행**

iOS:
```bash
xcrun simctl launch --console booted com.dasida.app -FIRDebugEnabled
# 또는 Xcode scheme arguments에 -FIRDebugEnabled 추가
```

Android:
```bash
adb shell setprop debug.firebase.analytics.app com.dasida.app
```

- [ ] **Step 2: 12개 이벤트 발화 시나리오 모두 수행**

각 시나리오를 손으로 돌며 DebugView 우측 패널에 이벤트가 뜨는지 확인. 체크리스트:

- [ ] 앱 첫 진입 → `first_open` (자동)
- [ ] 화면 진입 → `screen_view` (`screen_name`이 도메인 이름인지 확인)
- [ ] 진단 시작 시 → `diagnosis_started`
- [ ] 진단 10문제 완료 → `diagnosis_completed`
- [ ] 졸업 도달 → `graduation_reached` (한 번만)
- [ ] 같은 사용자 재진입 시 graduation_reached 재발화 안 됨 확인
- [ ] 복습 시작 → `review_started`
- [ ] 복습 완료 → `review_completed`
- [ ] 모의고사 진입(no-review-day 카드 경유) → `mock_exam_started` with `source=no_review_day_card`
- [ ] 모의고사 진입(목록 경유) → `mock_exam_started` with `source=exam_selection`
- [ ] 모의고사 완료 → `mock_exam_completed`
- [ ] 약점 보완 시작/완료 → `weakness_practice_started`/`_completed`
- [ ] 복습 없는 날 카드 노출 → `no_review_day_card_viewed`
- [ ] 카드 CTA 클릭 → `no_review_day_card_cta_pressed`
- [ ] 알림 탭 → `notification_opened`

- [ ] **Step 3: BigQuery 데이터 도착 확인 (24시간 후)**

다음 날 Firebase 콘솔 → BigQuery에서:
```sql
SELECT event_name, COUNT(*)
FROM `<프로젝트ID>.analytics_<속성ID>.events_*`
WHERE _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
GROUP BY event_name
ORDER BY COUNT(*) DESC;
```

기대: 위 12개 이벤트 + 자동 이벤트가 행으로 출력.

- [ ] **Step 4: spec 성공 기준 매핑 확인**

spec의 "성공 기준" 5개 항목을 다시 읽고, 각각 만족했는지 체크:

1. iOS+Android 양쪽에서 12개 이벤트 발화 — 위 체크리스트로 확인
2. BigQuery export에 데이터 도착 — Step 3
3. funnel 그리기 — GA4 탐색에서 직접 3개 funnel 생성:
   - [ ] 진단 시작 → 완료
   - [ ] mock_exam_started (source=no_review_day_card) → mock_exam_completed
   - [ ] notification_opened → 직후 review_started 또는 mock_exam_started
4. `logDiagnosisCompleted` 호출부 변경 없이 동작 — Task 6에서 회귀 테스트 통과로 확인됨
5. screen_view 자동 발화 — Step 2 첫 항목

- [ ] **Step 5: 최종 커밋 (검증 보고서)**

```bash
# 검증 보고서를 spec 폴더에 첨부 (선택)
cat > docs/superpowers/specs/2026-05-11-analytics-infrastructure-verification.md <<EOF
# 분석 인프라 도입 검증 결과 (2026-MM-DD)

## DebugView 발화 확인
- (위 12개 항목 체크 결과)

## BigQuery 데이터 확인
- (쿼리 결과 요약)

## 성공 기준 매핑
- (5개 항목 매핑)
EOF

git add docs/superpowers/specs/2026-05-11-analytics-infrastructure-verification.md
git commit -m "docs(analytics): add verification report for analytics infrastructure rollout"
```

---

## Self-Review 메모

이 plan에서 의도적으로 *간략하게* 처리한 부분 (작성자가 인지하고 있는 trade-off):

1. **Task 11, 12, 13, 15는 정확한 코드 경로 파악을 task 내부 grep에 위임.** 코드베이스가 큰 편이라 plan 작성 단계에서 모든 hook 위치를 미리 단정하는 것보다, 실행 단계에서 grep으로 확인하는 게 정확함. 단 grep 명령은 명시함.

2. **TDD는 wrapper 레이어(Task 5)와 마이그레이션(Task 6, 8)에만 엄격 적용.** 화면별 이벤트 발화는 mock 기반 unit test로 검증하면 의의보다 비용이 큼 — DebugView 수동 검증(Task 16)으로 대체.

3. **Phase 2 (결제 이벤트)는 이 plan 범위 밖.** spec에서 명시한 대로 별도 결제 spec/plan에서 처리.

4. **iOS 네이티브 폴더 커밋 정책은 프로젝트 컨벤션 확인 후 결정 (Task 3 Step 6).** Expo 권장은 `ios/`, `android/`를 `.gitignore`에 두는 것.

5. **`graduation_reached` 중복 방지에 AsyncStorage 사용.** 서버 측 멱등 보장이 더 견고하지만, 분석 이벤트 정도라면 클라이언트 단 마커로 충분.

## 실행 핸드오프

**Plan 작성 완료. 저장 위치: `docs/superpowers/plans/2026-05-11-analytics-infrastructure.md`**

두 가지 실행 옵션:

**1. Subagent-Driven (권장)** — 매 task마다 새 subagent를 dispatch, task 간 검토. 빠른 반복.

**2. Inline Execution** — 현재 세션에서 직접 실행. executing-plans 스킬로 batch 진행, 체크포인트 검토.

**어느 쪽으로 가시겠어요?**

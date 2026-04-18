# 여정 완주 → 새로운 시작 화면 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 약점 연습 완료 후 "이제 새로운 시작이에요!" 축하 화면을 보여주고, 사용자가 버튼을 눌러 졸업하면 JourneyBoard가 영구 숨겨지고 QuizHubScreen으로 이동한다.

**Architecture:** `step-complete(practice)` 화면 콘텐츠를 교체하고 진행 점 애니메이션을 추가한다. `use-step-complete-screen.ts`에서 `graduateToPractice()` 호출을 연결하고, `index.tsx`에서 `MockExamIntroScreen` 분기를 제거한다. `quiz-hub-screen-view.tsx`의 JourneyBoard 조건을 단순화하고, `use-quiz-hub-screen.ts`에서 exam 단계의 CTA 레이블과 동작을 "실전 여정으로 떠나기 →" + 직접 졸업 처리로 변경한다.

**Tech Stack:** React Native Animated API, Expo Router, Firestore (기존 `graduateToPractice()` 활용)

---

## 파일 맵

| 파일 | 변경 종류 |
|------|----------|
| `assets/images/characters/char_sparkle_sunglasses.png` | 신규 생성 (Python crop) |
| `features/quiz/components/step-complete-screen-view.tsx` | 수정 — practice 콘텐츠 교체 + 진행 점 애니 + 자동전진 제거 |
| `features/quiz/hooks/use-step-complete-screen.ts` | 수정 — `graduateToPractice()` 연결 |
| `app/(tabs)/quiz/index.tsx` | 수정 — MockExamIntroScreen 분기 제거 |
| `features/quiz/components/quiz-hub-screen-view.tsx` | 수정 — JourneyBoard 조건 단순화 |
| `features/quiz/hooks/use-quiz-hub-screen.ts` | 수정 — exam CTA "실전 여정으로 떠나기" + 졸업 처리 |

---

## Task 1: 캐릭터 에셋 크롭

**Files:**
- Create: `assets/images/characters/char_sparkle_sunglasses.png`

- [ ] **Step 1: Python 크롭 실행**

```bash
python3 << 'EOF'
from PIL import Image

img = Image.open('/Users/baggiyun/Downloads/IMG_1846 (1).png').convert('RGBA')
crop = img.crop((4400, 6600, 6100, 8150))

size = 330
ratio = min(size / crop.width, size / crop.height) * 0.85
new_w = int(crop.width * ratio)
new_h = int(crop.height * ratio)
crop = crop.resize((new_w, new_h), Image.LANCZOS)

canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
canvas.paste(crop, ((size - new_w) // 2, (size - new_h) // 2), crop)
canvas.save('assets/images/characters/char_sparkle_sunglasses.png')
print("Done:", canvas.size)
EOF
```

Expected output: `Done: (330, 330)`

- [ ] **Step 2: 파일 존재 확인**

```bash
ls -lh assets/images/characters/char_sparkle_sunglasses.png
```

Expected: 파일 크기가 표시됨 (수십 KB 이상)

- [ ] **Step 3: Commit**

```bash
git add assets/images/characters/char_sparkle_sunglasses.png
git commit -m "feat: 스파클 선글라스 캐릭터 에셋 추가"
```

---

## Task 2: step-complete(practice) 화면 — 콘텐츠 교체 + 자동전진 제거

**Files:**
- Modify: `features/quiz/components/step-complete-screen-view.tsx`

현재 `AUTO_ADVANCE_SECONDS = 3`이 모든 스텝에 적용된다. `practice`만 자동전진을 끄기 위해 `STEP_CONFIG`에 `autoAdvanceSeconds` 필드를 추가한다.

- [ ] **Step 1: STEP_CONFIG와 자동전진 로직 교체**

`features/quiz/components/step-complete-screen-view.tsx` 전체를 아래 내용으로 교체한다:

```tsx
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { FontFamilies } from '@/constants/typography';
import type { StepCompleteKey } from '@/features/quiz/hooks/use-step-complete-screen';

type StepConfig = {
  charImage: number;
  title: string;
  body: string;
  nextLabel: string;
  accentColor: string;
  backgroundColor: string;
  autoAdvanceSeconds: number;
};

const STEP_CONFIG: Record<StepCompleteKey, StepConfig> = {
  diagnostic: {
    charImage: require('../../../assets/images/characters/char_04.png'),
    title: '진단 완료!',
    body: '10문제로 약점을 찾았어요.\n이제 약점을 분석할게요.',
    nextLabel: '약점 분석 시작하기',
    accentColor: '#6366f1',
    backgroundColor: '#f5f3ff',
    autoAdvanceSeconds: 3,
  },
  analysis: {
    charImage: require('../../../assets/images/characters/char_07.png'),
    title: '분석 완료!',
    body: '약점 분석이 끝났어요.\n결과를 확인하고 연습해볼게요.',
    nextLabel: '결과 확인하기',
    accentColor: '#f59e0b',
    backgroundColor: '#fffbeb',
    autoAdvanceSeconds: 3,
  },
  practice: {
    charImage: require('../../../assets/images/characters/char_sparkle_sunglasses.png'),
    title: '이제 새로운\n시작이에요!',
    body: '진단, 분석, 연습까지 함께했어요.\n이제 실전에서 같이 나아가봐요.',
    nextLabel: '함께 실전 시작하기 →',
    accentColor: '#22c55e',
    backgroundColor: '#f0fdf4',
    autoAdvanceSeconds: 0,
  },
};

type Props = {
  stepKey: StepCompleteKey;
  onContinue: () => void;
};

export function StepCompleteScreenView({ stepKey, onContinue }: Props) {
  const insets = useSafeAreaInsets();
  const config = STEP_CONFIG[stepKey];
  const [countdown, setCountdown] = useState(config.autoAdvanceSeconds);
  const onContinueRef = useRef(onContinue);
  onContinueRef.current = onContinue;

  useEffect(() => {
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  useEffect(() => {
    if (config.autoAdvanceSeconds === 0) {
      return;
    }
    const interval = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [config.autoAdvanceSeconds]);

  useEffect(() => {
    if (countdown === 0 && config.autoAdvanceSeconds > 0) {
      onContinueRef.current();
    }
  }, [countdown, config.autoAdvanceSeconds]);

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: config.backgroundColor,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        },
      ]}>
      <View style={styles.content}>
        <Image
          source={config.charImage}
          style={styles.character}
          resizeMode="contain"
        />
        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.body}>{config.body}</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.countdown}>
          {countdown > 0 ? `${countdown}초 후 자동으로 넘어가요` : ''}
        </Text>
        <Pressable
          style={[styles.button, { backgroundColor: config.accentColor }]}
          onPress={onContinue}>
          <Text style={styles.buttonText}>{config.nextLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  character: {
    width: 220,
    height: 220,
    marginBottom: 8,
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 28,
    lineHeight: 36,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  body: {
    fontFamily: FontFamilies.regular,
    fontSize: 16,
    lineHeight: 26,
    color: '#555',
    textAlign: 'center',
  },
  footer: {
    width: '100%',
    gap: 10,
    alignItems: 'center',
  },
  countdown: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    color: '#888',
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    color: '#ffffff',
  },
});
```

- [ ] **Step 2: TypeScript 타입 체크**

```bash
npx tsc --noEmit 2>&1 | grep "step-complete-screen-view"
```

Expected: 출력 없음 (오류 없음)

- [ ] **Step 3: Commit**

```bash
git add features/quiz/components/step-complete-screen-view.tsx
git commit -m "feat(step-complete): practice 화면 콘텐츠 교체 + 자동전진 제거"
```

---

## Task 3: use-step-complete-screen — graduateToPractice 연결

**Files:**
- Modify: `features/quiz/hooks/use-step-complete-screen.ts`

`useCurrentLearner()`에서 `graduateToPractice`를 가져와 `practice` case에서 호출한다.

- [ ] **Step 1: 훅 수정**

`features/quiz/hooks/use-step-complete-screen.ts`를 아래 내용으로 교체:

```ts
// features/quiz/hooks/use-step-complete-screen.ts
import { useCallback } from 'react';
import { router } from 'expo-router';

import { useCurrentLearner } from '@/features/learner/provider';
import { useQuizSession } from '@/features/quiz/session';

export type StepCompleteKey = 'diagnostic' | 'analysis' | 'practice';

export type UseStepCompleteScreenResult = {
  stepKey: StepCompleteKey;
  onContinue: () => void;
};

export function useStepCompleteScreen(
  stepKey: StepCompleteKey,
): UseStepCompleteScreenResult {
  const { resetSession } = useQuizSession();
  const { graduateToPractice } = useCurrentLearner();

  const onContinue = useCallback(() => {
    if (stepKey === 'diagnostic') {
      router.back();
      return;
    }

    if (stepKey === 'analysis') {
      router.replace('/quiz/result');
      return;
    }

    // practice: 졸업 처리 후 홈으로 이동
    void graduateToPractice().then(() => {
      resetSession();
      router.replace('/(tabs)/quiz');
    });
  }, [stepKey, resetSession, graduateToPractice]);

  return { stepKey, onContinue };
}
```

- [ ] **Step 2: TypeScript 타입 체크**

```bash
npx tsc --noEmit 2>&1 | grep "use-step-complete-screen"
```

Expected: 출력 없음

- [ ] **Step 3: Commit**

```bash
git add features/quiz/hooks/use-step-complete-screen.ts
git commit -m "feat(step-complete): practice 완료 시 graduateToPractice 호출"
```

---

## Task 4: index.tsx — MockExamIntroScreen 분기 제거

**Files:**
- Modify: `app/(tabs)/quiz/index.tsx`

- [ ] **Step 1: 분기 제거**

`app/(tabs)/quiz/index.tsx`를 아래 내용으로 교체:

```tsx
import QuizHubScreen from '@/features/quiz/screens/quiz-hub-screen';

export default function QuizHubRoute() {
  return <QuizHubScreen />;
}
```

- [ ] **Step 2: TypeScript 타입 체크**

```bash
npx tsc --noEmit 2>&1 | grep "quiz/index"
```

Expected: 출력 없음

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/quiz/index.tsx
git commit -m "feat(quiz): MockExamIntroScreen 분기 제거, 항상 QuizHubScreen 표시"
```

---

## Task 5: quiz-hub-screen-view — JourneyBoard 조건 단순화

**Files:**
- Modify: `features/quiz/components/quiz-hub-screen-view.tsx`

현재 두 곳에 `!profile?.practiceGraduatedAt && !homeState?.nextReviewTask` 조건이 있다:
1. `JourneyScreenHero` 렌더 조건 (line 138-140)
2. `JourneyBoard` 렌더 조건 (line 162-169)

`practiceGraduatedAt`이 있으면 JourneyBoard와 Hero를 숨기는 것으로 단순화한다. `nextReviewTask` 여부는 JourneyBoard 표시 여부에 더 이상 관여하지 않는다.

- [ ] **Step 1: 두 조건 수정**

`quiz-hub-screen-view.tsx`에서 아래 두 곳을 수정:

**변경 1** (line 138-140): `JourneyScreenHero` 조건

```tsx
// Before
{!profile?.practiceGraduatedAt && !homeState?.nextReviewTask ? (
  <JourneyScreenHero isCompactLayout={isCompactLayout} />
) : null}

// After
{!profile?.practiceGraduatedAt ? (
  <JourneyScreenHero isCompactLayout={isCompactLayout} />
) : null}
```

**변경 2** (line 162-169): `JourneyBoard` 조건

```tsx
// Before
{!profile?.practiceGraduatedAt && !homeState?.nextReviewTask ? (
  <JourneyBoard
    isCompactLayout={isCompactLayout}
    onPressCurrentStep={onPressJourneyCta}
    onPressCta={onPressJourneyCta}
    state={journey}
  />
) : null}

// After
{!profile?.practiceGraduatedAt ? (
  <JourneyBoard
    isCompactLayout={isCompactLayout}
    onPressCurrentStep={onPressJourneyCta}
    onPressCta={onPressJourneyCta}
    state={journey}
  />
) : null}
```

- [ ] **Step 2: TypeScript 타입 체크**

```bash
npx tsc --noEmit 2>&1 | grep "quiz-hub-screen-view"
```

Expected: 출력 없음

- [ ] **Step 3: Commit**

```bash
git add features/quiz/components/quiz-hub-screen-view.tsx
git commit -m "feat(quiz-hub): practiceGraduatedAt 있으면 JourneyBoard 영구 숨김"
```

---

## Task 6: use-quiz-hub-screen — exam CTA "실전 여정으로 떠나기" + 직접 졸업

**Files:**
- Modify: `features/quiz/hooks/use-quiz-hub-screen.ts`

`currentStep === 'exam'`이고 `practiceGraduatedAt`이 없을 때:
- `journey.ctaLabel`을 "실전 여정으로 떠나기 →"로 오버라이드
- `onPressJourneyCta`에서 `open_exam` case가 `graduateToPractice()` + `router.replace('/(tabs)/quiz')` 호출

`JourneyBoard`에 전달되는 `state`는 `journey` prop이므로, view에서 `ctaLabel`을 덮어쓰는 대신 훅에서 `journey` 오브젝트를 오버라이드한 버전을 만들어 반환한다.

- [ ] **Step 1: 훅 수정**

`use-quiz-hub-screen.ts`에서 `useCurrentLearner()`에서 `graduateToPractice` 추가 구조분해, `journey` 오버라이드 로직 추가, `onPressJourneyCta`의 `open_exam` case 수정.

파일 전체를 아래 내용으로 교체:

```ts
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import type { HomeJourneyState } from '@/features/learning/home-journey-state';
import { applyOverduePenalties } from '@/features/learning/review-scheduler';
import { LocalReviewTaskStore } from '@/features/learning/review-task-store';
import { rescheduleAllReviewNotifications } from '@/features/quiz/notifications/review-notification-scheduler';
import { useCurrentLearner } from '@/features/learner/provider';
import { useQuizSession } from '@/features/quiz/session';

const hubReviewStore = new LocalReviewTaskStore();

type CurrentLearnerSnapshot = ReturnType<typeof useCurrentLearner>;

export type UseQuizHubScreenResult = {
  authNoticeMessage: string | null;
  homeState: CurrentLearnerSnapshot['homeState'];
  isCompactLayout: boolean;
  isReady: CurrentLearnerSnapshot['isReady'];
  journey: HomeJourneyState | null;
  onDismissAuthNotice: () => void;
  onOpenPractice: () => void;
  onOpenRecentResult: () => void;
  onPressExam: () => void;
  onPressJourneyCta: () => void;
  onPressReviewCard: () => void;
  onRediagnose: () => void;
  onRefresh: CurrentLearnerSnapshot['refresh'];
  onStartDiagnostic: () => void;
  profile: CurrentLearnerSnapshot['profile'];
  session: CurrentLearnerSnapshot['session'];
};

export function useQuizHubScreen(): UseQuizHubScreenResult {
  const { height, width } = useWindowDimensions();
  const {
    authNoticeMessage,
    dismissAuthNotice,
    graduateToPractice,
    homeState,
    isReady,
    profile,
    refresh,
    session,
  } = useCurrentLearner();
  const { resetSession } = useQuizSession();
  const [localAuthNoticeMessage, setLocalAuthNoticeMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authNoticeMessage) {
      return;
    }

    setLocalAuthNoticeMessage(authNoticeMessage);
    dismissAuthNotice();
  }, [authNoticeMessage, dismissAuthNotice]);

  useEffect(() => {
    const accountKey = session?.accountKey;
    if (!accountKey) {
      return;
    }
    applyOverduePenalties(accountKey, hubReviewStore).then(() => {
      void rescheduleAllReviewNotifications(accountKey, hubReviewStore).catch(console.warn);
      void refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accountKey]);

  const isFirstFocusRef = useRef(true);
  const lastFocusRefreshAtRef = useRef(0);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        return;
      }
      const now = Date.now();
      if (now - lastFocusRefreshAtRef.current < 5_000) {
        return;
      }
      lastFocusRefreshAtRef.current = now;
      void refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.accountKey]),
  );

  const onStartDiagnostic = () => {
    resetSession();
    router.push({
      pathname: '/quiz/diagnostic',
      params: { autostart: '1' },
    });
  };

  const onOpenPractice = () => {
    if (!homeState) {
      return;
    }

    if (homeState.todayReviewCount > 0) {
      router.push({ pathname: '/quiz/practice', params: { mode: 'review' } });
      return;
    }

    router.push({ pathname: '/quiz/practice', params: { mode: 'weakness' } });
  };

  const onOpenRecentResult = () => {
    if (!homeState?.recentResultCard.enabled) {
      return;
    }

    router.push({
      pathname: '/quiz/result',
      params: { source: 'snapshot' },
    });
  };

  const onPressReviewCard = () => {
    const taskId = homeState?.nextReviewTask?.id;
    if (!taskId) {
      return;
    }
    router.push({
      pathname: '/quiz/review-session',
      params: { taskId },
    });
  };

  const onPressExam = () => {
    router.push('/(tabs)/quiz/exams');
  };

  const onPressJourneyCta = () => {
    const action = homeState?.journey.ctaAction;

    if (!action) {
      return;
    }

    switch (action) {
      case 'open_result':
        onOpenRecentResult();
        return;
      case 'open_review':
        onOpenPractice();
        return;
      case 'open_exam':
        // practiceGraduatedAt 없으면 → 졸업 처리 (실전 여정 시작)
        // practiceGraduatedAt 있으면 → 기존 exam 화면 (이 경우 JourneyBoard 자체가 숨겨져 있어 실제로 호출 안 됨)
        void graduateToPractice().then(() => {
          router.replace('/(tabs)/quiz');
        });
        return;
      default:
        onStartDiagnostic();
    }
  };

  // exam 단계 + 미졸업 시 ctaLabel 오버라이드
  const baseJourney = homeState?.journey ?? null;
  const journey = baseJourney && baseJourney.ctaAction === 'open_exam' && !profile?.practiceGraduatedAt
    ? { ...baseJourney, ctaLabel: '실전 여정으로 떠나기 →' }
    : baseJourney;

  return {
    authNoticeMessage: localAuthNoticeMessage,
    homeState,
    isCompactLayout: width < 390 || height < 780,
    isReady,
    journey,                 // ← 오버라이드된 journey 반환
    onDismissAuthNotice: () => {
      setLocalAuthNoticeMessage(null);
    },
    onOpenPractice,
    onOpenRecentResult,
    onPressExam,
    onPressJourneyCta,
    onPressReviewCard,
    onRediagnose: onStartDiagnostic,
    onRefresh: refresh,
    onStartDiagnostic,
    profile,
    session,
  };
}
```

- [ ] **Step 2: TypeScript 타입 체크**

```bash
npx tsc --noEmit 2>&1 | grep "use-quiz-hub-screen"
```

Expected: 출력 없음

- [ ] **Step 3: Commit**

```bash
git add features/quiz/hooks/use-quiz-hub-screen.ts
git commit -m "feat(quiz-hub): exam CTA → '실전 여정으로 떠나기' + 직접 졸업 처리"
```

---

## Task 7: 전체 타입 체크 + 빌드 검증

**Files:**
- 없음 (검증만)

- [ ] **Step 1: 전체 TypeScript 검사**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | head -40
```

Expected: 오류 없음 또는 이번 변경과 무관한 기존 오류만

- [ ] **Step 2: iOS 빌드 실행**

```bash
npx expo run:ios 2>&1 | tail -20
```

Expected: 빌드 성공, 시뮬레이터 실행

- [ ] **Step 3: 수동 검증 체크리스트**

시뮬레이터에서 아래 흐름을 직접 확인:

1. 약점 연습 10문제 완료 → `step-complete(practice)` 화면 진입
2. 캐릭터(스파클 선글라스), 제목 "이제 새로운\n시작이에요!", 버튼 "함께 실전 시작하기 →" 확인
3. 3초가 지나도 자동 전진 없음 확인
4. "함께 실전 시작하기 →" 버튼 누름 → Firestore `practiceGraduatedAt` 저장 확인 (Firestore 콘솔)
5. QuizHubScreen 도착 → JourneyBoard 없음, ReviewHomeCard 있으면 표시 확인
6. 앱 재시작 → QuizHubScreen 진입 → JourneyBoard 여전히 없음 확인

7. (별도 계정으로 테스트) 약점 연습 완료 → step-complete 진입 → X로 닫기 → QuizHubScreen(JourneyBoard 표시됨)
8. JourneyBoard에서 CTA 버튼 텍스트 "실전 여정으로 떠나기 →" 확인
9. 버튼 누름 → 축하 화면 없이 바로 QuizHubScreen + JourneyBoard 사라짐 확인

- [ ] **Step 4: git push**

```bash
git push origin main
```

---

## 참고: 제거 대상 파일 (추후 정리)

- `features/quiz/screens/mock-exam-intro-screen.tsx`
- `features/quiz/components/mock-exam-intro-screen-view.tsx`
- `features/quiz/hooks/use-mock-exam-intro-screen.ts`

이 파일들은 이번 플랜에서 제거하지 않는다. `index.tsx`에서 import만 삭제했으므로 더 이상 사용되지 않는다. 별도 커밋으로 정리하거나 다음 세션에서 처리한다.

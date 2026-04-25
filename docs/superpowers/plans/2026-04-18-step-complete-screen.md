# Step Complete Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 진단 10문제 완료 → 약점 분석 완료 → 연습문제 완료 각 순간에 캐릭터 완료 화면을 표시하고, 마지막에는 여정 보드로 이동한다.

**Architecture:** 새 라우트 `/quiz/step-complete`를 quiz Stack에 추가하고, 각 단계 완료 시점에 기존 `router.replace/push`를 step-complete로 변경한다. step-complete 화면은 stepKey 파라미터로 어떤 단계인지 판별하고 각기 다른 캐릭터·문구·다음 목적지를 처리한다. DASIDA 패턴(route → screen → hook + view)을 그대로 따른다.

**Tech Stack:** Expo Router (Stack navigation), React Native Image, expo-haptics, assets/images/characters/ (크롭된 PNG 16장)

---

## 완료 화면 흐름 요약

```
[1] 10문제 완료 → isDiagnosing 전환 감지
        → router.push('/quiz/step-complete?step=diagnostic')
        → 사용자 탭 "계속하기" → router.back() → 진단(약점분석) UI

[2] 약점 분석 완료 → state.result 감지
        → router.replace('/quiz/step-complete?step=analysis')
        → 사용자 탭 "계속하기" → router.replace('/quiz/result')

[3] 연습문제 마지막 완료 (diagnostic 세션 한정)
        → router.push('/quiz/step-complete?step=practice')
        → 사용자 탭 "계속하기" → resetSession() + router.replace('/(tabs)/quiz')
```

---

## File Map

| 역할 | 경로 | 작업 |
|------|------|------|
| 라우트 진입점 | `app/(tabs)/quiz/step-complete.tsx` | 신규 생성 |
| 스크린 조합 | `features/quiz/screens/step-complete-screen.tsx` | 신규 생성 |
| 훅 (네비게이션) | `features/quiz/hooks/use-step-complete-screen.ts` | 신규 생성 |
| 뷰 (UI) | `features/quiz/components/step-complete-screen-view.tsx` | 신규 생성 |
| Stack 등록 | `app/(tabs)/quiz/_layout.tsx` | 수정 |
| 진단→isDiagnosing 전환 | `features/quiz/hooks/use-diagnostic-screen.ts` | 수정 (2곳) |
| 연습 완료 네비게이션 | `features/quiz/hooks/use-practice-screen.ts` | 수정 (1곳) |

---

## Task 1: Stack에 step-complete 라우트 등록

**Files:**
- Modify: `app/(tabs)/quiz/_layout.tsx`

- [ ] **Step 1: Stack에 step-complete 추가**

`app/(tabs)/quiz/_layout.tsx`에서 기존 `<Stack.Screen>` 목록 마지막에 추가:

```tsx
<Stack.Screen name="step-complete" options={{ title: '완료', headerShown: false }} />
```

최종 파일:
```tsx
import { Stack } from 'expo-router';
import { QuizSessionProvider } from '@/features/quiz/session';

export default function QuizLayout() {
  return (
    <QuizSessionProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: '문제 풀기', headerShown: false }} />
        <Stack.Screen name="diagnostic" options={{ title: '10문제 체험', headerShown: false }} />
        <Stack.Screen name="exams" options={{ title: '실전 모의고사', headerShown: false }} />
        <Stack.Screen name="result" options={{ title: '판정 결과', headerShown: false }} />
        <Stack.Screen name="practice" options={{ title: '연습문제', headerShown: false }} />
        <Stack.Screen name="feedback" options={{ title: '피드백', headerShown: false }} />
        <Stack.Screen name="exam" options={{ headerShown: false }} />
        <Stack.Screen name="review-session" options={{ title: '복습 세션', headerShown: false }} />
        <Stack.Screen name="step-complete" options={{ title: '완료', headerShown: false }} />
      </Stack>
    </QuizSessionProvider>
  );
}
```

- [ ] **Step 2: 앱 실행 후 라우트 오류 없는지 확인**

```bash
npx expo start --clear
```

`/quiz/step-complete` 경로에 대해 404가 아닌 빈 화면(또는 Not Found가 아닌) 응답이 나오면 통과. 아직 파일이 없으니 빌드 에러가 없으면 OK.

- [ ] **Step 3: 커밋**

```bash
git add app/(tabs)/quiz/_layout.tsx
git commit -m "feat(quiz): step-complete 라우트 Stack 등록"
```

---

## Task 2: use-step-complete-screen 훅 작성

**Files:**
- Create: `features/quiz/hooks/use-step-complete-screen.ts`

- [ ] **Step 1: 훅 파일 생성**

```ts
// features/quiz/hooks/use-step-complete-screen.ts
import { router } from 'expo-router';

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

  const onContinue = () => {
    if (stepKey === 'diagnostic') {
      // 진단 화면으로 돌아가서 isDiagnosing UI 표시
      router.back();
      return;
    }

    if (stepKey === 'analysis') {
      // 약점 결과 화면으로 이동
      router.replace('/quiz/result');
      return;
    }

    // practice: 세션 초기화 후 여정 보드(홈)로 이동
    resetSession();
    router.replace('/(tabs)/quiz');
  };

  return { stepKey, onContinue };
}
```

- [ ] **Step 2: 타입 확인 (TypeScript)**

```bash
npx tsc --noEmit 2>&1 | grep step-complete
```

에러 없으면 통과.

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/hooks/use-step-complete-screen.ts
git commit -m "feat(quiz): use-step-complete-screen 훅 작성"
```

---

## Task 3: step-complete-screen-view 뷰 컴포넌트 작성

**Files:**
- Create: `features/quiz/components/step-complete-screen-view.tsx`

각 단계마다 다른 캐릭터 이미지, 배경색, 문구를 보여준다.

- [ ] **Step 1: 뷰 파일 생성**

```tsx
// features/quiz/components/step-complete-screen-view.tsx
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';

import type { StepCompleteKey } from '@/features/quiz/hooks/use-step-complete-screen';
import { FontFamilies } from '@/constants/typography';

type StepConfig = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  charImage: any;
  title: string;
  body: string;
  nextLabel: string;
  accentColor: string;
  backgroundColor: string;
};

const STEP_CONFIG: Record<StepCompleteKey, StepConfig> = {
  diagnostic: {
    charImage: require('../../../assets/images/characters/char_04.png'),
    title: '진단 완료!',
    body: '10문제로 약점을 찾았어요.\n이제 약점을 분석할게요.',
    nextLabel: '약점 분석 시작하기',
    accentColor: '#6366f1',
    backgroundColor: '#f5f3ff',
  },
  analysis: {
    charImage: require('../../../assets/images/characters/char_07.png'),
    title: '분석 완료!',
    body: '약점 분석이 끝났어요.\n결과를 확인하고 연습해볼게요.',
    nextLabel: '결과 확인하기',
    accentColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  practice: {
    charImage: require('../../../assets/images/characters/char_15.png'),
    title: '연습 완료!',
    body: '약점 연습을 모두 마쳤어요.\n여정 보드가 완성됐어요.',
    nextLabel: '여정 보드 보기',
    accentColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
};

type Props = {
  stepKey: StepCompleteKey;
  onContinue: () => void;
};

export function StepCompleteScreenView({ stepKey, onContinue }: Props) {
  const insets = useSafeAreaInsets();
  const config = STEP_CONFIG[stepKey];

  useEffect(() => {
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: config.backgroundColor, paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.content}>
        <Image
          source={config.charImage}
          style={styles.character}
          resizeMode="contain"
        />
        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.body}>{config.body}</Text>
      </View>

      <Pressable
        style={[styles.button, { backgroundColor: config.accentColor }]}
        onPress={onContinue}>
        <Text style={styles.buttonText}>{config.nextLabel}</Text>
      </Pressable>
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
    width: 140,
    height: 140,
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

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | grep step-complete
```

에러 없으면 통과.

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/components/step-complete-screen-view.tsx
git commit -m "feat(quiz): StepCompleteScreenView 뷰 컴포넌트 작성"
```

---

## Task 4: step-complete-screen 스크린 + 라우트 파일 작성

**Files:**
- Create: `features/quiz/screens/step-complete-screen.tsx`
- Create: `app/(tabs)/quiz/step-complete.tsx`

- [ ] **Step 1: 스크린 파일 생성**

```tsx
// features/quiz/screens/step-complete-screen.tsx
import { StepCompleteScreenView } from '@/features/quiz/components/step-complete-screen-view';
import {
  type StepCompleteKey,
  useStepCompleteScreen,
} from '@/features/quiz/hooks/use-step-complete-screen';

type Props = {
  stepKey: StepCompleteKey;
};

export default function StepCompleteScreen({ stepKey }: Props) {
  const screen = useStepCompleteScreen(stepKey);

  return <StepCompleteScreenView {...screen} />;
}
```

- [ ] **Step 2: 라우트 파일 생성**

```tsx
// app/(tabs)/quiz/step-complete.tsx
import { useLocalSearchParams } from 'expo-router';

import StepCompleteScreen from '@/features/quiz/screens/step-complete-screen';
import type { StepCompleteKey } from '@/features/quiz/hooks/use-step-complete-screen';
import { getSingleParam } from '@/utils/get-single-param';

const VALID_STEPS: StepCompleteKey[] = ['diagnostic', 'analysis', 'practice'];

function isValidStep(value: string | undefined): value is StepCompleteKey {
  return VALID_STEPS.includes(value as StepCompleteKey);
}

export default function StepCompleteRoute() {
  const params = useLocalSearchParams();
  const step = getSingleParam(params.step);

  if (!isValidStep(step)) {
    // 잘못된 파라미터면 diagnostic 기본값
    return <StepCompleteScreen stepKey="diagnostic" />;
  }

  return <StepCompleteScreen stepKey={step} />;
}
```

- [ ] **Step 3: 시뮬레이터에서 직접 라우트 테스트**

개발 서버에서 `/quiz/step-complete?step=diagnostic` 로 직접 이동해 화면 렌더링 확인:
- 캐릭터 이미지 표시
- "진단 완료!" 타이틀
- 보라색 버튼 표시

`/quiz/step-complete?step=analysis`, `/quiz/step-complete?step=practice` 도 각각 확인.

- [ ] **Step 4: 커밋**

```bash
git add features/quiz/screens/step-complete-screen.tsx app/(tabs)/quiz/step-complete.tsx
git commit -m "feat(quiz): StepCompleteScreen 스크린·라우트 파일 작성"
```

---

## Task 5: 진단 10문제 완료 시 step-complete 연결

isDiagnosing이 true로 전환되는 순간 step-complete(diagnostic)로 이동한다.

**Files:**
- Modify: `features/quiz/hooks/use-diagnostic-screen.ts`

- [ ] **Step 1: hasNavigatedToStepComplete 상태 추가 + isDiagnosing 감지 useEffect 추가**

`use-diagnostic-screen.ts`의 **118~120번째 줄** 근처 기존 `useState` 선언 블록 끝에 추가:

```ts
const [hasNavigatedToStepComplete, setHasNavigatedToStepComplete] = useState(false);
```

기존 `state.isDiagnosing`을 리셋할 때 플래그도 초기화:

```ts
// use-diagnostic-screen.ts 168번째 줄 (기존 state.result useEffect) 바로 위에 추가
useEffect(() => {
  if (!state.isDiagnosing) {
    setHasNavigatedToStepComplete(false);
  }
}, [state.isDiagnosing]);

// 새 useEffect: isDiagnosing 전환 감지
useEffect(() => {
  if (isPreparingFreshSession) {
    return;
  }

  if (state.isDiagnosing && !state.result && !hasNavigatedToStepComplete) {
    setHasNavigatedToStepComplete(true);
    router.push({
      pathname: '/quiz/step-complete',
      params: { step: 'diagnostic' },
    });
  }
}, [isPreparingFreshSession, state.isDiagnosing, state.result, hasNavigatedToStepComplete]);
```

- [ ] **Step 2: state.result useEffect에서 목적지 변경**

기존:
```ts
useEffect(() => {
  if (isPreparingFreshSession) {
    return;
  }

  if (state.result) {
    router.replace('/quiz/result');
  }
}, [isPreparingFreshSession, state.result]);
```

변경:
```ts
useEffect(() => {
  if (isPreparingFreshSession) {
    return;
  }

  if (state.result) {
    router.replace({
      pathname: '/quiz/step-complete',
      params: { step: 'analysis' },
    });
  }
}, [isPreparingFreshSession, state.result]);
```

- [ ] **Step 3: TypeScript 확인**

```bash
npx tsc --noEmit 2>&1 | grep use-diagnostic-screen
```

에러 없으면 통과.

- [ ] **Step 4: 시뮬레이터 검증 (10문제 완료 흐름)**

1. 홈 → 진단 시작
2. 10문제 모두 답변 제출
3. **기대**: "진단 완료!" 화면(캐릭터 + 보라색 버튼) 표시
4. "약점 분석 시작하기" 탭
5. **기대**: 약점 분석 UI(isDiagnosing) 화면으로 복귀

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/hooks/use-diagnostic-screen.ts
git commit -m "feat(quiz): 진단 10문제 완료 → step-complete(diagnostic) 연결"
```

---

## Task 6: 약점 분석 완료 시 step-complete 연결 검증

Task 5에서 이미 `state.result` useEffect를 `/quiz/step-complete?step=analysis`로 변경했다. 이 Task에서는 흐름을 끝까지 검증한다.

**Files:**
- Modify: 없음 (Task 5에서 완료)

- [ ] **Step 1: 시뮬레이터 검증 (분석 완료 흐름)**

1. 10문제 완료 → 진단 완료 화면 → "약점 분석 시작하기"
2. 약점 분석 화면에서 모든 문항 분석 완료 (각 문항의 최종 확인 버튼 탭)
3. **기대**: "분석 완료!" 화면(캐릭터 + 노란 버튼) 표시
4. "결과 확인하기" 탭
5. **기대**: `/quiz/result` 결과 화면 표시

- [ ] **Step 2: 결과 화면에서 회귀 없는지 확인**

결과 화면에서:
- 약점 목록 표시 ✓
- "약점 연습 시작" 버튼 동작 ✓ (기존 `onOpenWeaknessPractice` 유지)
- "홈으로" 버튼 동작 ✓

- [ ] **Step 3: 이슈 없으면 커밋 불필요 (Task 5 커밋에 포함됨)**

---

## Task 7: 연습문제 완료 시 step-complete 연결

**Files:**
- Modify: `features/quiz/hooks/use-practice-screen.ts`

- [ ] **Step 1: continueAfterPersistence 내 isLast 분기 변경**

`use-practice-screen.ts`에서 `continueAfterPersistence` 함수 안의 diagnostic 세션 분기를 찾아 수정:

기존:
```ts
if (state.result && state.practiceMode === 'weakness') {
  const isLast = state.practiceIndex >= state.practiceQueue.length - 1;
  advancePractice();

  if (isLast) {
    router.push({
      pathname: '/quiz/feedback',
      params: toFeedbackParams('weakness', activeWeaknessId),
    });
  }
  return;
}
```

변경:
```ts
if (state.result && state.practiceMode === 'weakness') {
  const isLast = state.practiceIndex >= state.practiceQueue.length - 1;
  advancePractice();

  if (isLast) {
    router.push({
      pathname: '/quiz/step-complete',
      params: { step: 'practice' },
    });
  }
  return;
}
```

- [ ] **Step 2: TypeScript 확인**

```bash
npx tsc --noEmit 2>&1 | grep use-practice-screen
```

에러 없으면 통과.

- [ ] **Step 3: 시뮬레이터 검증 (전체 흐름 end-to-end)**

전체 흐름을 처음부터 끝까지 실행:

1. 홈 → 진단 시작 → 10문제 풀기
2. **체크**: "진단 완료!" 화면 표시 ✓
3. "약점 분석 시작하기" → 약점 분석 완료
4. **체크**: "분석 완료!" 화면 표시 ✓
5. "결과 확인하기" → 결과 화면 → 약점 연습 시작
6. 연습문제 마지막 문항 완료
7. **체크**: "연습 완료!" 화면 표시 ✓
8. "여정 보드 보기"
9. **체크**: 여정 보드(홈) 이동 + 세션 초기화 확인 (진단 다시 시작 가능한지)

- [ ] **Step 4: 회귀 검증**

독립 실행 케이스(진단 세션 없는 standalone practice):
- 홈 → 결과 화면 없이 바로 `/quiz/practice?mode=weakness` 진입
- 연습문제 완료
- **기대**: 기존대로 `/quiz/feedback`으로 이동 (step-complete 표시 안 됨)

challenge 모드:
- `mode=challenge`로 연습 완료
- **기대**: 기존대로 `/quiz/feedback`으로 이동

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/hooks/use-practice-screen.ts
git commit -m "feat(quiz): 연습 마지막 완료 → step-complete(practice) 연결"
```

---

## Task 8: 캐릭터 이미지 선택 최종 확인 및 polish

**Files:**
- Modify: `features/quiz/components/step-complete-screen-view.tsx` (캐릭터 번호 조정 시)

- [ ] **Step 1: 시뮬레이터에서 3개 단계 완료 화면 UI 확인**

각 화면에서 점검:
- 캐릭터 이미지 선명하게 보임 (흰 배경 투명 처리 확인)
- 제목·본문 폰트 정상
- 버튼 탭 영역 충분한지 (최소 48pt)
- SafeArea 상하단 침범 없는지

- [ ] **Step 2: 캐릭터 번호 변경이 필요하면 STEP_CONFIG 수정**

`step-complete-screen-view.tsx`의 `STEP_CONFIG`에서 charImage require 경로만 변경:
```ts
// 예: diagnostic를 char_02.png로 바꾸고 싶다면
diagnostic: {
  charImage: require('../../../assets/images/characters/char_02.png'),
  ...
}
```

- [ ] **Step 3: 최종 커밋**

```bash
git add features/quiz/components/step-complete-screen-view.tsx
git commit -m "polish(quiz): step-complete 캐릭터·UI 최종 조정"
```

---

## Task 9: git push

- [ ] **Step 1: 전체 변경 확인**

```bash
git log --oneline -8
git status
```

- [ ] **Step 2: push**

```bash
git push origin main
```

---

## 검증 체크리스트

전체 구현 후 아래를 모두 확인한다:

- [ ] 10문제 완료 → 진단 완료 화면 (보라, char_04)
- [ ] 계속하기 → 약점 분석 UI 정상 표시
- [ ] 분석 완료 → 분석 완료 화면 (노랑, char_07)
- [ ] 계속하기 → 결과 화면 정상 표시
- [ ] 결과 화면 → 약점 연습 → 마지막 완료 → 연습 완료 화면 (초록, char_15)
- [ ] 계속하기 → 여정 보드 이동 + 세션 초기화
- [ ] standalone practice (진단 없이): step-complete 미표시, feedback으로 이동
- [ ] challenge 모드: step-complete 미표시, feedback으로 이동
- [ ] review 모드: step-complete 미표시, `/quiz`로 이동 (기존 동작 유지)
- [ ] iOS 햅틱 작동 (완료 화면 진입 시 success 햅틱)
- [ ] 여정 보드에서 "복습" 문구 미표시 (Task 0에서 완료)

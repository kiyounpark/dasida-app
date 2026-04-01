# 모의고사 졸업 전환 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 약점 연습 완료 버튼을 누르면 홈 허브가 사라지고, 모의고사 인트로 화면이 영구적으로 대체된다.

**Architecture:** `LearnerProfile`에 `practiceGraduatedAt` 필드를 추가해 졸업 여부를 Firestore에 영구 저장한다. `app/(tabs)/quiz/index.tsx`는 이 값 유무로 `QuizHubScreen` vs `MockExamIntroScreen`을 분기한다. 연습 화면 하단에 "약점 연습 완료하기" 버튼을 추가하고, 결과 화면의 모의고사 단축경로 버튼은 모두 제거한다.

**Tech Stack:** Expo Router, React Native, TypeScript, Firestore, expo-image, react-native-safe-area-context

---

## 파일 구조

| 파일 | 작업 |
|------|------|
| `features/learner/types.ts` | `LearnerProfile`에 `practiceGraduatedAt?: string` 추가 |
| `features/learner/current-learner-controller.ts` | `graduateToPractice()` 인터페이스 + 구현 추가 |
| `features/learner/provider.tsx` | `graduateToPractice()` 컨텍스트에 노출 |
| `app/(tabs)/quiz/index.tsx` | `practiceGraduatedAt` 유무로 화면 분기 |
| `features/quiz/hooks/use-mock-exam-intro-screen.ts` | 새 파일 — 인트로 화면 훅 |
| `features/quiz/components/mock-exam-intro-screen-view.tsx` | 새 파일 — 인트로 화면 뷰 |
| `features/quiz/screens/mock-exam-intro-screen.tsx` | 새 파일 — Thin Screen |
| `features/quiz/hooks/use-practice-screen.ts` | `solvedCount`, `canGraduate`, `onGraduate`, `isGraduating` 추가 |
| `features/quiz/components/quiz-practice-screen-view.tsx` | 졸업 버튼 추가 |
| `features/quiz/components/quiz-result-screen-view.tsx` | 모의고사 단축경로 버튼 2곳 제거 |
| `features/quiz/components/quiz-result-report-view.tsx` | 모의고사 단축경로 버튼 + `onOpenExams` 제거 |
| `features/quiz/hooks/use-result-screen.ts` | `onOpenExams` 제거 |

---

## Task 1: `LearnerProfile`에 `practiceGraduatedAt` 추가

**Files:**
- Modify: `features/learner/types.ts`

- [ ] **Step 1: `LearnerProfile` 타입에 필드 추가**

`features/learner/types.ts`의 `LearnerProfile` 타입을 다음으로 교체:

```ts
export type LearnerProfile = {
  accountKey: string;
  learnerId: string;
  nickname: string;
  grade: LearnerGrade;
  createdAt: string;
  updatedAt: string;
  practiceGraduatedAt?: string; // ISO 타임스탬프. 약점 연습 완료 버튼을 처음 누른 시각.
};
```

- [ ] **Step 2: 타입 오류 없음 확인**

```bash
npm run typecheck
```

Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add features/learner/types.ts
git commit -m "feat: LearnerProfile에 practiceGraduatedAt 필드 추가"
```

---

## Task 2: `graduateToPractice` 컨트롤러 + 프로바이더에 추가

**Files:**
- Modify: `features/learner/current-learner-controller.ts`
- Modify: `features/learner/provider.tsx`

- [ ] **Step 1: 컨트롤러 인터페이스에 추가**

`features/learner/current-learner-controller.ts`의 `LearnerController` 인터페이스(타입 선언 부분)에 다음 줄 추가. `resetLocalProfile` 바로 위에 삽입:

```ts
graduateToPractice(): Promise<CurrentLearnerSnapshot>;
```

- [ ] **Step 2: 컨트롤러 구현 추가**

`updateOnboardingProfile` 구현 블록 바로 뒤(약 398번 줄)에 다음 구현 추가:

```ts
graduateToPractice: async () => {
  const { session, profile, summary } = await readAccessibleSnapshot();
  const nextProfile: LearnerProfile = {
    ...profile,
    practiceGraduatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await profileStore.save(nextProfile);
  return buildSnapshot({
    authGateState: session.status === 'authenticated' ? 'authenticated' : 'guest-dev',
    profile: nextProfile,
    session,
    summary,
  });
},
```

- [ ] **Step 3: 프로바이더 컨텍스트 인터페이스에 추가**

`features/learner/provider.tsx`의 `CurrentLearnerContextValue` 타입(약 80번 줄 `updateOnboardingProfile` 아래)에 추가:

```ts
graduateToPractice(): Promise<void>;
```

- [ ] **Step 4: 프로바이더 구현에 추가**

`provider.tsx`의 `useMemo` 구현 블록에서 `updateOnboardingProfile` 바로 뒤에 추가:

```ts
graduateToPractice: async () => {
  const snapshot = await learnerController.graduateToPractice();
  setState(toLearnerState(snapshot));
},
```

- [ ] **Step 5: 타입 오류 없음 확인**

```bash
npm run typecheck
```

Expected: 오류 없음

- [ ] **Step 6: 커밋**

```bash
git add features/learner/current-learner-controller.ts features/learner/provider.tsx
git commit -m "feat: graduateToPractice 컨트롤러/프로바이더 추가"
```

---

## Task 3: `MockExamIntroScreen` 구현

**Files:**
- Create: `features/quiz/hooks/use-mock-exam-intro-screen.ts`
- Create: `features/quiz/components/mock-exam-intro-screen-view.tsx`
- Create: `features/quiz/screens/mock-exam-intro-screen.tsx`

- [ ] **Step 1: 훅 생성**

`features/quiz/hooks/use-mock-exam-intro-screen.ts` 새 파일 생성:

```ts
import { router } from 'expo-router';

export type UseMockExamIntroScreenResult = {
  onStartExam: () => void;
};

export function useMockExamIntroScreen(): UseMockExamIntroScreenResult {
  const onStartExam = () => {
    router.push('/quiz/exams');
  };

  return { onStartExam };
}
```

- [ ] **Step 2: 뷰 컴포넌트 생성**

`features/quiz/components/mock-exam-intro-screen-view.tsx` 새 파일 생성:

```tsx
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandButton } from '@/components/brand/BrandButton';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import type { UseMockExamIntroScreenResult } from '@/features/quiz/hooks/use-mock-exam-intro-screen';

const CHARACTER_SOURCE = require('../../../assets/auth/dasida-login-character.png');
const CHARACTER_ASPECT_RATIO = 492 / 534;
const CHARACTER_WIDTH = 160;

export function MockExamIntroScreenView({ onStartExam }: UseMockExamIntroScreenResult) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + BrandSpacing.xl }]}>
      <View style={styles.content}>
        <Image
          source={CHARACTER_SOURCE}
          style={[styles.character, { height: CHARACTER_WIDTH / CHARACTER_ASPECT_RATIO }]}
          contentFit="contain"
        />

        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>드디어 실전이에요!</Text>
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.title}>약점 정리까지 마쳤어요</Text>
          <Text style={styles.body}>이제 모의고사에서 실전 감각을 확인해보세요</Text>
        </View>

        {/* 에빙하우스 복습 슬롯 — 추후 확장 */}
      </View>

      <View style={styles.ctaWrap}>
        <BrandButton title="모의고사 풀기" onPress={onStartExam} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.background,
    paddingHorizontal: BrandSpacing.lg,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: BrandSpacing.md,
  },
  character: {
    width: CHARACTER_WIDTH,
  },
  bubble: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    paddingHorizontal: BrandSpacing.md,
    paddingVertical: BrandSpacing.sm,
  },
  bubbleText: {
    fontFamily: FontFamilies.medium,
    fontSize: 14,
    color: BrandColors.primarySoft,
  },
  textBlock: {
    alignItems: 'center',
    gap: BrandSpacing.xs,
    marginTop: BrandSpacing.sm,
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 24,
    color: BrandColors.text,
    textAlign: 'center',
  },
  body: {
    fontFamily: FontFamilies.regular,
    fontSize: 15,
    color: BrandColors.mutedText,
    textAlign: 'center',
    lineHeight: 22,
  },
  ctaWrap: {
    gap: BrandSpacing.sm,
  },
});
```

- [ ] **Step 3: Thin Screen 생성**

`features/quiz/screens/mock-exam-intro-screen.tsx` 새 파일 생성:

```tsx
import { MockExamIntroScreenView } from '@/features/quiz/components/mock-exam-intro-screen-view';
import { useMockExamIntroScreen } from '@/features/quiz/hooks/use-mock-exam-intro-screen';

export default function MockExamIntroScreen() {
  const screen = useMockExamIntroScreen();
  return <MockExamIntroScreenView {...screen} />;
}
```

- [ ] **Step 4: 타입 + 린트 통과 확인**

```bash
npm run typecheck && npm run lint
```

Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/hooks/use-mock-exam-intro-screen.ts features/quiz/components/mock-exam-intro-screen-view.tsx features/quiz/screens/mock-exam-intro-screen.tsx
git commit -m "feat: MockExamIntroScreen 구현 (훅, 뷰, Thin Screen)"
```

---

## Task 4: `quiz/index.tsx`에서 `practiceGraduatedAt` 기반 화면 분기

**Files:**
- Modify: `app/(tabs)/quiz/index.tsx`

- [ ] **Step 1: `quiz/index.tsx` 분기 로직 작성**

`app/(tabs)/quiz/index.tsx` 전체를 다음으로 교체:

```tsx
import { useCurrentLearner } from '@/features/learner/provider';
import MockExamIntroScreen from '@/features/quiz/screens/mock-exam-intro-screen';
import QuizHubScreen from '@/features/quiz/screens/quiz-hub-screen';

export default function QuizHubRoute() {
  const { isReady, profile } = useCurrentLearner();

  if (!isReady) {
    return <QuizHubScreen />;
  }

  if (profile?.practiceGraduatedAt) {
    return <MockExamIntroScreen />;
  }

  return <QuizHubScreen />;
}
```

- [ ] **Step 2: 타입 오류 없음 확인**

```bash
npm run typecheck
```

Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add app/\(tabs\)/quiz/index.tsx
git commit -m "feat: quiz 탭 루트에서 practiceGraduatedAt 기반 화면 분기"
```

---

## Task 5: 연습 화면에 "약점 연습 완료하기" 버튼 추가

**Files:**
- Modify: `features/quiz/hooks/use-practice-screen.ts`
- Modify: `features/quiz/components/quiz-practice-screen-view.tsx`

- [ ] **Step 1: `use-practice-screen.ts` 반환 타입 확장**

`UsePracticeScreenResult` 타입에 다음 3개 필드 추가:

```ts
export type UsePracticeScreenResult = {
  // ... 기존 필드 유지 ...
  canGraduate: boolean;
  isGraduating: boolean;
  onGraduate: () => void;
};
```

- [ ] **Step 2: 훅 구현 업데이트**

`usePracticeScreen` 함수 내부에 다음 변경사항 적용:

**2-a. 임포트 상단에 추가 (이미 있는 `useCurrentLearner` import에 `graduateToPractice` 추가)**

기존:
```ts
const { profile, recordAttempt, session, summary } = useCurrentLearner();
```

변경 후:
```ts
const { graduateToPractice, profile, recordAttempt, session, summary } = useCurrentLearner();
```

**2-b. state 추가 (기존 state 선언들 아래에)**

```ts
const [solvedCount, setSolvedCount] = useState(0);
const [isGraduating, setIsGraduating] = useState(false);
```

**2-c. `continueAfterPersistence` 함수 내부에 `setSolvedCount` 추가**

기존 `continueAfterPersistence` 함수 첫 줄에:
```ts
const continueAfterPersistence = () => {
  if (feedback?.kind !== 'correct' && feedback?.kind !== 'resolved') {
    return;
  }

  setSolvedCount((c) => c + 1); // ← 이 줄 추가

  if (activeMode === 'challenge') {
  // ... 이하 기존 코드 유지
```

**2-d. return 객체에 새 필드 추가**

기존 return 문 마지막 부분(약 379번 줄)에 추가:

```ts
  canGraduate: activeMode === 'weakness' && solvedCount > 0 && !profile?.practiceGraduatedAt,
  isGraduating,
  onGraduate: () => {
    if (isGraduating) {
      return;
    }
    setIsGraduating(true);
    void graduateToPractice()
      .then(() => {
        router.replace('/(tabs)/quiz');
      })
      .catch(() => {
        setIsGraduating(false);
      });
  },
```

- [ ] **Step 3: `quiz-practice-screen-view.tsx` 뷰 업데이트**

**3-a. props 구조분해에 새 필드 추가**

기존:
```tsx
export function QuizPracticeScreenView({
  activeProblem,
  continueLabel,
  emptyActionLabel,
  emptyTitle,
  feedback,
  isPersistingAttempt,
  onContinue,
  onRetry,
  onSelectChoice,
  onSubmit,
  onViewResult,
  persistErrorMessage,
  screenTitle,
  selectedIndex,
  weaknessLabel,
}: UsePracticeScreenResult) {
```

변경 후:
```tsx
export function QuizPracticeScreenView({
  activeProblem,
  canGraduate,
  continueLabel,
  emptyActionLabel,
  emptyTitle,
  feedback,
  isGraduating,
  isPersistingAttempt,
  onContinue,
  onGraduate,
  onRetry,
  onSelectChoice,
  onSubmit,
  onViewResult,
  persistErrorMessage,
  screenTitle,
  selectedIndex,
  weaknessLabel,
}: UsePracticeScreenResult) {
```

**3-b. 문제 있는 화면의 return 문에 졸업 버튼 추가**

기존 return 문 (약 47번 줄):
```tsx
  return (
    <View style={styles.screen}>
      <QuizSolveLayout
        ...
      />
    </View>
  );
```

변경 후:
```tsx
  return (
    <View style={styles.screen}>
      <QuizSolveLayout
        body={...}
        bodyContentContainerStyle={styles.container}
        footer={...}
        header={<BrandHeader />}
        screenBackgroundColor={BrandColors.background}
      />
      {canGraduate ? (
        <View style={styles.graduateBar}>
          <BrandButton
            title={isGraduating ? '저장 중...' : '약점 연습 완료하기'}
            variant="neutral"
            onPress={onGraduate}
            disabled={isGraduating}
          />
        </View>
      ) : null}
    </View>
  );
```

**3-c. `styles`에 `graduateBar` 추가**

```ts
  graduateBar: {
    paddingHorizontal: BrandSpacing.lg,
    paddingBottom: BrandSpacing.lg,
    paddingTop: BrandSpacing.sm,
    backgroundColor: BrandColors.background,
  },
```

- [ ] **Step 4: 타입 + 린트 통과 확인**

```bash
npm run typecheck && npm run lint
```

Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/hooks/use-practice-screen.ts features/quiz/components/quiz-practice-screen-view.tsx
git commit -m "feat: 약점 연습 화면에 졸업 버튼 추가 (1문제 이상 풀면 활성화)"
```

---

## Task 6: 결과 화면에서 모의고사 단축경로 버튼 제거

**Files:**
- Modify: `features/quiz/hooks/use-result-screen.ts`
- Modify: `features/quiz/components/quiz-result-screen-view.tsx`
- Modify: `features/quiz/components/quiz-result-report-view.tsx`

- [ ] **Step 1: `use-result-screen.ts`에서 `onOpenExams` 제거**

`UseResultScreenResult` 타입에서 `onOpenExams: () => void;` 줄 삭제.

`use-result-screen.ts` 훅 구현에서 `onOpenExams` 구현 블록(약 152번 줄) 삭제:
```ts
// 이 블록 전체 삭제:
onOpenExams: () => {
  router.push('/quiz/exams');
},
```

- [ ] **Step 2: `quiz-result-screen-view.tsx`에서 `onOpenExams` 제거**

구조분해에서 `onOpenExams` 제거:

기존:
```tsx
export function QuizResultScreenView({
  ...
  onOpenExams,
  ...
}: UseResultScreenResult) {
```

변경 후: `onOpenExams,` 줄 삭제

"대표 모의고사 다시 풀기" 버튼 블록 2곳 삭제:

**첫 번째 (약 109번 줄):**
```tsx
// 이 블록 삭제:
<View style={styles.secondaryButtonGap}>
  <BrandButton title="대표 모의고사 다시 풀기" variant="neutral" onPress={onOpenExams} />
</View>
```

**두 번째 (약 216번 줄):** 동일 패턴 삭제

`QuizResultReportView`에 전달하는 `onOpenExams={onOpenExams}` prop 삭제:

기존:
```tsx
<QuizResultReportView
  onClose={onCloseReport}
  onOpenExams={onOpenExams}
  onOpenWeaknessPractice={onOpenWeaknessPractice}
  ...
/>
```

변경 후: `onOpenExams={onOpenExams}` 줄 삭제

- [ ] **Step 3: `quiz-result-report-view.tsx`에서 `onOpenExams` 제거**

`QuizResultReportViewProps` 타입에서 `onOpenExams: () => void;` 줄 삭제.

함수 파라미터 구조분해에서 `onOpenExams,` 삭제.

"모의고사로 내 약점 더 자세히 분석하기" 버튼 블록 삭제 (약 97번 줄):

```tsx
// 이 블록 삭제:
<BrandButton
  title="모의고사로 내 약점 더 자세히 분석하기"
  variant="neutral"
  onPress={onOpenExams}
  style={styles.primaryCta}
/>
```

`ctaWrap` View에 버튼이 "약점 기반 연습문제 풀러가기" 하나만 남는지 확인. 버튼이 하나뿐이면 `styles.primaryCta`의 `marginBottom` 등도 정리.

- [ ] **Step 4: 타입 + 린트 통과 확인**

```bash
npm run typecheck && npm run lint
```

Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/hooks/use-result-screen.ts features/quiz/components/quiz-result-screen-view.tsx features/quiz/components/quiz-result-report-view.tsx
git commit -m "feat: 결과 화면 모의고사 단축경로 제거"
```

---

## 최종 검증 체크리스트

- [ ] 약점 연습 0문제 상태에서 "약점 연습 완료하기" 버튼이 안 보이는지 확인
- [ ] 1문제 이상 풀면 버튼이 나타나는지 확인
- [ ] 버튼 누른 후 퀴즈 탭 루트가 `MockExamIntroScreen`으로 전환되는지 확인
- [ ] 앱 재시작 후에도 `MockExamIntroScreen`이 유지되는지 확인 (Firestore 저장 확인)
- [ ] 결과 화면에 "대표 모의고사 다시 풀기" 버튼이 없는지 확인
- [ ] "모의고사 풀기" CTA → `/quiz/exams` 정상 이동 확인
- [ ] `review` 모드(오늘 복습)에서는 졸업 버튼이 보이지 않는지 확인
- [ ] `npm run typecheck && npm run lint` 통과

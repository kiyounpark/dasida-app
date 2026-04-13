# 진단 채팅 UI 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 두 진단 채팅 화면(10문제 약점 분석, 모의고사 오답 분석)의 헤더를 다크 헤더로 통일하고, 모의고사 오답 분석에 문제 이미지·오답 표시·텍스트 입력·스와이프 내비게이션을 추가한다.

**Architecture:** 기존 `ExamDiagnosisScreen`을 `ExamDiagnosisPage`(단일 문제 채팅 내용)와 `ExamDiagnosisSessionScreen`(FlatList 래퍼)로 분리한다. 두 진단 화면이 공유하는 `DiagnosisDarkHeader` 컴포넌트를 신규 생성하고, `DiagnosticScreenView`의 라이트 헤더를 이로 교체한다.

**Tech Stack:** React Native 0.81, Expo Router v4, expo-image, react-native-safe-area-context, react-native-reanimated (FadeInDown), AsyncStorage

---

## File Structure

### 신규 파일

| 파일 | 역할 |
|---|---|
| `features/quiz/components/diagnosis-dark-header.tsx` | 두 화면 공유 다크 헤더 (도트, 진행률 바) |
| `features/quiz/exam/components/exam-problem-card.tsx` | 문제 이미지 + 오답/정답 번호 원 |
| `features/quiz/exam/components/next-problem-card.tsx` | 완료 후 다음 문제 버튼 카드 |
| `features/quiz/exam/hooks/use-exam-diagnosis-session.ts` | 세션 전체 관리 훅 |
| `features/quiz/exam/screens/exam-diagnosis-session-screen.tsx` | FlatList 래퍼 스크린 |
| `app/(tabs)/quiz/exam/diagnosis-session.tsx` | 신규 라우트 |

### 수정 파일

| 파일 | 변경 내용 |
|---|---|
| `features/quiz/data/exam-problems.ts` | `ExamProblem`에 `imageKey` 필드 추가 |
| `features/quiz/exam/hooks/use-exam-diagnosis.ts` | `method-choices` → `method-selector`, AI 라우터 추가, `onComplete` 콜백 |
| `features/quiz/exam/screens/exam-diagnosis-screen.tsx` | `ExamDiagnosisPage`로 개편, 문제 카드·NextProblemCard 추가 |
| `features/quiz/components/diagnostic-screen-view.tsx` | BrandHeader + 라이트 세션 바 → DiagnosisDarkHeader |
| `app/(tabs)/quiz/exam/_layout.tsx` | `diagnosis-session` 스크린 등록 |
| `app/(tabs)/quiz/exam/diagnosis.tsx` | 신규 라우트로 리다이렉트 |
| `features/quiz/exam/hooks/use-exam-result-screen.ts` | `onAnalyzeProblem` 라우트 변경 |

---

## Task 1: `ExamProblem` 타입에 `imageKey` 추가

**Files:**
- Modify: `features/quiz/data/exam-problems.ts:4-13`

- [ ] **Step 1: `imageKey` 필드 추가**

```ts
// features/quiz/data/exam-problems.ts
export type ExamProblemType = 'multiple_choice' | 'short_answer';

export type ExamProblem = {
  number: number;
  type: ExamProblemType;
  score: number;
  answer: number;
  topic: string;
  diagnosisMethods: string[];
  imageKey?: string;  // ← 추가
};
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors related to `imageKey`.

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/data/exam-problems.ts
git commit -m "feat(exam): ExamProblem에 imageKey 필드 추가"
```

---

## Task 2: `ExamProblemCard` 컴포넌트 생성

**Files:**
- Create: `features/quiz/exam/components/exam-problem-card.tsx`

문제 이미지 위에 오답/정답 번호 원을 표시하는 채팅 첫 아이템.

- [ ] **Step 1: 컴포넌트 파일 생성**

```tsx
// features/quiz/exam/components/exam-problem-card.tsx
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { BrandRadius } from '@/constants/brand';
import { DiagnosisTheme } from '@/constants/diagnosis-theme';
import type { ExamProblemType } from '@/features/quiz/data/exam-problems';
import examImages from '@/features/quiz/data/exam-images';

type ExamProblemCardProps = {
  imageKey: string;        // '{examId}/{number}' format, e.g. 'g3-geom-mock-2024-09/5'
  userAnswer: number;      // 오답 번호 (빨강)
  correctAnswer: number;   // 정답 번호 (초록)
  problemType: ExamProblemType;
};

export function ExamProblemCard({
  imageKey,
  userAnswer,
  correctAnswer,
  problemType,
}: ExamProblemCardProps) {
  const imageSource = examImages[imageKey];

  return (
    <View style={styles.card}>
      <Image
        source={imageSource}
        style={styles.image}
        contentFit="contain"
      />
      {problemType === 'multiple_choice' && (
        <View style={styles.answerSection}>
          <View style={styles.circleRow}>
            {[1, 2, 3, 4, 5].map((n) => {
              const isUserAnswer = n === userAnswer;
              const isCorrect = n === correctAnswer;
              return (
                <View
                  key={n}
                  style={[
                    styles.circle,
                    isCorrect && styles.circleCorrect,
                    isUserAnswer && !isCorrect && styles.circleWrong,
                    !isCorrect && !isUserAnswer && styles.circleDefault,
                  ]}>
                  <Text
                    style={[
                      styles.circleText,
                      (isCorrect || (isUserAnswer && !isCorrect)) && styles.circleTextFilled,
                    ]}>
                    {n}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#c0392b' }]} />
              <Text style={styles.legendText}>내 답 {userAnswer}번</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#2e7d32' }]} />
              <Text style={styles.legendText}>정답 {correctAnswer}번</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(41,59,39,0.08)',
    overflow: 'hidden',
    boxShadow: '0 4px 14px rgba(36,52,38,0.09)',
  },
  image: {
    width: '100%',
    aspectRatio: 1.5,
  },
  answerSection: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  circleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDefault: {
    borderWidth: 1.5,
    borderColor: '#D7D4CD',
    backgroundColor: '#FFFFFF',
  },
  circleCorrect: {
    backgroundColor: '#2e7d32',
  },
  circleWrong: {
    backgroundColor: '#c0392b',
  },
  circleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B6560',
  },
  circleTextFilled: {
    color: '#FFFFFF',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  legendText: {
    fontSize: 11,
    color: DiagnosisTheme.inkMuted,
  },
});
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/exam/components/exam-problem-card.tsx
git commit -m "feat(exam): ExamProblemCard 컴포넌트 — 문제 이미지 + 오답/정답 번호 원"
```

---

## Task 3: `NextProblemCard` 컴포넌트 생성

**Files:**
- Create: `features/quiz/exam/components/next-problem-card.tsx`

진단 완료 후 채팅 스트림 맨 아래에 등장하는 다음 문제 이동 카드.

- [ ] **Step 1: 컴포넌트 파일 생성**

```tsx
// features/quiz/exam/components/next-problem-card.tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BrandRadius } from '@/constants/brand';
import { DiagnosisTheme } from '@/constants/diagnosis-theme';
import { FontFamilies } from '@/constants/typography';

type NextProblemCardProps = {
  nextProblemNumber: number | null; // null이면 마지막 문제
  onNext: () => void;
  onBackToResult: () => void;
};

export function NextProblemCard({
  nextProblemNumber,
  onNext,
  onBackToResult,
}: NextProblemCardProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(280).withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] })}
      style={styles.card}>
      {nextProblemNumber !== null ? (
        <>
          <Text style={styles.label}>이 문제 분석을 완료했어요.</Text>
          <Pressable
            style={styles.nextButton}
            onPress={onNext}
            accessibilityRole="button">
            <Text style={styles.nextButtonText}>
              다음 문제 분석하기 · {nextProblemNumber}번 →
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.doneLabel}>🎉 모든 오답 분석 완료!</Text>
          <Text style={styles.label}>고생했어요. 분석 결과를 확인해보세요.</Text>
          <Pressable
            style={styles.resultButton}
            onPress={onBackToResult}
            accessibilityRole="button">
            <Text style={styles.resultButtonText}>채점 결과로 돌아가기</Text>
          </Pressable>
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DiagnosisTheme.panel,
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: DiagnosisTheme.line,
    padding: 16,
    gap: 10,
    marginLeft: 36, // align with avatar side
  },
  label: {
    fontSize: 13,
    color: DiagnosisTheme.inkMuted,
    lineHeight: 19,
  },
  doneLabel: {
    fontSize: 16,
    fontFamily: FontFamilies.bold,
    color: DiagnosisTheme.ink,
  },
  nextButton: {
    backgroundColor: '#2e7d32',
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    paddingVertical: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 15,
    fontFamily: FontFamilies.bold,
    color: '#FFFFFF',
  },
  resultButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: DiagnosisTheme.line,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resultButtonText: {
    fontSize: 14,
    fontFamily: FontFamilies.medium,
    color: DiagnosisTheme.ink,
  },
});
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/exam/components/next-problem-card.tsx
git commit -m "feat(exam): NextProblemCard 컴포넌트 — 완료 후 다음 문제/채점 결과 버튼"
```

---

## Task 4: `DiagnosisDarkHeader` 공유 컴포넌트 생성

**Files:**
- Create: `features/quiz/components/diagnosis-dark-header.tsx`

두 진단 화면(10문제 약점 분석, 모의고사 오답 분석)이 공유하는 다크 헤더.
도트 규칙: `totalCount ≤ 5` → 전체 도트, `totalCount > 5` → 5개 도트 + `···`

- [ ] **Step 1: 컴포넌트 파일 생성**

```tsx
// features/quiz/components/diagnosis-dark-header.tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FontFamilies } from '@/constants/typography';

type DiagnosisDarkHeaderProps = {
  title: string;             // "Q3" | "21번"
  backLabel: string;         // "← 뒤로" | "← 채점 결과"
  progressLabel: string;     // "1 / 5"
  progressPercent: number;   // 0~100
  totalCount: number;
  completedIndices: number[]; // 완료된 페이지 인덱스 목록
  activeIndex: number;        // 현재 페이지 인덱스 (0-based)
  onBack: () => void;
  onDotPress: (index: number) => void;
};

export function DiagnosisDarkHeader({
  title,
  backLabel,
  progressLabel,
  progressPercent,
  totalCount,
  completedIndices,
  activeIndex,
  onBack,
  onDotPress,
}: DiagnosisDarkHeaderProps) {
  // totalCount > 5: 5개 도트만 표시 + '···'
  // 5개 도트를 activeIndex 기준으로 앞뒤 균형 있게 표시
  const showEllipsis = totalCount > 5;
  const visibleCount = showEllipsis ? 5 : totalCount;

  // 5개 윈도우: activeIndex가 가능한 가운데에 오도록
  const windowStart = showEllipsis
    ? Math.max(0, Math.min(activeIndex - 2, totalCount - 5))
    : 0;
  const visibleIndices = Array.from({ length: visibleCount }, (_, i) => windowStart + i);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.inner}>
        {/* 상단 행: 뒤로 | N / M */}
        <View style={styles.topRow}>
          <Pressable onPress={onBack} accessibilityRole="button" style={styles.backButton}>
            <Text style={styles.backLabel}>{backLabel}</Text>
          </Pressable>
          <Text style={styles.progressLabel}>{progressLabel}</Text>
        </View>

        {/* 제목 */}
        <Text style={styles.title}>{title}</Text>

        {/* 도트 내비게이터 */}
        <View style={styles.dotsRow}>
          {visibleIndices.map((pageIndex) => {
            const isActive = pageIndex === activeIndex;
            const isCompleted = completedIndices.includes(pageIndex);
            return (
              <Pressable
                key={pageIndex}
                onPress={() => onDotPress(pageIndex)}
                style={styles.dotHitArea}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}>
                <View
                  style={[
                    styles.dot,
                    isActive
                      ? styles.dotActive
                      : isCompleted
                        ? styles.dotCompleted
                        : styles.dotUpcoming,
                  ]}
                />
              </Pressable>
            );
          })}
          {showEllipsis && (
            <Text style={styles.ellipsis}>···</Text>
          )}
        </View>

        {/* 진행률 바 */}
        <View style={styles.progTrack}>
          <View style={[styles.progFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a2a1a',
  },
  inner: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backLabel: {
    fontSize: 11,
    fontFamily: FontFamilies.medium,
    color: '#6BAA72',
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: FontFamilies.regular,
    color: 'rgba(255,255,255,0.55)',
  },
  title: {
    fontSize: 18,
    fontFamily: FontFamilies.bold,
    color: '#FFFFFF',
    lineHeight: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 8,
  },
  dotHitArea: {
    width: 24,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 999,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#FFFFFF',
  },
  dotCompleted: {
    width: 8,
    backgroundColor: '#7FC87A',
  },
  dotUpcoming: {
    width: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  ellipsis: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
    paddingBottom: 2,
  },
  progTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  progFill: {
    height: '100%',
    backgroundColor: '#7FC87A',
  },
});
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/components/diagnosis-dark-header.tsx
git commit -m "feat(diagnosis): DiagnosisDarkHeader 공유 컴포넌트 — 다크 헤더, 도트 내비게이터"
```

---

## Task 5: `use-exam-diagnosis.ts` 리팩터 — AI 라우터 + 완료 콜백

**Files:**
- Modify: `features/quiz/exam/hooks/use-exam-diagnosis.ts`

`method-choices` → `method-selector` 로 변경. AI 라우터(텍스트 입력 + 예측) 추가. `onFinalConfirm` 완료 시 `router.back()` 대신 `onComplete()` 콜백 호출. `problem-card` 엔트리를 첫 번째로 추가.

- [ ] **Step 1: 훅 전체 교체**

```ts
// features/quiz/exam/hooks/use-exam-diagnosis.ts
import { useCallback, useMemo, useRef, useState } from 'react';

import type { WeaknessId } from '@/data/diagnosisMap';
import { diagnosisMethodRoutingCatalog } from '@/data/diagnosis-method-routing';
import type { SolveMethodId } from '@/data/diagnosisTree';
import { methodOptions } from '@/data/diagnosisTree';
import type { DetailedDiagnosisFlow } from '@/data/detailedDiagnosisFlows';
import type { DiagnosisMethodCardOption } from '@/features/quiz/components/diagnosis-method-selector-card';
import { getExamProblems } from '@/features/quiz/data/exam-problems';
import {
  advanceFromCheck,
  advanceFromChoice,
  advanceFromExplain,
  createDiagnosisFlowDraft,
  getDiagnosisFlow,
  getNode,
  type DiagnosisFlowDraft,
} from '@/features/quiz/diagnosis-flow-engine';
import {
  analyzeDiagnosisMethod,
  type DiagnosisRouterResult,
} from '@/features/quiz/diagnosis-router';
import { useCurrentLearner } from '@/features/learner/provider';

import { buildExamDiagnosisAttemptInput } from '../build-exam-diagnosis-attempt-input';
import { markProblemDiagnosed } from '../exam-diagnosis-progress';

export type ExamDiagEntry =
  | { kind: 'bubble'; id: string; role: 'assistant' | 'user'; text: string }
  | { kind: 'problem-card'; id: string; imageKey: string; userAnswer: number; correctAnswer: number; problemType: 'multiple_choice' | 'short_answer' }
  | { kind: 'method-selector'; id: string; interactive: boolean }
  | { kind: 'flow-node'; id: string; flow: DetailedDiagnosisFlow; draft: DiagnosisFlowDraft; interactive: boolean }
  | { kind: 'next-problem'; id: string };

export type UseExamDiagnosisResult = {
  problemNumber: number;
  topic: string;
  score: number;
  entries: ExamDiagEntry[];
  methods: DiagnosisMethodCardOption[];
  diagnosisInput: string;
  routerResult: DiagnosisRouterResult | null;
  suggestedMethods: DiagnosisMethodCardOption[];
  analysisErrorMessage: string;
  isAnalyzing: boolean;
  isDone: boolean;
  isSaving: boolean;
  onInputChange: (text: string) => void;
  onAnalyze: () => void;
  onManualSelect: (id: SolveMethodId) => void;
  onConfirmPredicted: () => void;
  onChoicePress: (optionId: string) => void;
  onExplainContinue: () => void;
  onExplainDontKnow: () => void;
  onCheckPress: (optionId: string) => void;
  onCheckDontKnow: () => void;
  onFinalConfirm: () => void;
};

export function useExamDiagnosis(params: {
  examId: string;
  problemNumber: number;
  userAnswer: number;
  onComplete: () => void;
}): UseExamDiagnosisResult {
  const { examId, problemNumber, userAnswer, onComplete } = params;
  const { session, profile, recordAttempt } = useCurrentLearner();

  const problem = useMemo(
    () => getExamProblems(examId).find((p) => p.number === problemNumber),
    [examId, problemNumber],
  );

  const imageKey = `${examId}/${problemNumber}`;

  const methods: DiagnosisMethodCardOption[] = useMemo(
    () =>
      (problem?.diagnosisMethods ?? [])
        .map((id) => {
          const option = methodOptions.find((o) => o.id === id);
          if (!option) return null;
          const info = diagnosisMethodRoutingCatalog[option.id as SolveMethodId];
          return {
            id: option.id as SolveMethodId,
            labelKo: option.labelKo,
            summary: info?.summary ?? option.labelKo,
            exampleUtterances: info?.exampleUtterances ?? [],
          };
        })
        .filter((o): o is DiagnosisMethodCardOption => o !== null),
    [problem],
  );

  const isMountedRef = useRef(true);

  const [diagnosisInput, setDiagnosisInput] = useState('');
  const [routerResult, setRouterResult] = useState<DiagnosisRouterResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisErrorMessage, setAnalysisErrorMessage] = useState('');

  const [draft, setDraft] = useState<DiagnosisFlowDraft | null>(null);
  const [entries, setEntries] = useState<ExamDiagEntry[]>(() => {
    const problemEntry: ExamDiagEntry = {
      kind: 'problem-card',
      id: 'problem-card',
      imageKey,
      userAnswer,
      correctAnswer: problem?.answer ?? 0,
      problemType: problem?.type ?? 'multiple_choice',
    };
    return [
      problemEntry,
      { kind: 'bubble', id: 'intro', role: 'assistant', text: '어떤 방법으로 풀었나요?' },
      { kind: 'method-selector', id: 'method-selector', interactive: true },
    ];
  });
  const [isDone, setIsDone] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const startedAt = useRef(new Date().toISOString());

  const suggestedMethods: DiagnosisMethodCardOption[] = useMemo(() => {
    if (!routerResult?.needsManualSelection) return [];
    return routerResult.candidateMethodIds
      .filter((id) => id !== 'unknown')
      .slice(0, 2)
      .map((id) => methods.find((m) => m.id === id))
      .filter((m): m is DiagnosisMethodCardOption => Boolean(m));
  }, [routerResult, methods]);

  const freezeAndAppend = useCallback((newEntries: ExamDiagEntry[]) => {
    setEntries((prev) => [
      ...prev.map((e) => ('interactive' in e ? { ...e, interactive: false } : e)),
      ...newEntries,
    ]);
  }, []);

  const onInputChange = useCallback((text: string) => {
    setDiagnosisInput(text);
  }, []);

  const onAnalyze = useCallback(async () => {
    const rawText = diagnosisInput.trim();
    if (!rawText || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisErrorMessage('');
    setRouterResult(null);

    try {
      const result = await analyzeDiagnosisMethod({
        allowedMethodIds: methods.map((m) => m.id),
        allowedMethods: methods.map((m) => ({
          id: m.id,
          labelKo: m.labelKo,
          summary: m.summary ?? m.labelKo,
          exampleUtterances: m.exampleUtterances ?? [],
        })),
        problemId: `${examId}-${problemNumber}`,
        rawText,
      });
      if (!isMountedRef.current) return;
      setRouterResult(result);
    } catch {
      if (!isMountedRef.current) return;
      setAnalysisErrorMessage('분석 중 오류가 발생했어요. 다시 시도해주세요.');
    } finally {
      if (isMountedRef.current) setIsAnalyzing(false);
    }
  }, [diagnosisInput, isAnalyzing, methods, examId, problemNumber]);

  const selectMethod = useCallback(
    (methodId: SolveMethodId) => {
      const method = methods.find((m) => m.id === methodId);
      if (!method) return;

      const newDraft = createDiagnosisFlowDraft(methodId);
      setDraft(newDraft);
      const flow = getDiagnosisFlow(methodId);

      freezeAndAppend([
        { kind: 'bubble', id: `user-method-${Date.now()}`, role: 'user', text: method.labelKo },
        { kind: 'flow-node', id: `node-${newDraft.currentNodeId}`, flow, draft: newDraft, interactive: true },
      ]);
    },
    [methods, freezeAndAppend],
  );

  const onManualSelect = useCallback(
    (methodId: SolveMethodId) => selectMethod(methodId),
    [selectMethod],
  );

  const onConfirmPredicted = useCallback(() => {
    if (!routerResult?.predictedMethodId) return;
    selectMethod(routerResult.predictedMethodId);
  }, [routerResult, selectMethod]);

  const advanceDraft = useCallback(
    (nextDraft: DiagnosisFlowDraft, userText: string) => {
      const flow = getDiagnosisFlow(nextDraft.methodId);
      const node = getNode(flow, nextDraft.currentNodeId);

      setDraft(nextDraft);
      setEntries((prev) => {
        const frozen = prev.map((e) => ('interactive' in e ? { ...e, interactive: false } : e));
        if (userText) {
          frozen.push({ kind: 'bubble', id: `user-${nextDraft.currentNodeId}`, role: 'user', text: userText });
        }
        frozen.push({
          kind: 'flow-node',
          id: `node-${nextDraft.currentNodeId}-${Date.now()}`,
          flow,
          draft: nextDraft,
          interactive: node.kind !== 'final',
        });
        return frozen;
      });
    },
    [],
  );

  const onChoicePress = useCallback(
    (optionId: string) => {
      if (!draft) return;
      const flow = getDiagnosisFlow(draft.methodId);
      const node = getNode(flow, draft.currentNodeId);
      if (node.kind !== 'choice') return;
      const option = node.options.find((o) => o.id === optionId);
      if (!option) return;
      advanceDraft(advanceFromChoice(draft, optionId), option.text);
    },
    [draft, advanceDraft],
  );

  const onExplainContinue = useCallback(() => {
    if (!draft) return;
    advanceDraft(advanceFromExplain(draft, 'continue'), '확인할게요');
  }, [draft, advanceDraft]);

  const onExplainDontKnow = useCallback(() => {
    if (!draft) return;
    advanceDraft(advanceFromExplain(draft, 'dont_know'), '모르겠습니다');
  }, [draft, advanceDraft]);

  const onCheckPress = useCallback(
    (optionId: string) => {
      if (!draft) return;
      const flow = getDiagnosisFlow(draft.methodId);
      const node = getNode(flow, draft.currentNodeId);
      if (node.kind !== 'check') return;
      const option = node.options.find((o) => o.id === optionId);
      if (!option) return;
      advanceDraft(advanceFromCheck(draft, optionId), option.text);
    },
    [draft, advanceDraft],
  );

  const onCheckDontKnow = useCallback(() => {
    if (!draft) return;
    advanceDraft(advanceFromCheck(draft, undefined), '모르겠습니다');
  }, [draft, advanceDraft]);

  const onFinalConfirm = useCallback(async () => {
    if (!draft || !session || !profile) return;
    const flow = getDiagnosisFlow(draft.methodId);
    const node = getNode(flow, draft.currentNodeId);
    if (node.kind !== 'final') return;

    const weaknessId: WeaknessId = node.weaknessId;
    const completedAt = new Date().toISOString();

    setIsDone(true);
    setIsSaving(true);

    try {
      await Promise.all([
        markProblemDiagnosed(examId, problemNumber, weaknessId),
        recordAttempt(
          buildExamDiagnosisAttemptInput({
            session,
            profile,
            examId,
            problemNumber,
            topic: problem?.topic ?? 'exam',
            methodId: draft.methodId,
            weaknessId,
            startedAt: startedAt.current,
            completedAt,
          }),
        ),
      ]);
      // next-problem 카드 추가 후 세션에 완료 알림
      setEntries((prev) => [
        ...prev.map((e) => ('interactive' in e ? { ...e, interactive: false } : e)),
        { kind: 'next-problem', id: 'next-problem' },
      ]);
      onComplete();
    } catch {
      setIsDone(false);
      setIsSaving(false);
    }
  }, [draft, session, profile, examId, problemNumber, problem, recordAttempt, onComplete]);

  return {
    problemNumber,
    topic: problem?.topic ?? '문제',
    score: problem?.score ?? 0,
    entries,
    methods,
    diagnosisInput,
    routerResult,
    suggestedMethods,
    analysisErrorMessage,
    isAnalyzing,
    isDone,
    isSaving,
    onInputChange,
    onAnalyze,
    onManualSelect,
    onConfirmPredicted,
    onChoicePress,
    onExplainContinue,
    onExplainDontKnow,
    onCheckPress,
    onCheckDontKnow,
    onFinalConfirm,
  };
}
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: `exam-diagnosis-screen.tsx`에서 타입 오류 (이전 ViewProps와 불일치) — Task 6에서 수정.

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/exam/hooks/use-exam-diagnosis.ts
git commit -m "feat(exam): use-exam-diagnosis — method-selector, AI 라우터, onComplete 콜백"
```

---

## Task 6: `ExamDiagnosisScreen` → `ExamDiagnosisPage`로 개편

**Files:**
- Modify: `features/quiz/exam/screens/exam-diagnosis-screen.tsx`

`ExamDiagnosisScreen`을 `ExamDiagnosisPage`로 개편한다. 헤더 제거, `ExamProblemCard`·`DiagnosisMethodSelectorCard`·`NextProblemCard` 렌더링 추가. `ExamDiagnosisScreen` 이름은 하위 호환을 위해 유지(re-export).

- [ ] **Step 1: 파일 전체 교체**

```tsx
// features/quiz/exam/screens/exam-diagnosis-screen.tsx
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BrandColors } from '@/constants/brand';
import { DiagnosisTheme } from '@/constants/diagnosis-theme';
import { DiagnosisChatBubble } from '@/features/quiz/components/diagnosis-chat-bubble';
import { DiagnosisFlowCard } from '@/features/quiz/components/diagnosis-flow-card';
import { DiagnosisMethodSelectorCard } from '@/features/quiz/components/diagnosis-method-selector-card';

import { ExamProblemCard } from '../components/exam-problem-card';
import { NextProblemCard } from '../components/next-problem-card';
import {
  useExamDiagnosis,
  type ExamDiagEntry,
} from '../hooks/use-exam-diagnosis';

type ExamDiagnosisPageProps = {
  examId: string;
  problemNumber: number;
  userAnswer: number;
  width: number;          // FlatList page width
  isActive: boolean;      // FlatList 현재 페이지 여부
  nextProblemNumber: number | null;
  onComplete: () => void;   // 진단 완료 시 호출
  onNext: () => void;       // 다음 문제로 이동
  onBackToResult: () => void;
};

export function ExamDiagnosisPage({
  examId,
  problemNumber,
  userAnswer,
  width,
  isActive: _isActive,
  nextProblemNumber,
  onComplete,
  onNext,
  onBackToResult,
}: ExamDiagnosisPageProps) {
  const hook = useExamDiagnosis({ examId, problemNumber, userAnswer, onComplete });
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 200);
    return () => clearTimeout(id);
  }, [hook.entries.length]);

  return (
    <View style={[styles.page, { width }]}>
      <ScrollView
        ref={scrollRef}
        style={styles.canvas}
        contentContainerStyle={styles.canvasContent}
        keyboardDismissMode="on-drag">
        {hook.entries.map((entry) => (
          <Animated.View
            key={entry.id}
            entering={FadeInDown.duration(220).withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })}>
            <EntryRenderer
              entry={entry}
              hook={hook}
              nextProblemNumber={nextProblemNumber}
              onNext={onNext}
              onBackToResult={onBackToResult}
            />
          </Animated.View>
        ))}
        {hook.isSaving && (
          <View style={styles.savingRow}>
            <ActivityIndicator size="small" color={BrandColors.primarySoft} />
            <Text style={styles.savingText}>저장 중...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

type EntryRendererProps = {
  entry: ExamDiagEntry;
  hook: ReturnType<typeof useExamDiagnosis>;
  nextProblemNumber: number | null;
  onNext: () => void;
  onBackToResult: () => void;
};

function EntryRenderer({
  entry,
  hook,
  nextProblemNumber,
  onNext,
  onBackToResult,
}: EntryRendererProps) {
  if (entry.kind === 'problem-card') {
    return (
      <ExamProblemCard
        imageKey={entry.imageKey}
        userAnswer={entry.userAnswer}
        correctAnswer={entry.correctAnswer}
        problemType={entry.problemType}
      />
    );
  }

  if (entry.kind === 'bubble') {
    return (
      <DiagnosisChatBubble
        role={entry.role}
        text={entry.text}
        showAvatar={entry.role === 'assistant'}
      />
    );
  }

  if (entry.kind === 'method-selector') {
    return (
      <DiagnosisMethodSelectorCard
        methods={hook.methods}
        diagnosisInput={hook.diagnosisInput}
        routerResult={hook.routerResult}
        suggestedMethods={hook.suggestedMethods}
        analysisErrorMessage={hook.analysisErrorMessage}
        isAnalyzing={hook.isAnalyzing}
        disabled={!entry.interactive}
        onInputChange={hook.onInputChange}
        onAnalyze={hook.onAnalyze}
        onManualSelect={hook.onManualSelect}
        onConfirmPredicted={hook.onConfirmPredicted}
      />
    );
  }

  if (entry.kind === 'flow-node') {
    const node = entry.flow.nodes[entry.draft.currentNodeId];
    if (!node) return null;
    return (
      <DiagnosisFlowCard
        node={node}
        methodLabel={entry.flow.methodId as string}
        disabled={!entry.interactive}
        onChoicePress={hook.onChoicePress}
        onExplainContinue={hook.onExplainContinue}
        onExplainDontKnow={hook.onExplainDontKnow}
        onCheckPress={hook.onCheckPress}
        onCheckDontKnow={hook.onCheckDontKnow}
        onFinalConfirm={hook.onFinalConfirm}
      />
    );
  }

  if (entry.kind === 'next-problem') {
    return (
      <NextProblemCard
        nextProblemNumber={nextProblemNumber}
        onNext={onNext}
        onBackToResult={onBackToResult}
      />
    );
  }

  return null;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
  canvasContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 12,
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  savingText: {
    fontSize: 13,
    color: BrandColors.primarySoft,
  },
});
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: `exam-diagnosis-session-screen.tsx`가 아직 없어서 import 오류 없음. `diagnosis.tsx` 라우트 파일이 `ExamDiagnosisScreen` export를 찾을 때 오류 가능 → Task 8에서 수정.

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/exam/screens/exam-diagnosis-screen.tsx
git commit -m "feat(exam): ExamDiagnosisPage — 문제 카드, DiagnosisMethodSelectorCard, NextProblemCard"
```

---

## Task 7: `useExamDiagnosisSession` 훅 + `ExamDiagnosisSessionScreen` 생성

**Files:**
- Create: `features/quiz/exam/hooks/use-exam-diagnosis-session.ts`
- Create: `features/quiz/exam/screens/exam-diagnosis-session-screen.tsx`

FlatList 기반 세션 전체를 관리하는 훅과 래퍼 스크린.

- [ ] **Step 1: `use-exam-diagnosis-session.ts` 생성**

```ts
// features/quiz/exam/hooks/use-exam-diagnosis-session.ts
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import type { FlatList } from 'react-native';

import { useExamSession } from '../exam-session';

type UseExamDiagnosisSessionParams = {
  examId: string;
  wrongProblemNumbers: number[];
  startIndex: number;
};

export type UseExamDiagnosisSessionResult = {
  examId: string;
  wrongProblemNumbers: number[];
  activeProblemIndex: number;
  diagnosedIndices: number[];
  pagerRef: React.RefObject<FlatList<number>>;
  progressLabel: string;
  progressPercent: number;
  getUserAnswer: (problemNumber: number) => number;
  getNextProblemNumber: (currentIndex: number) => number | null;
  onDotPress: (index: number) => void;       // 도트 탭: scroll + 상태 업데이트
  onSwipeEnd: (index: number) => void;       // 스와이프 완료: 상태만 업데이트 (scroll 없음)
  onComplete: (problemIndex: number) => void;
  onScrollToNext: (fromIndex: number) => void;
  onBackToResult: () => void;
};

export function useExamDiagnosisSession({
  examId,
  wrongProblemNumbers,
  startIndex,
}: UseExamDiagnosisSessionParams): UseExamDiagnosisSessionResult {
  const { state } = useExamSession();
  const [activeProblemIndex, setActiveProblemIndex] = useState(startIndex);
  const [diagnosedIndices, setDiagnosedIndices] = useState<number[]>([]);
  const pagerRef = useRef<FlatList<number>>(null);
  const total = wrongProblemNumbers.length;

  const getUserAnswer = useCallback(
    (problemNumber: number): number => {
      const perProblem = state.result?.perProblem ?? [];
      return perProblem.find((p) => p.number === problemNumber)?.userAnswer ?? 0;
    },
    [state.result],
  );

  const getNextProblemNumber = useCallback(
    (currentIndex: number): number | null => {
      const nextIndex = currentIndex + 1;
      return nextIndex < total ? (wrongProblemNumbers[nextIndex] ?? null) : null;
    },
    [total, wrongProblemNumbers],
  );

  const scrollToIndex = useCallback((index: number) => {
    pagerRef.current?.scrollToIndex({ index, animated: true });
    setActiveProblemIndex(index);
  }, []);

  const onDotPress = useCallback(
    (index: number) => {
      scrollToIndex(index);
    },
    [scrollToIndex],
  );

  // 스와이프로 페이지 변경 시 — 상태만 업데이트, scrollToIndex 호출 금지 (무한 루프 방지)
  const onSwipeEnd = useCallback((index: number) => {
    setActiveProblemIndex(index);
  }, []);

  const onComplete = useCallback((problemIndex: number) => {
    setDiagnosedIndices((prev) =>
      prev.includes(problemIndex) ? prev : [...prev, problemIndex],
    );
  }, []);

  const onScrollToNext = useCallback(
    (fromIndex: number) => {
      const nextIndex = fromIndex + 1;
      if (nextIndex < total) {
        scrollToIndex(nextIndex);
      }
    },
    [total, scrollToIndex],
  );

  const onBackToResult = useCallback(() => {
    router.back();
  }, []);

  const progressPercent = total > 0 ? ((activeProblemIndex + 1) / total) * 100 : 0;

  return {
    examId,
    wrongProblemNumbers,
    activeProblemIndex,
    diagnosedIndices,
    pagerRef,
    progressLabel: `${activeProblemIndex + 1} / ${total}`,
    progressPercent,
    getUserAnswer,
    getNextProblemNumber,
    onDotPress,
    onSwipeEnd,
    onComplete,
    onScrollToNext,
    onBackToResult,
  };
}
```

- [ ] **Step 2: `exam-diagnosis-session-screen.tsx` 생성**

```tsx
// features/quiz/exam/screens/exam-diagnosis-session-screen.tsx
import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Dimensions, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DiagnosisTheme } from '@/constants/diagnosis-theme';
import { DiagnosisDarkHeader } from '@/features/quiz/components/diagnosis-dark-header';
import { getSingleParam } from '@/utils/get-single-param';

import { ExamDiagnosisPage } from './exam-diagnosis-screen';
import { useExamDiagnosisSession } from '../hooks/use-exam-diagnosis-session';

export function ExamDiagnosisSessionScreen() {
  const params = useLocalSearchParams();
  const examId = getSingleParam(params.examId) ?? '';
  const wrongProblemNumbers: number[] = JSON.parse(
    getSingleParam(params.wrongProblemNumbers) ?? '[]',
  ) as number[];
  const startIndex = Number(getSingleParam(params.startIndex) ?? '0');

  const session = useExamDiagnosisSession({ examId, wrongProblemNumbers, startIndex });
  const insets = useSafeAreaInsets();
  const pageWidth = Dimensions.get('window').width;

  // 스와이프 완료 시 activeProblemIndex 동기화 (onDotPress 아님 — scroll 재호출 방지)
  const handleMomentumEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
      session.onSwipeEnd(index);
    },
    [pageWidth, session.onSwipeEnd],
  );

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      <DiagnosisDarkHeader
        title={`${wrongProblemNumbers[session.activeProblemIndex] ?? ''}번`}
        backLabel="← 채점 결과"
        progressLabel={session.progressLabel}
        progressPercent={session.progressPercent}
        totalCount={wrongProblemNumbers.length}
        completedIndices={session.diagnosedIndices}
        activeIndex={session.activeProblemIndex}
        onBack={session.onBackToResult}
        onDotPress={session.onDotPress}
      />
      <FlatList
        ref={session.pagerRef}
        data={wrongProblemNumbers}
        horizontal
        pagingEnabled
        bounces={false}
        directionalLockEnabled
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        keyExtractor={(problemNumber) => String(problemNumber)}
        initialScrollIndex={startIndex}
        getItemLayout={(_, index) => ({
          length: pageWidth,
          offset: pageWidth * index,
          index,
        })}
        onMomentumScrollEnd={handleMomentumEnd}
        renderItem={({ item: problemNumber, index }) => (
          <ExamDiagnosisPage
            examId={examId}
            problemNumber={problemNumber}
            userAnswer={session.getUserAnswer(problemNumber)}
            width={pageWidth}
            isActive={index === session.activeProblemIndex}
            nextProblemNumber={session.getNextProblemNumber(index)}
            onComplete={() => session.onComplete(index)}
            onNext={() => session.onScrollToNext(index)}
            onBackToResult={session.onBackToResult}
          />
        )}
        style={styles.pager}
        keyboardDismissMode="on-drag"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DiagnosisTheme.canvas,
  },
  pager: {
    flex: 1,
  },
});
```

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (라우트 파일은 아직 없어도 됨).

- [ ] **Step 4: 커밋**

```bash
git add features/quiz/exam/hooks/use-exam-diagnosis-session.ts features/quiz/exam/screens/exam-diagnosis-session-screen.tsx
git commit -m "feat(exam): ExamDiagnosisSessionScreen + useExamDiagnosisSession — FlatList 스와이프 세션"
```

---

## Task 8: 라우트 신규 등록 + `_layout.tsx` 업데이트

**Files:**
- Create: `app/(tabs)/quiz/exam/diagnosis-session.tsx`
- Modify: `app/(tabs)/quiz/exam/_layout.tsx`
- Modify: `app/(tabs)/quiz/exam/diagnosis.tsx`

- [ ] **Step 1: `diagnosis-session.tsx` 신규 라우트 생성**

```tsx
// app/(tabs)/quiz/exam/diagnosis-session.tsx
import { ExamDiagnosisSessionScreen } from '@/features/quiz/exam/screens/exam-diagnosis-session-screen';

export default function ExamDiagnosisSessionRoute() {
  return <ExamDiagnosisSessionScreen />;
}
```

- [ ] **Step 2: `_layout.tsx` 업데이트 — 신규 스크린 등록**

```tsx
// app/(tabs)/quiz/exam/_layout.tsx
import { Stack } from 'expo-router';

import { ExamSessionProvider } from '@/features/quiz/exam/exam-session';

export default function ExamLayout() {
  return (
    <ExamSessionProvider>
      <Stack>
        <Stack.Screen name="solve" options={{ headerShown: false }} />
        <Stack.Screen name="result" options={{ headerShown: false }} />
        <Stack.Screen name="diagnosis" options={{ headerShown: false }} />
        <Stack.Screen name="diagnosis-session" options={{ headerShown: false }} />
      </Stack>
    </ExamSessionProvider>
  );
}
```

- [ ] **Step 3: `diagnosis.tsx` — 기존 라우트 유지 (하위 호환)**

기존 `diagnosis.tsx`는 Task 11에서 `use-exam-result-screen.ts`가 신규 라우트를 사용하게 되지만, 딥링크/북마크 등을 위해 기존 라우트도 남겨둔다. 파일 내용 변경 없이 현행 유지.

> Note: `ExamDiagnosisScreen`이 삭제됐으므로 `diagnosis.tsx`가 import하는 `ExamDiagnosisScreen`이 없다. Task 6에서 `exam-diagnosis-screen.tsx`를 교체했으므로 기존 route file이 `ExamDiagnosisScreen`을 import하면 빌드 오류가 난다. 아래와 같이 업데이트한다.

```tsx
// app/(tabs)/quiz/exam/diagnosis.tsx
import { Redirect, useLocalSearchParams } from 'expo-router';

import { getSingleParam } from '@/utils/get-single-param';

/**
 * 이전 라우트 (/quiz/exam/diagnosis) → 신규 라우트 (/quiz/exam/diagnosis-session)로 리다이렉트.
 * 파라미터 호환: 단일 problemNumber → wrongProblemNumbers=[problemNumber], startIndex=0
 */
export default function ExamDiagnosisRedirect() {
  const params = useLocalSearchParams();
  const examId = getSingleParam(params.examId) ?? '';
  const problemNumber = getSingleParam(params.problemNumber) ?? '1';

  return (
    <Redirect
      href={{
        pathname: '/quiz/exam/diagnosis-session' as '/quiz/exam/diagnosis-session',
        params: {
          examId,
          wrongProblemNumbers: JSON.stringify([Number(problemNumber)]),
          startIndex: '0',
        },
      }}
    />
  );
}
```

- [ ] **Step 4: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: 커밋**

```bash
git add app/(tabs)/quiz/exam/diagnosis-session.tsx app/(tabs)/quiz/exam/_layout.tsx "app/(tabs)/quiz/exam/diagnosis.tsx"
git commit -m "feat(exam): diagnosis-session 라우트 등록, 구 라우트 리다이렉트"
```

---

## Task 9: `DiagnosticScreenView` — BrandHeader 제거, DiagnosisDarkHeader 교체

**Files:**
- Modify: `features/quiz/components/diagnostic-screen-view.tsx`

10문제 약점 분석 `isDiagnosing` 블록의 `BrandHeader` + 라이트 세션 바 → `DiagnosisDarkHeader`. 제목: `Q{answerIndex + 1}`.

- [ ] **Step 1: isDiagnosing 블록 수정**

`diagnostic-screen-view.tsx`의 `isDiagnosing` 블록 (`return` 문, 약 83~226번째 줄)을 아래로 교체한다.

```tsx
// diagnostic-screen-view.tsx isDiagnosing 블록 교체
// import 상단에 DiagnosisDarkHeader 추가:
import { DiagnosisDarkHeader } from '@/features/quiz/components/diagnosis-dark-header';

// isDiagnosing 블록 (기존 BrandHeader + diagnosisShell 대체):
if (isDiagnosing) {
  if (!hasSeenDiagnosisIntro) {
    return <DiagnosisIntroScreen onStartDiagnosis={onStartDiagnosisIntro} />;
  }

  const totalCount = diagnosisPages.length;
  const completedIndices = diagnosisPages
    .map((page, i) => (page.workspace.status === 'completed' ? i : -1))
    .filter((i) => i !== -1);
  const progressPercent =
    totalCount > 0 ? ((activeDiagnosisPageIndex + 1) / totalCount) * 100 : 0;
  const currentPage = diagnosisPages[activeDiagnosisPageIndex];
  const title = currentPage
    ? `Q${currentPage.answerIndex + 1}`
    : 'Q1';

  return (
    <View style={[styles.screen, styles.diagnosisScreen]}>
      <DiagnosisDarkHeader
        title={title}
        backLabel="← 뒤로"
        progressLabel={`${activeDiagnosisPageIndex + 1} / ${totalCount}`}
        progressPercent={progressPercent}
        totalCount={totalCount}
        completedIndices={completedIndices}
        activeIndex={activeDiagnosisPageIndex}
        onBack={onOpenExitModal}
        onDotPress={onScrollToDiagnosisPage}
      />

      <View style={styles.diagnosisShell}>
        <View pointerEvents="none" style={styles.diagnosisBackdrop}>
          <View style={styles.diagnosisBackdropGlow} />
          <View style={styles.diagnosisBackdropBand} />
        </View>

        <FlatList
          ref={diagnosisPagerRef}
          data={diagnosisPages}
          horizontal
          pagingEnabled
          bounces={false}
          directionalLockEnabled
          decelerationRate="fast"
          keyExtractor={(page) => String(page.answerIndex)}
          renderItem={({ item, index }) => (
            <DiagnosisConversationPage
              answerIndex={item.answerIndex}
              width={diagnosisPageWidth}
              isActive={index === activeDiagnosisPageIndex}
              status={item.workspace.status}
              chatEntries={item.workspace.chatEntries}
              methods={item.methods}
              diagnosisInput={item.workspace.diagnosisInput}
              routerResult={item.workspace.routerResult}
              suggestedMethods={item.suggestedMethods}
              analysisErrorMessage={item.workspace.analysisErrorMessage}
              isAnalyzing={item.workspace.isAnalyzing}
              aiHelpInput={item.workspace.aiHelpState?.input ?? ''}
              aiHelpError={item.workspace.aiHelpState?.error ?? ''}
              isAiHelpLoading={item.workspace.aiHelpState?.isLoading ?? false}
              restoreOffset={
                hasStoredDiagnosisOffset(item.answerIndex)
                  ? diagnosisScrollOffsetsRef.current[item.answerIndex]
                  : undefined
              }
              shouldRestoreScroll={Boolean(
                diagnosisPendingRestoreRef.current[item.answerIndex],
              )}
              shouldAutoScrollToEnd={Boolean(
                diagnosisPendingAutoScrollRef.current[item.answerIndex],
              )}
              onInputChange={(text) => onInputChange(item.answerIndex, text)}
              onAnalyze={() => void onAnalyzePage(item)}
              onManualSelect={(methodId) => onManualSelect(item, methodId)}
              onConfirmPredicted={() => onConfirmPredicted(item)}
              onChoicePress={(optionId) => onChoicePress(item, optionId)}
              onExplainContinue={() => onExplainContinue(item)}
              onExplainDontKnow={() => onExplainDontKnow(item)}
              onCheckPress={(optionId) => onCheckPress(item, optionId)}
              onCheckDontKnow={() => onCheckDontKnow(item)}
              onFinalConfirm={() => onFinalConfirm(item)}
              onAiHelpInputChange={(text) => onAiHelpInputChange(item.answerIndex, text)}
              onAiHelpSubmit={() => onAiHelpSubmit(item)}
              onAiHelpContinue={() => onAiHelpContinue(item)}
              onAiHelpFallback={() => onAiHelpFallback(item)}
              onScrollOffsetChange={handleDiagnosisScrollOffsetChange}
              onAutoScrollHandled={handleDiagnosisAutoScrollHandled}
              onRestoreHandled={handleDiagnosisRestoreHandled}
            />
          )}
          style={styles.diagnosisPager}
          contentInsetAdjustmentBehavior="automatic"
          keyboardDismissMode="on-drag"
          showsHorizontalScrollIndicator={false}
          scrollEnabled={diagnosisPages.length > 1}
          getItemLayout={(_, index) => ({
            length: diagnosisPageWidth,
            offset: diagnosisPageWidth * index,
            index,
          })}
          onMomentumScrollEnd={handleDiagnosisMomentumEnd}
          onScrollToIndexFailed={({ index }) => onScrollToIndexFailed(index)}
        />
      </View>

      <DiagnosisExitConfirmModal
        visible={isExitModalVisible}
        onContinue={onCloseExitModal}
        onExit={onExitDiagnosis}
      />
    </View>
  );
}
```

- [ ] **Step 2: 불필요해진 스타일 제거**

`diagnosisSessionBar`, `diagnosisHeader`, `closeButton`, `diagnosisHeaderCopy`, `diagnosisHeaderTitle`, `diagnosisHeaderMeta`, `closeSpacer`, `navigatorRow`, `navigatorDots`, `navigatorDotsList`, `navigatorDotHitArea`, `navigatorDot`, `navigatorDotRegular`, `navigatorDotCompact`, `navigatorDotActive`, `navigatorDotActiveRegular`, `navigatorDotActiveCompact`, `navigatorDotCompleted`, `navigatorDotUpcoming` 스타일 항목 및 import에서 `BrandHeader`, `IconSymbol` 제거.

`diagnosisShell` 스타일에서 `paddingTop: BrandSpacing.sm` 제거:

```ts
diagnosisShell: {
  flex: 1,
  overflow: 'hidden',
  backgroundColor: DiagnosisTheme.canvas,
},
```

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: 커밋**

```bash
git add features/quiz/components/diagnostic-screen-view.tsx
git commit -m "feat(diagnosis): DiagnosticScreenView 헤더 교체 — BrandHeader 제거, DiagnosisDarkHeader 적용"
```

---

## Task 10: `use-exam-result-screen.ts` 라우트 변경

**Files:**
- Modify: `features/quiz/exam/hooks/use-exam-result-screen.ts:111-120`

`onAnalyzeProblem`에서 `/quiz/exam/diagnosis` 대신 `/quiz/exam/diagnosis-session`으로 이동. `wrongProblemNumbers`와 `startIndex`를 파라미터로 전달.

- [ ] **Step 1: `onAnalyzeProblem` 수정**

```ts
// features/quiz/exam/hooks/use-exam-result-screen.ts
// 기존 onAnalyzeProblem 블록을 아래로 교체:

onAnalyzeProblem: (problemNumber: number) => {
  if (!result) return;
  const wrongProblemNumbers = result.perProblem
    .filter((p) => !p.isCorrect && p.userAnswer !== null)
    .map((p) => p.number);
  const startIndex = wrongProblemNumbers.indexOf(problemNumber);
  router.push({
    pathname: '/quiz/exam/diagnosis-session',
    params: {
      examId: result.examId,
      wrongProblemNumbers: JSON.stringify(wrongProblemNumbers),
      startIndex: String(Math.max(0, startIndex)),
    },
  });
},
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/exam/hooks/use-exam-result-screen.ts
git commit -m "feat(exam): onAnalyzeProblem → diagnosis-session 라우트로 변경"
```

---

## Task 11: 최종 검증

앱을 실행하고 아래 시나리오를 직접 확인한다.

- [ ] **Step 1: TypeScript 최종 확인**

```bash
npx tsc --noEmit 2>&1
```

Expected: 에러 0개.

- [ ] **Step 2: 앱 실행**

```bash
npx expo start
```

- [ ] **Step 3: 모의고사 오답 분석 시나리오 확인**

1. 모의고사 시험 → 채점 결과 화면
2. 오답 문제 탭 → `diagnosis-session` 라우트 이동 확인
3. 다크 헤더 표시 확인 (`{n}번` 제목, `← 채점 결과`, `1 / M`, 도트)
4. 문제 이미지 카드 표시 확인 (이미지 + 번호 원)
5. 오답 빨강 원, 정답 초록 원 확인
6. `DiagnosisMethodSelectorCard` 표시 (칩 + 텍스트 입력 + 추천받기)
7. 방법 선택 후 채팅 플로우 진행 확인
8. 완료 후 `NextProblemCard` 등장 (FadeInDown 애니메이션)
9. "다음 문제 분석하기" 탭 → FlatList 다음 페이지 이동
10. 마지막 문제 완료 시 "모든 오답 분석 완료!" 표시
11. 오답 5개 초과 시 도트 5개 + `···` 렌더링
12. 스와이프(손가락)로 문제 이동 가능 확인

- [ ] **Step 4: 10문제 약점 분석 시나리오 확인**

1. 진단 시작 → 약점 분석 진입
2. 다크 헤더 표시 확인 (`Q{n}` 제목, `← 뒤로`, `1 / N`, 도트)
3. 완료된 문제 도트 초록 확인
4. 뒤로 버튼 탭 → 종료 확인 모달 팝업

- [ ] **Step 5: 커밋**

```bash
git add .
git commit -m "chore: 진단 채팅 UI 개선 최종 검증"
```

---

## 구현 순서 요약

```
Task 1  ExamProblem.imageKey 타입 추가         (독립)
Task 2  ExamProblemCard                        (Task 1 필요)
Task 3  NextProblemCard                        (독립)
Task 4  DiagnosisDarkHeader                    (독립)
Task 5  use-exam-diagnosis 리팩터              (Task 2, 3 필요)
Task 6  ExamDiagnosisPage 개편                 (Task 5 필요)
Task 7  SessionScreen + useSession             (Task 4, 6 필요)
Task 8  라우트 등록                            (Task 7 필요)
Task 9  DiagnosticScreenView 헤더 교체         (Task 4 필요)
Task 10 use-exam-result-screen 라우트 변경     (Task 8 필요)
Task 11 최종 검증                              (모든 Task 완료 후)
```

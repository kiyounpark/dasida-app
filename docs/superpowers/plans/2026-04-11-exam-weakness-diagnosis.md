# 모의고사 오답 약점 분석 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모의고사 결과 화면에서 오답 타일을 탭해 문제별 약점을 진단하고, 복습 큐에 자동 등록한다.

**Architecture:** 기존 `detailedDiagnosisFlows` 엔진과 `DiagnosisFlowCard`를 재사용하는 단일 문제 진단 루프. 결과 화면은 오답/미풀이 그리드로 전면 개편하고, 진단 완료 상태는 AsyncStorage에 저장해 재진입 시 복원한다.

**Tech Stack:** Expo Router, React Native, AsyncStorage (`@react-native-async-storage/async-storage`), `diagnosis-flow-engine.ts` (기존), `expo-image`

---

## File Map

| 역할 | 파일 | 변경 |
|------|------|------|
| 채팅 버블 + 아바타 | `features/quiz/components/diagnosis-chat-bubble.tsx` | 수정 |
| 진단 대화 페이지 | `features/quiz/components/diagnosis-conversation-page.tsx` | 수정 |
| 진단 진행 상태 저장 | `features/quiz/exam/exam-diagnosis-progress.ts` | **신규** |
| 결과 화면 hook | `features/quiz/exam/hooks/use-exam-result-screen.ts` | 수정 |
| 결과 화면 View | `features/quiz/exam/screens/exam-result-screen-view.tsx` | 수정 |
| 진단 attempt 빌더 | `features/quiz/exam/build-exam-diagnosis-attempt-input.ts` | **신규** |
| 진단 hook | `features/quiz/exam/hooks/use-exam-diagnosis.ts` | **신규** |
| 진단 Screen+View | `features/quiz/exam/screens/exam-diagnosis-screen.tsx` | **신규** |
| 라우트 | `app/(tabs)/quiz/exam/diagnosis.tsx` | **신규** |
| 레이아웃 | `app/(tabs)/quiz/exam/_layout.tsx` | 수정 |

---

## Task 1: DiagnosisChatBubble 아바타 prop 추가

**Files:**
- Modify: `features/quiz/components/diagnosis-chat-bubble.tsx`
- Modify: `features/quiz/components/diagnosis-conversation-page.tsx`

- [ ] **Step 1: DiagnosisChatBubble에 `showAvatar` prop 추가**

`features/quiz/components/diagnosis-chat-bubble.tsx` 전체를 다음으로 교체:

```tsx
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { BrandRadius, BrandSpacing } from '@/constants/brand';
import { DiagnosisTheme } from '@/constants/diagnosis-theme';

type DiagnosisChatBubbleProps = {
  role: 'assistant' | 'user';
  text: string;
  variant?: 'assistant' | 'user';
  tone?: 'neutral' | 'positive' | 'warning' | 'info';
  showAvatar?: boolean;
};

export function DiagnosisChatBubble({
  role,
  text,
  variant,
  tone = 'neutral',
  showAvatar = false,
}: DiagnosisChatBubbleProps) {
  const resolvedVariant = variant ?? role;
  const isUser = resolvedVariant === 'user';
  const hasAccent = !isUser && tone !== 'neutral';

  return (
    <View style={[styles.row, isUser ? styles.userRow : styles.assistantRow]}>
      {!isUser && showAvatar && (
        <Image
          source={require('@/assets/review/ai-coach-avatar.png')}
          style={styles.avatar}
          contentFit="cover"
        />
      )}
      {!isUser && !showAvatar && <View style={styles.avatarPlaceholder} />}
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          !isUser && tone === 'warning' ? styles.assistantWarning : null,
        ]}>
        {!isUser && hasAccent ? (
          <View
            style={[
              styles.accent,
              tone === 'positive' ? styles.positiveAccent : null,
              tone === 'warning' ? styles.warningAccent : null,
              tone === 'info' ? styles.infoAccent : null,
            ]}
          />
        ) : null}
        <Text
          selectable
          style={[
            styles.text,
            isUser ? styles.userText : styles.assistantText,
            !isUser && tone === 'positive' ? styles.positiveText : null,
            !isUser && tone === 'warning' ? styles.warningText : null,
            !isUser && tone === 'info' ? styles.infoText : null,
          ]}>
          {text}
        </Text>
      </View>
    </View>
  );
}

const AVATAR_SIZE = 28;

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    flexShrink: 0,
  },
  avatarPlaceholder: {
    width: 0,
    height: AVATAR_SIZE,
  },
  bubble: {
    position: 'relative',
    borderRadius: BrandRadius.md + 4,
    borderCurve: 'continuous',
    paddingVertical: 13,
    paddingHorizontal: 16,
    boxShadow: '0 8px 20px rgba(36, 50, 41, 0.06)',
    flexShrink: 1,
  },
  assistantBubble: {
    maxWidth: '82%',
    backgroundColor: DiagnosisTheme.assistantBubble,
    borderWidth: 1,
    borderColor: DiagnosisTheme.assistantBubbleBorder,
    borderBottomLeftRadius: 4,
  },
  assistantWarning: {
    backgroundColor: DiagnosisTheme.warningBg,
    borderColor: DiagnosisTheme.warningBorder,
  },
  userBubble: {
    maxWidth: '76%',
    backgroundColor: DiagnosisTheme.userBubble,
    borderTopRightRadius: 10,
  },
  accent: {
    position: 'absolute',
    top: 12,
    bottom: 12,
    left: 10,
    width: 3,
    borderRadius: 999,
    backgroundColor: DiagnosisTheme.choiceActiveBorder,
  },
  positiveAccent: { backgroundColor: '#527A5F' },
  warningAccent: { backgroundColor: '#C9973E' },
  infoAccent: { backgroundColor: '#7B9079' },
  text: {
    fontSize: 15,
    lineHeight: 23,
  },
  assistantText: {
    color: DiagnosisTheme.ink,
    paddingLeft: 2,
  },
  userText: {
    color: DiagnosisTheme.userBubbleText,
    fontWeight: '700',
  },
  positiveText: { color: '#355B43', paddingLeft: BrandSpacing.sm },
  warningText: { color: '#775520', paddingLeft: BrandSpacing.sm },
  infoText: { color: '#4D6754', paddingLeft: BrandSpacing.sm },
});
```

- [ ] **Step 2: diagnosis-conversation-page.tsx에 `showAvatar` prop 전달**

`features/quiz/components/diagnosis-conversation-page.tsx`의 `DiagnosisConversationPageProps` 타입에 추가:

```tsx
// 기존 type 선언에 추가
type DiagnosisConversationPageProps = {
  // ... (기존 props 유지)
  showAvatar?: boolean;  // ← 추가
  // ...
};
```

`DiagnosisConversationPage` 함수 파라미터에 추가:

```tsx
export function DiagnosisConversationPage({
  // ... (기존 파라미터 유지)
  showAvatar = false,  // ← 추가
  // ...
}: DiagnosisConversationPageProps) {
```

bubble 렌더링 부분에서 `showAvatar` 전달:

```tsx
// 기존:
<DiagnosisChatBubble
  role={entry.role}
  text={entry.text}
  tone={entry.tone}
/>
// 변경:
<DiagnosisChatBubble
  role={entry.role}
  text={entry.text}
  tone={entry.tone}
  showAvatar={showAvatar}
/>
```

- [ ] **Step 3: TypeScript 검증**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 4: commit**

```bash
git add features/quiz/components/diagnosis-chat-bubble.tsx features/quiz/components/diagnosis-conversation-page.tsx
git commit -m "feat(diagnosis): DiagnosisChatBubble 선생님 아바타 prop 추가"
```

---

## Task 2: exam-diagnosis-progress.ts — 진단 진행 상태 AsyncStorage 헬퍼 신규

**Files:**
- Create: `features/quiz/exam/exam-diagnosis-progress.ts`

- [ ] **Step 1: 파일 생성**

`features/quiz/exam/exam-diagnosis-progress.ts` 생성:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { WeaknessId } from '@/data/diagnosisMap';

/**
 * 모의고사별 오답 진단 완료 목록을 AsyncStorage에 저장/조회한다.
 * key: exam_diag_{examId}
 * value: { [problemNumber]: WeaknessId }
 */

export type ExamDiagnosisProgress = Record<number, WeaknessId>;

function storageKey(examId: string) {
  return `exam_diag_${examId}`;
}

export async function getDiagnosisProgress(
  examId: string,
): Promise<ExamDiagnosisProgress> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(examId));
    if (!raw) return {};
    return JSON.parse(raw) as ExamDiagnosisProgress;
  } catch {
    return {};
  }
}

export async function markProblemDiagnosed(
  examId: string,
  problemNumber: number,
  weaknessId: WeaknessId,
): Promise<void> {
  const current = await getDiagnosisProgress(examId);
  const updated: ExamDiagnosisProgress = { ...current, [problemNumber]: weaknessId };
  await AsyncStorage.setItem(storageKey(examId), JSON.stringify(updated));
}
```

- [ ] **Step 2: TypeScript 검증**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 3: commit**

```bash
git add features/quiz/exam/exam-diagnosis-progress.ts
git commit -m "feat(exam): 모의고사 오답 진단 진행 상태 AsyncStorage 헬퍼 추가"
```

---

## Task 3: use-exam-result-screen.ts — 타일 로직 + 진단 진행률 추가

**Files:**
- Modify: `features/quiz/exam/hooks/use-exam-result-screen.ts`

- [ ] **Step 1: ProblemTile 타입 및 새 반환값 추가**

`features/quiz/exam/hooks/use-exam-result-screen.ts` 전체를 다음으로 교체:

```ts
import { useFocusEffect } from 'expo-router';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useCurrentLearner } from '@/features/learner/provider';
import { useQuizSession } from '@/features/quiz/session';
import { EXAM_CATALOG_BY_ID } from '@/features/quiz/data/exam-catalog';

import { buildExamAttemptInput } from '../build-exam-attempt-input';
import {
  getDiagnosisProgress,
  type ExamDiagnosisProgress,
} from '../exam-diagnosis-progress';
import { useExamSession } from '../exam-session';
import type { ExamResultSummary } from '../types';

export type ResultSaveState = 'idle' | 'saving' | 'saved' | 'error';

export type ProblemTile = {
  number: number;
  topic: string;
  score: number;
  status: 'undone' | 'done' | 'blank';
};

export type UseExamResultScreenResult = {
  result: ExamResultSummary | null;
  examTitle: string;
  saveState: ResultSaveState;
  problemTiles: ProblemTile[];
  diagnosedCount: number;
  wrongCount: number;
  onAnalyzeProblem: (problemNumber: number) => void;
  onReturnHome: () => void;
};

export function useExamResultScreen(): UseExamResultScreenResult {
  const { state, resetExam } = useExamSession();
  const { resetSession } = useQuizSession();
  const { profile, recordAttempt, session } = useCurrentLearner();
  const [saveState, setSaveState] = useState<ResultSaveState>('idle');
  const [diagnosedProblems, setDiagnosedProblems] = useState<ExamDiagnosisProgress>({});
  const saveAttempted = useRef(false);

  const result = state.result;
  const examTitle = result ? (EXAM_CATALOG_BY_ID[result.examId]?.title ?? result.examId) : '';

  // 결과 저장 (최초 1회)
  useEffect(() => {
    if (!result || !profile || !session) return;
    if (saveAttempted.current) return;
    saveAttempted.current = true;

    setSaveState('saving');
    recordAttempt(buildExamAttemptInput({ session, profile, result }))
      .then(() => setSaveState('saved'))
      .catch(() => setSaveState('error'));
  }, [result, profile, session, recordAttempt]);

  // 포커스 시 진단 진행 상태 갱신
  useFocusEffect(
    useCallback(() => {
      if (!result) return;
      getDiagnosisProgress(result.examId).then(setDiagnosedProblems);
    }, [result]),
  );

  // 문제 타일 계산
  const problemTiles: ProblemTile[] = result
    ? result.perProblem
        .filter((p) => !p.isCorrect)
        .sort((a, b) => {
          // 오답 먼저(점수 높은 순), 미풀이 나중(점수 높은 순)
          const aBlank = p.userAnswer === null || a.userAnswer === null;
          const bBlank = b.userAnswer === null;
          if (aBlank !== bBlank) return aBlank ? 1 : -1;
          return b.earnedScore - a.earnedScore;
        })
        .map((p) => ({
          number: p.number,
          topic: 'exam',   // ExamProblem의 topic은 결과 요약에 없으므로 placeholder
          score: p.earnedScore === 0 ? 0 : p.earnedScore, // TODO: 원점수는 ExamProblem에서 조회 필요
          status:
            p.userAnswer === null
              ? 'blank'
              : diagnosedProblems[p.number]
                ? 'done'
                : 'undone',
        }))
    : [];

  const wrongCount = result
    ? result.perProblem.filter((p) => !p.isCorrect && p.userAnswer !== null).length
    : 0;
  const diagnosedCount = Object.keys(diagnosedProblems).length;

  return {
    result,
    examTitle,
    saveState,
    problemTiles,
    diagnosedCount,
    wrongCount,
    onAnalyzeProblem: (problemNumber: number) => {
      if (!result) return;
      router.push({
        pathname: '/quiz/exam/diagnosis',
        params: {
          examId: result.examId,
          problemNumber: String(problemNumber),
          wrongCount: String(wrongCount),
          diagnosedCount: String(diagnosedCount),
        },
      });
    },
    onReturnHome: () => {
      resetExam();
      router.replace('/quiz');
    },
  };
}
```

> **참고**: `problemTiles`의 `topic`은 `ExamResultSummary.perProblem`에 없음. Task 4에서 View에서 단순히 `${tile.number}번` 형태로 표시 처리.

- [ ] **Step 2: TypeScript 검증**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 3: commit**

```bash
git add features/quiz/exam/hooks/use-exam-result-screen.ts
git commit -m "feat(exam): 결과 화면 hook에 오답 타일 + 진단 진행률 추가"
```

---

## Task 4: exam-result-screen-view.tsx 전면 개편

**Files:**
- Modify: `features/quiz/exam/screens/exam-result-screen-view.tsx`
- Modify: `features/quiz/exam/screens/exam-result-screen.tsx`

- [ ] **Step 1: ExamResultScreen thin screen 업데이트**

`features/quiz/exam/screens/exam-result-screen.tsx` 교체:

```tsx
import { ExamResultScreenView } from './exam-result-screen-view';
import { useExamResultScreen } from '../hooks/use-exam-result-screen';

export function ExamResultScreen() {
  const hook = useExamResultScreen();

  if (!hook.result) return null;

  return <ExamResultScreenView {...hook} result={hook.result} />;
}
```

- [ ] **Step 2: exam-result-screen-view.tsx 전면 교체**

`features/quiz/exam/screens/exam-result-screen-view.tsx` 전체를 다음으로 교체:

```tsx
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

import type { ProblemTile, UseExamResultScreenResult } from '../hooks/use-exam-result-screen';
import type { ExamResultSummary } from '../types';

type Props = Omit<UseExamResultScreenResult, 'result'> & {
  result: ExamResultSummary;
};

export function ExamResultScreenView({
  result,
  examTitle,
  saveState,
  problemTiles,
  diagnosedCount,
  wrongCount,
  onAnalyzeProblem,
  onReturnHome,
}: Props) {
  const insets = useSafeAreaInsets();
  const progressPercent = wrongCount > 0 ? (diagnosedCount / wrongCount) * 100 : 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}>

      {/* ── 헤더 패널 ── */}
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <Text selectable style={styles.examName}>{examTitle}</Text>
        <View style={styles.scoreRow}>
          <View style={styles.scoreLeft}>
            <Text selectable style={styles.scoreNum}>{result.totalScore}</Text>
            <Text selectable style={styles.scoreDenom}>/ {result.maxScore}점</Text>
          </View>
          <View style={styles.ring}>
            <Text selectable style={styles.ringPct}>{result.accuracy}%</Text>
            <Text selectable style={styles.ringLabel}>정답률</Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <View style={[styles.statChip, styles.chipCorrect]}>
            <View style={[styles.dot, styles.dotCorrect]} />
            <Text selectable style={styles.chipText}>정답 {result.correct}</Text>
          </View>
          <View style={[styles.statChip, styles.chipWrong]}>
            <View style={[styles.dot, styles.dotWrong]} />
            <Text selectable style={styles.chipText}>오답 {result.wrong}</Text>
          </View>
          {result.unanswered > 0 && (
            <View style={[styles.statChip, styles.chipBlank]}>
              <View style={[styles.dot, styles.dotBlank]} />
              <Text selectable style={styles.chipText}>미풀이 {result.unanswered}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── 바디 ── */}
      <View style={styles.body}>

        {/* 약점 분석 진행률 */}
        {wrongCount > 0 && (
          <View style={styles.progWrap}>
            <View style={styles.progHead}>
              <Text selectable style={styles.progLabel}>약점 분석</Text>
              <Text selectable style={styles.progCount}>{diagnosedCount} / {wrongCount} 완료</Text>
            </View>
            <View style={styles.progTrack}>
              <View style={[styles.progFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>
        )}

        {/* 저장 상태 */}
        {saveState === 'error' && (
          <Text selectable style={styles.saveError}>결과 저장에 실패했습니다.</Text>
        )}

        {/* 문제 그리드 */}
        {problemTiles.length > 0 && (
          <View>
            <Text selectable style={styles.secTitle}>틀린 문제 · 미풀이</Text>
            <View style={styles.grid}>
              {problemTiles.map((tile) => (
                <ProblemTileCard
                  key={tile.number}
                  tile={tile}
                  onPress={() => onAnalyzeProblem(tile.number)}
                />
              ))}
            </View>
          </View>
        )}

        <View style={styles.divider} />
        <Pressable
          accessibilityRole="button"
          onPress={onReturnHome}
          style={styles.homeBtn}>
          <Text selectable style={styles.homeBtnText}>홈으로 돌아가기</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function ProblemTileCard({
  tile,
  onPress,
}: {
  tile: ProblemTile;
  onPress: () => void;
}) {
  const isUndone = tile.status === 'undone';
  const isDone = tile.status === 'done';
  const isBlank = tile.status === 'blank';

  return (
    <Pressable
      onPress={isUndone ? onPress : undefined}
      disabled={!isUndone}
      accessibilityRole={isUndone ? 'button' : undefined}
      style={[
        styles.tile,
        isUndone && styles.tileUndone,
        isDone && styles.tileDone,
        isBlank && styles.tileBlank,
      ]}>
      <Text
        selectable
        style={[
          styles.tileNum,
          isUndone && styles.tileNumUndone,
          isDone && styles.tileNumDone,
          isBlank && styles.tileNumBlank,
        ]}>
        {tile.number}
      </Text>
      <View
        style={[
          styles.tileAction,
          isUndone && styles.tileActionUndone,
          isDone && styles.tileActionDone,
          isBlank && styles.tileActionBlank,
        ]}>
        <Text
          selectable
          style={[
            styles.tileActionText,
            isUndone && styles.tileActionTextUndone,
            isDone && styles.tileActionTextDone,
            isBlank && styles.tileActionTextBlank,
          ]}>
          {isUndone ? '왜 틀렸지?' : isDone ? '✓ 완료' : '미풀이'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  container: {
    flexGrow: 1,
  },

  // ── 헤더 패널 ──
  hero: {
    backgroundColor: BrandColors.primaryDark,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  examName: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    color: '#6BAA72',
    letterSpacing: 0.4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  scoreNum: {
    fontFamily: FontFamilies.bold,
    fontSize: 48,
    lineHeight: 52,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  scoreDenom: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.38)',
  },
  ring: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: '#7FC87A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPct: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  ringLabel: {
    fontFamily: FontFamilies.regular,
    fontSize: 8,
    color: '#7FC87A',
  },
  statRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  chipCorrect: { backgroundColor: 'rgba(127,200,122,0.15)' },
  chipWrong: { backgroundColor: 'rgba(220,80,80,0.18)' },
  chipBlank: { backgroundColor: 'rgba(255,255,255,0.08)' },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  dotCorrect: { backgroundColor: '#7FC87A' },
  dotWrong: { backgroundColor: '#E07070' },
  dotBlank: { backgroundColor: 'rgba(255,255,255,0.3)' },
  chipText: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },

  // ── 바디 ──
  body: {
    padding: 18,
    gap: 16,
  },
  progWrap: {
    gap: 6,
  },
  progHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: '#4A4540',
  },
  progCount: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: BrandColors.primarySoft,
  },
  progTrack: {
    height: 5,
    backgroundColor: '#E4DFD6',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progFill: {
    height: '100%',
    backgroundColor: BrandColors.primarySoft,
    borderRadius: 999,
  },
  saveError: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    color: BrandColors.danger,
    textAlign: 'center',
  },
  secTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    color: '#1B1A17',
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  // ── 타일 ──
  tile: {
    width: '31%',
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  tileUndone: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8E3D8',
    boxShadow: '0 3px 0 #CECDCA',
  },
  tileDone: {
    backgroundColor: '#EDF7ED',
    borderWidth: 1.5,
    borderColor: '#B8DDB8',
    opacity: 0.85,
  },
  tileBlank: {
    backgroundColor: '#F5F3EF',
    borderWidth: 1.5,
    borderColor: '#C8C2B4',
    borderStyle: 'dashed',
  },
  tileNum: {
    fontFamily: FontFamilies.bold,
    fontSize: 22,
    lineHeight: 26,
    fontVariant: ['tabular-nums'],
  },
  tileNumUndone: { color: '#1B1A17' },
  tileNumDone: { color: '#3A7A3A' },
  tileNumBlank: { color: '#A89F8C' },
  tileAction: {
    width: '100%',
    paddingVertical: 5,
    borderRadius: 7,
    alignItems: 'center',
  },
  tileActionUndone: { backgroundColor: BrandColors.primaryDark },
  tileActionDone: { backgroundColor: '#C8EAC8' },
  tileActionBlank: {
    borderWidth: 1,
    borderColor: '#C8C2B4',
    borderStyle: 'dashed',
  },
  tileActionText: {
    fontFamily: FontFamilies.bold,
    fontSize: 10,
  },
  tileActionTextUndone: { color: '#FFFFFF' },
  tileActionTextDone: { color: '#2E7A2E' },
  tileActionTextBlank: { color: '#B8B0A4' },

  divider: {
    height: 1,
    backgroundColor: '#EAE6DE',
  },
  homeBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D8D3C8',
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    paddingVertical: 14,
    alignItems: 'center',
  },
  homeBtnText: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: '#8E8A81',
  },
});
```

- [ ] **Step 3: TypeScript 검증**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 4: 시뮬레이터에서 모의고사 결과 화면 직접 확인**

모의고사를 풀고 결과 화면 진입 시:
- 다크 헤더에 점수, 정답률 링, 배지 표시됨
- 오답/미풀이 타일 3열 그리드 표시됨
- "왜 틀렸지?" 타일은 탭 가능(진한 배경 버튼), 미풀이는 점선

- [ ] **Step 5: commit**

```bash
git add features/quiz/exam/screens/exam-result-screen-view.tsx features/quiz/exam/screens/exam-result-screen.tsx
git commit -m "feat(exam): 결과 화면 UI 전면 개편 — 오답 그리드 + 약점 분석 진행률"
```

---

## Task 5: build-exam-diagnosis-attempt-input.ts 신규 + use-exam-diagnosis.ts 신규

**Files:**
- Create: `features/quiz/exam/build-exam-diagnosis-attempt-input.ts`
- Create: `features/quiz/exam/hooks/use-exam-diagnosis.ts`

- [ ] **Step 1: build-exam-diagnosis-attempt-input.ts 생성**

`features/quiz/exam/build-exam-diagnosis-attempt-input.ts` 생성:

```ts
import type { WeaknessId } from '@/data/diagnosisMap';
import type { SolveMethodId } from '@/data/diagnosisTree';
import type { AuthSession } from '@/features/auth/types';
import type { FinalizedAttemptInput } from '@/features/learning/history-repository';
import type { LearnerProfile } from '@/features/learner/types';

function createAttemptId(examId: string, problemNumber: number) {
  return `exam-diag-${examId}-p${problemNumber}-${Date.now().toString(36)}`;
}

export function buildExamDiagnosisAttemptInput(params: {
  session: AuthSession;
  profile: LearnerProfile;
  examId: string;
  problemNumber: number;
  topic: string;
  methodId: SolveMethodId;
  weaknessId: WeaknessId;
  startedAt: string;
  completedAt: string;
}): FinalizedAttemptInput {
  const {
    session,
    profile,
    examId,
    problemNumber,
    topic,
    methodId,
    weaknessId,
    startedAt,
    completedAt,
  } = params;

  return {
    attemptId: createAttemptId(examId, problemNumber),
    accountKey: session.accountKey,
    learnerId: profile.learnerId,
    source: 'exam',
    sourceEntityId: examId,
    gradeSnapshot: profile.grade,
    startedAt,
    completedAt,
    questionCount: 1,
    correctCount: 0,
    wrongCount: 1,
    accuracy: 0,
    primaryWeaknessId: weaknessId,
    topWeaknesses: [weaknessId],
    questions: [
      {
        questionId: `${examId}/${problemNumber}`,
        questionNumber: problemNumber,
        topic,
        selectedIndex: null,
        isCorrect: false,
        finalWeaknessId: weaknessId,
        methodId,
        diagnosisSource: 'detail',
        finalMethodSource: 'manual',
        diagnosisCompleted: true,
        usedDontKnow: false,
        usedAiHelp: false,
      },
    ],
  };
}
```

- [ ] **Step 2: use-exam-diagnosis.ts 생성**

`features/quiz/exam/hooks/use-exam-diagnosis.ts` 생성:

```ts
import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';

import type { WeaknessId } from '@/data/diagnosisMap';
import type { SolveMethodId } from '@/data/diagnosisTree';
import { methodOptions } from '@/data/diagnosisTree';
import type { DetailedDiagnosisFlow } from '@/data/detailedDiagnosisFlows';
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
import { useCurrentLearner } from '@/features/learner/provider';

import { buildExamDiagnosisAttemptInput } from '../build-exam-diagnosis-attempt-input';
import { markProblemDiagnosed } from '../exam-diagnosis-progress';

// ── 대화 엔트리 타입 ─────────────────────────────────────────────────────────

export type ExamDiagEntry =
  | { kind: 'bubble'; id: string; role: 'assistant' | 'user'; text: string }
  | { kind: 'method-choices'; id: string; interactive: boolean }
  | { kind: 'flow-node'; id: string; flow: DetailedDiagnosisFlow; draft: DiagnosisFlowDraft; interactive: boolean };

// ── 메서드 선택지 타입 ────────────────────────────────────────────────────────

export type MethodChoice = {
  id: SolveMethodId;
  label: string;
};

// ── Hook 반환 타입 ────────────────────────────────────────────────────────────

export type UseExamDiagnosisResult = {
  problemNumber: number;
  topic: string;
  score: number;
  progressLabel: string;          // 예: "2 / 7"
  progressPercent: number;        // 0~100
  entries: ExamDiagEntry[];
  methodChoices: MethodChoice[];
  selectedMethodId: SolveMethodId | null;
  isDone: boolean;
  isSaving: boolean;
  onSelectMethod: (methodId: SolveMethodId) => void;
  onChoicePress: (optionId: string) => void;
  onExplainContinue: () => void;
  onExplainDontKnow: () => void;
  onCheckPress: (optionId: string) => void;
  onCheckDontKnow: () => void;
  onFinalConfirm: () => void;
  onBack: () => void;
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useExamDiagnosis(params: {
  examId: string;
  problemNumber: number;
  wrongCount: number;
  diagnosedCount: number;
}): UseExamDiagnosisResult {
  const { examId, problemNumber, wrongCount, diagnosedCount } = params;
  const { session, profile, recordAttempt } = useCurrentLearner();

  const problem = useMemo(
    () => getExamProblems(examId).find((p) => p.number === problemNumber),
    [examId, problemNumber],
  );

  const methodChoices: MethodChoice[] = useMemo(
    () =>
      (problem?.diagnosisMethods ?? [])
        .map((id) => methodOptions.find((o) => o.id === id))
        .filter((o): o is NonNullable<typeof o> => !!o)
        .map((o) => ({ id: o.id, label: o.labelKo })),
    [problem],
  );

  const [selectedMethodId, setSelectedMethodId] = useState<SolveMethodId | null>(null);
  const [draft, setDraft] = useState<DiagnosisFlowDraft | null>(null);
  const [entries, setEntries] = useState<ExamDiagEntry[]>(() => [
    {
      kind: 'bubble',
      id: 'intro',
      role: 'assistant',
      text: '어떤 방법으로 풀려고 했나요?',
    },
    { kind: 'method-choices', id: 'methods', interactive: true },
  ]);
  const [isDone, setIsDone] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const startedAt = useRef(new Date().toISOString());

  const appendEntry = useCallback((entry: ExamDiagEntry) => {
    setEntries((prev) => {
      // 이전 interactive 엔트리를 비활성화
      const frozen = prev.map((e) =>
        'interactive' in e ? { ...e, interactive: false } : e,
      );
      return [...frozen, entry];
    });
  }, []);

  // 메서드 선택
  const onSelectMethod = useCallback(
    (methodId: SolveMethodId) => {
      const method = methodOptions.find((o) => o.id === methodId);
      if (!method) return;

      setSelectedMethodId(methodId);

      // 사용자 선택 버블 추가
      setEntries((prev) => {
        const frozen = prev.map((e) =>
          'interactive' in e ? { ...e, interactive: false } : e,
        );
        return [
          ...frozen,
          {
            kind: 'bubble' as const,
            id: `user-method`,
            role: 'user' as const,
            text: method.labelKo,
          },
        ];
      });

      // flow draft 생성 + 첫 노드 추가
      const newDraft = createDiagnosisFlowDraft(methodId);
      setDraft(newDraft);
      const flow = getDiagnosisFlow(methodId);

      setEntries((prev) => [
        ...prev,
        {
          kind: 'flow-node',
          id: `node-${newDraft.currentNodeId}`,
          flow,
          draft: newDraft,
          interactive: true,
        },
      ]);
    },
    [],
  );

  // 플로우 전진 후 다음 엔트리 추가
  const advanceDraft = useCallback(
    (nextDraft: DiagnosisFlowDraft, userText: string) => {
      const flow = getDiagnosisFlow(nextDraft.methodId);
      const node = getNode(flow, nextDraft.currentNodeId);

      setDraft(nextDraft);

      setEntries((prev) => {
        const frozen = prev.map((e) =>
          'interactive' in e ? { ...e, interactive: false } : e,
        );
        if (userText) {
          frozen.push({
            kind: 'bubble',
            id: `user-${nextDraft.currentNodeId}`,
            role: 'user',
            text: userText,
          });
        }
        if (node.kind !== 'final') {
          frozen.push({
            kind: 'flow-node',
            id: `node-${nextDraft.currentNodeId}-${Date.now()}`,
            flow,
            draft: nextDraft,
            interactive: true,
          });
        } else {
          // final 노드: 완료 버블만 추가
          frozen.push({
            kind: 'flow-node',
            id: `final-${Date.now()}`,
            flow,
            draft: nextDraft,
            interactive: true,
          });
        }
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
      const nextDraft = advanceFromChoice(draft, optionId);
      advanceDraft(nextDraft, option.text);
    },
    [draft, advanceDraft],
  );

  const onExplainContinue = useCallback(() => {
    if (!draft) return;
    const nextDraft = advanceFromExplain(draft, 'primary');
    advanceDraft(nextDraft, '확인할게요');
  }, [draft, advanceDraft]);

  const onExplainDontKnow = useCallback(() => {
    if (!draft) return;
    const nextDraft = advanceFromExplain(draft, 'secondary');
    advanceDraft(nextDraft, '모르겠습니다');
  }, [draft, advanceDraft]);

  const onCheckPress = useCallback(
    (optionId: string) => {
      if (!draft) return;
      const flow = getDiagnosisFlow(draft.methodId);
      const node = getNode(flow, draft.currentNodeId);
      if (node.kind !== 'check') return;
      const option = node.options.find((o) => o.id === optionId);
      if (!option) return;
      const nextDraft = advanceFromCheck(draft, optionId);
      advanceDraft(nextDraft, option.text);
    },
    [draft, advanceDraft],
  );

  const onCheckDontKnow = useCallback(() => {
    if (!draft) return;
    const nextDraft = advanceFromCheck(draft, '__dont_know__');
    advanceDraft(nextDraft, '모르겠습니다');
  }, [draft, advanceDraft]);

  // 최종 확인 → 저장 + 뒤로
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
    } finally {
      setIsSaving(false);
      router.back();
    }
  }, [draft, session, profile, examId, problemNumber, problem, recordAttempt]);

  const progressPercent =
    wrongCount > 0 ? ((diagnosedCount / wrongCount) * 100) : 0;

  return {
    problemNumber,
    topic: problem?.topic ?? '문제',
    score: problem?.score ?? 0,
    progressLabel: `${diagnosedCount + 1} / ${wrongCount}`,
    progressPercent,
    entries,
    methodChoices,
    selectedMethodId,
    isDone,
    isSaving,
    onSelectMethod,
    onChoicePress,
    onExplainContinue,
    onExplainDontKnow,
    onCheckPress,
    onCheckDontKnow,
    onFinalConfirm,
    onBack: () => router.back(),
  };
}
```

- [ ] **Step 3: TypeScript 검증**

```bash
npx tsc --noEmit
```

Expected: 0 errors (또는 `advanceFromExplain` 시그니처에 따라 소수 오류 — Task 6 전에 수정)

- [ ] **Step 4: commit**

```bash
git add features/quiz/exam/build-exam-diagnosis-attempt-input.ts features/quiz/exam/hooks/use-exam-diagnosis.ts
git commit -m "feat(exam): 모의고사 오답 진단 attempt 빌더 + hook 추가"
```

---

## Task 6: exam-diagnosis-screen.tsx 신규

**Files:**
- Create: `features/quiz/exam/screens/exam-diagnosis-screen.tsx`

- [ ] **Step 1: 파일 생성**

`features/quiz/exam/screens/exam-diagnosis-screen.tsx` 생성:

```tsx
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { DiagnosisTheme } from '@/constants/diagnosis-theme';
import { FontFamilies } from '@/constants/typography';
import { DiagnosisChatBubble } from '@/features/quiz/components/diagnosis-chat-bubble';
import { DiagnosisFlowCard } from '@/features/quiz/components/diagnosis-flow-card';
import { getSingleParam } from '@/utils/get-single-param';

import {
  useExamDiagnosis,
  type ExamDiagEntry,
  type MethodChoice,
} from '../hooks/use-exam-diagnosis';

export function ExamDiagnosisScreen() {
  const params = useLocalSearchParams();
  const examId = getSingleParam(params.examId) ?? '';
  const problemNumber = Number(getSingleParam(params.problemNumber) ?? '0');
  const wrongCount = Number(getSingleParam(params.wrongCount) ?? '0');
  const diagnosedCount = Number(getSingleParam(params.diagnosedCount) ?? '0');

  const hook = useExamDiagnosis({ examId, problemNumber, wrongCount, diagnosedCount });

  return (
    <ExamDiagnosisScreenView
      {...hook}
      examId={examId}
    />
  );
}

type ViewProps = ReturnType<typeof useExamDiagnosis> & { examId: string };

function ExamDiagnosisScreenView({
  problemNumber,
  topic,
  score,
  progressLabel,
  progressPercent,
  entries,
  methodChoices,
  isDone,
  isSaving,
  onSelectMethod,
  onChoicePress,
  onExplainContinue,
  onExplainDontKnow,
  onCheckPress,
  onCheckDontKnow,
  onFinalConfirm,
  onBack,
}: ViewProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 200);
  }, [entries.length]);

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      {/* ── 헤더 ── */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerInner}>
          <Pressable onPress={onBack} style={styles.backBtn} accessibilityRole="button">
            <Text style={styles.backText}>← 채점 결과</Text>
          </Pressable>
          <Text selectable style={styles.headerTitle}>{problemNumber}번 · {topic}</Text>
          <Text selectable style={styles.headerSub}>오답 분석 {progressLabel}</Text>
        </View>
        <View style={styles.progTrack}>
          <View style={[styles.progFill, { width: `${progressPercent}%` }]} />
        </View>
      </SafeAreaView>

      {/* ── 대화 ── */}
      <ScrollView
        ref={scrollRef}
        style={styles.canvas}
        contentContainerStyle={styles.canvasContent}
        keyboardDismissMode="on-drag">
        {entries.map((entry) => (
          <Animated.View
            key={entry.id}
            entering={FadeInDown.duration(220).withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })}>
            <EntryRenderer
              entry={entry}
              methodChoices={methodChoices}
              onSelectMethod={onSelectMethod}
              onChoicePress={onChoicePress}
              onExplainContinue={onExplainContinue}
              onExplainDontKnow={onExplainDontKnow}
              onCheckPress={onCheckPress}
              onCheckDontKnow={onCheckDontKnow}
              onFinalConfirm={onFinalConfirm}
            />
          </Animated.View>
        ))}
        {isSaving && (
          <View style={styles.savingRow}>
            <ActivityIndicator size="small" color={BrandColors.primarySoft} />
            <Text style={styles.savingText}>저장 중...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function EntryRenderer({
  entry,
  methodChoices,
  onSelectMethod,
  onChoicePress,
  onExplainContinue,
  onExplainDontKnow,
  onCheckPress,
  onCheckDontKnow,
  onFinalConfirm,
}: {
  entry: ExamDiagEntry;
  methodChoices: MethodChoice[];
  onSelectMethod: (id: string) => void;
  onChoicePress: (optionId: string) => void;
  onExplainContinue: () => void;
  onExplainDontKnow: () => void;
  onCheckPress: (optionId: string) => void;
  onCheckDontKnow: () => void;
  onFinalConfirm: () => void;
}) {
  if (entry.kind === 'bubble') {
    return (
      <DiagnosisChatBubble
        role={entry.role}
        text={entry.text}
        showAvatar={entry.role === 'assistant'}
      />
    );
  }

  if (entry.kind === 'method-choices') {
    return (
      <View style={styles.methodChoices}>
        {methodChoices.map((choice) => (
          <Pressable
            key={choice.id}
            onPress={() => onSelectMethod(choice.id)}
            disabled={!entry.interactive}
            style={[
              styles.methodChoice,
              !entry.interactive && styles.methodChoiceDisabled,
            ]}
            accessibilityRole="button">
            <Text
              selectable
              style={[
                styles.methodChoiceText,
                !entry.interactive && styles.methodChoiceTextDisabled,
              ]}>
              {choice.label}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }

  if (entry.kind === 'flow-node') {
    const node = entry.draft
      ? entry.flow.nodes[entry.draft.currentNodeId]
      : null;
    if (!node) return null;

    const methodLabel =
      entry.draft
        ? (entry.flow.methodId as string)
        : '';

    return (
      <DiagnosisFlowCard
        node={node}
        methodLabel={methodLabel}
        disabled={!entry.interactive}
        onChoicePress={onChoicePress}
        onExplainContinue={onExplainContinue}
        onExplainDontKnow={onExplainDontKnow}
        onCheckPress={onCheckPress}
        onCheckDontKnow={onCheckDontKnow}
        onFinalConfirm={onFinalConfirm}
      />
    );
  }

  return null;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DiagnosisTheme.canvas,
  },
  header: {
    backgroundColor: BrandColors.primaryDark,
  },
  headerInner: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 4,
  },
  backBtn: {
    paddingVertical: 4,
  },
  backText: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    color: '#6BAA72',
  },
  headerTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 18,
    color: '#FFFFFF',
    lineHeight: 24,
  },
  headerSub: {
    fontFamily: FontFamilies.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
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
  methodChoices: {
    gap: 8,
    paddingLeft: 36,  // avatar 너비만큼 들여쓰기
  },
  methodChoice: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: DiagnosisTheme.choiceBorder,
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  methodChoiceDisabled: {
    opacity: 0.5,
  },
  methodChoiceText: {
    fontFamily: FontFamilies.medium,
    fontSize: 14,
    color: DiagnosisTheme.ink,
  },
  methodChoiceTextDisabled: {
    color: '#8E8A81',
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  savingText: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    color: BrandColors.primarySoft,
  },
});
```

- [ ] **Step 2: TypeScript 검증**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 3: commit**

```bash
git add features/quiz/exam/screens/exam-diagnosis-screen.tsx
git commit -m "feat(exam): 모의고사 오답 진단 화면 추가"
```

---

## Task 7: 라우트 등록

**Files:**
- Create: `app/(tabs)/quiz/exam/diagnosis.tsx`
- Modify: `app/(tabs)/quiz/exam/_layout.tsx`

- [ ] **Step 1: diagnosis 라우트 파일 생성**

`app/(tabs)/quiz/exam/diagnosis.tsx` 생성:

```tsx
import { ExamDiagnosisScreen } from '@/features/quiz/exam/screens/exam-diagnosis-screen';

export default function ExamDiagnosisRoute() {
  return <ExamDiagnosisScreen />;
}
```

- [ ] **Step 2: _layout.tsx에 diagnosis 스크린 추가**

`app/(tabs)/quiz/exam/_layout.tsx` 교체:

```tsx
import { Stack } from 'expo-router';

import { ExamSessionProvider } from '@/features/quiz/exam/exam-session';

export default function ExamLayout() {
  return (
    <ExamSessionProvider>
      <Stack>
        <Stack.Screen name="solve" options={{ headerShown: false }} />
        <Stack.Screen name="result" options={{ headerShown: false }} />
        <Stack.Screen name="diagnosis" options={{ headerShown: false }} />
      </Stack>
    </ExamSessionProvider>
  );
}
```

- [ ] **Step 3: TypeScript 검증**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 4: Metro 번들러 재시작 후 시뮬레이터 통합 테스트**

```bash
npx expo start --clear
```

테스트 시나리오:
1. 모의고사 풀기 (일부러 틀리기)
2. 결과 화면 → 다크 헤더, 오답 그리드 확인
3. "왜 틀렸지?" 타일 탭 → 진단 화면 진입 확인
4. 방법 선택 → 선생님 아바타 채팅 진행 확인
5. 최종 확인 → 결과 화면으로 복귀, 타일이 "✓ 완료"로 변경 확인
6. 앱 재시작 후 결과 화면 재진입 → 완료 타일 유지 확인

- [ ] **Step 5: 10문제 진단 화면 아바타 표시 확인**

기존 10문제 진단 플로우에서도 선생님 아바타가 표시되는지 확인:
- `DiagnosisConversationPage`에 `showAvatar={true}` 전달하는 코드를 `features/quiz/screens/diagnostic-screen.tsx` 또는 `features/quiz/components/diagnostic-screen-view.tsx`에서 찾아 추가

```bash
grep -n "DiagnosisConversationPage" features/quiz/components/diagnostic-screen-view.tsx
```

해당 컴포넌트 호출부에 `showAvatar={true}` prop 추가.

- [ ] **Step 6: commit**

```bash
git add app/(tabs)/quiz/exam/diagnosis.tsx app/(tabs)/quiz/exam/_layout.tsx
git commit -m "feat(exam): 모의고사 오답 진단 라우트 등록"
```

---

## Task 8: 최종 통합 검증 + 정리

- [ ] **Step 1: lint + typecheck**

```bash
npm run lint && npx tsc --noEmit
```

Expected: 0 errors, 0 lint warnings

- [ ] **Step 2: 완료 알림**

```bash
npm run notify:done -- "모의고사 오답 약점 분석 구현 완료 — 결과화면 그리드, 진단화면 아바타, 복습큐 등록"
```

- [ ] **Step 3: PROGRESS.md 업데이트**

`docs/PROGRESS.md`에 오늘 날짜(2026-04-11)로 이번 작업 요약 추가.

- [ ] **Step 4: Notion 업데이트**

Notion "DASIDA 개발 기록" → "모의고사 오답 약점 분석" 페이지:
- 상태 → `구현완료`
- 구현완료일 → `2026-04-11`
- Plan 필드 → `https://github.com/kiyounpark/dasida-app/blob/<커밋해시>/docs/superpowers/plans/2026-04-11-exam-weakness-diagnosis.md`

- [ ] **Step 5: git push**

```bash
git push origin main
npm run log:commit
```

---

## 자기 검토 (Self-Review)

### 스펙 커버리지

| 스펙 요구사항 | 커버 Task |
|---|---|
| 결과 화면 UI 개편 (점수+링+배지+그리드) | Task 4 |
| 오답 타일 3상태 (미분석/완료/미풀이) | Task 4 |
| "약점 분석하러 가기" 버튼 제거 | Task 4 |
| 오답 진단 채팅 플로우 재사용 | Task 5, 6 |
| 선생님 아바타 진단 채팅 적용 | Task 1 |
| 10문제 진단 채팅에도 아바타 적용 | Task 7 Step 5 |
| finalWeaknessId 추출 → recordAttempt | Task 5 |
| 복습 큐 등록 (기존 ReviewTask 인프라) | Task 5 (recordAttempt가 처리) |
| 진행 상태 로컬 저장 (중단 후 재개) | Task 2, 3 |
| useFocusEffect로 진행 상태 갱신 | Task 3 |

### 미결 사항 (스펙의 "미결 사항" 그대로 반영)

- **문제 이미지 표시**: `imageKey`로 Firebase Storage 이미지 표시는 이번 플랜 범위 밖. 현재는 문제 번호+단원명만 표시.
- **미풀이 분석**: 현재 설계대로 탭 불가 처리.
- **Topic 표시**: `ExamResultSummary.perProblem`에 topic이 없어 타일에 번호만 표시. 추후 `getExamProblems()`에서 조회 가능하나 성능을 고려해 현재는 생략.

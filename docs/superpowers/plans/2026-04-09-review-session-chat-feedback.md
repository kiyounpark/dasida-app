# Review Session AI 피드백 채팅 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 복습 세션에서 AI 피드백이 1회성 응답에서 멀티턴 채팅으로 전환되어, 학생이 모호한 답변을 했을 때 AI와 계속 대화하며 이해를 심화할 수 있게 한다.

**Architecture:** `aiFeedback: string | null` 단일 상태를 `chatMessages: ChatEntry[]` 배열로 교체하고, `stepPhase`를 `'input' | 'feedback'`에서 `'input' | 'chat'`으로 변경한다. Firebase 함수는 기존 `selectedChoiceText`/`userText` 단일 페이로드 대신 `messages` 배열을 받아 OpenAI chat completions API에 그대로 전달한다. 클라이언트는 매 전송 시 전체 대화 이력을 포함해 보낸다.

**Tech Stack:** Expo/React Native, TypeScript, Firebase Cloud Functions v2, OpenAI chat completions API (`gpt-4.1`)

---

## 파일 구조

| 파일 | 변경 종류 | 담당 |
|---|---|---|
| `functions/src/openai-client.ts` | Modify | `requestReviewFeedbackFromOpenAI` 시그니처 변경 |
| `functions/src/review-feedback.ts` | Modify | 요청 스키마, 핸들러 로직, 시스템 프롬프트 |
| `features/quiz/review-feedback.ts` | Modify | 클라이언트 타입/함수 |
| `features/quiz/hooks/use-review-session-screen.ts` | Modify | 상태/핸들러 |
| `features/quiz/components/review-session-screen-view.tsx` | Modify | chat phase UI |
| `e2e/review-session.spec.ts` | Modify | 테스트 3·4 업데이트 |

---

### Task 1: Firebase 함수 — messages 배열로 전환

**Files:**
- Modify: `functions/src/openai-client.ts:203-232`
- Modify: `functions/src/review-feedback.ts`

- [ ] **Step 1: `openai-client.ts` — `requestReviewFeedbackFromOpenAI` 시그니처를 messages 배열로 변경**

`functions/src/openai-client.ts`의 `requestReviewFeedbackFromOpenAI` 함수(203번 줄부터)를 아래로 교체한다:

```ts
export async function requestReviewFeedbackFromOpenAI({
  apiKey,
  model,
  systemPrompt,
  messages,
}: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<{ replyText: string }> {
  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    max_tokens: 200,
  });

  const replyText = completion.choices[0]?.message?.content?.trim() ?? '';
  if (!replyText) {
    throw new Error('OpenAI response did not include content');
  }

  return { replyText };
}
```

- [ ] **Step 2: `review-feedback.ts` — 스키마, 핸들러, 시스템 프롬프트 전체 교체**

`functions/src/review-feedback.ts` 전체를 아래로 교체한다:

```ts
// functions/src/review-feedback.ts
import * as logger from 'firebase-functions/logger';
import { defineSecret, defineString } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { requestReviewFeedbackFromOpenAI } from './openai-client';

const openAiApiKey = defineSecret('OPENAI_API_KEY');
const openAiModel = defineString('OPENAI_MODEL', { default: 'gpt-4.1' });

const ReviewFeedbackRequestSchema = z.object({
  weaknessId: z.string().min(1).max(60),
  stepTitle: z.string().min(1).max(100),
  stepBody: z.string().min(1).max(400),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(500),
      }),
    )
    .min(1)
    .max(10),
});

const SYSTEM_PROMPT = `당신은 한국 수학 학습을 돕는 AI 코치입니다.
학생이 수학 개념 복습 단계에서 자신의 이해를 표현했습니다.

학생의 답변을 다음 기준으로 판단하세요:

1. 수학 개념과 관련된 실질적인 내용이 있는 경우:
   "좋은 방향이에요! [핵심 포인트]도 더하면 완벽해요" 형식으로 1-2문장 피드백을 주세요.

2. "그러게요", "네", "맞아요", "모르겠어요" 처럼 수학 내용이 없는 짧은 표현인 경우:
   칭찬하지 말고, 개념을 자신의 말로 설명해보도록 구체적으로 유도해 주세요.
   예시: "이 개념을 자신의 말로 한 번 설명해볼 수 있을까요? 예를 들어, [단계 핵심어]가 왜 중요한지 써보면 좋아요."

모호한 답변에 "좋은 방향이에요!"라고 칭찬하지 마세요.
오직 현재 단계의 개념만 다루세요. 다른 단계 내용이나 다음 단계 개념을 먼저 언급하지 마세요.
2-3문장 이내로 짧게 답하세요.
한국어로 답하세요.`;

export const reviewFeedback = onRequest(
  {
    region: 'asia-northeast3',
    timeoutSeconds: 20,
    cors: true,
    invoker: 'public',
    secrets: [openAiApiKey],
  },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const parsed = ReviewFeedbackRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
      return;
    }

    const { stepTitle, stepBody, messages } = parsed.data;

    // 첫 번째 user 메시지에 단계 컨텍스트를 prepend
    const stepContext = `단계: ${stepTitle}\n설명: ${stepBody}\n\n`;
    const enrichedMessages = messages.map((m, i) =>
      i === 0 && m.role === 'user' ? { ...m, content: `${stepContext}${m.content}` } : m,
    );

    try {
      const { replyText } = await requestReviewFeedbackFromOpenAI({
        apiKey: openAiApiKey.value(),
        model: openAiModel.value(),
        systemPrompt: SYSTEM_PROMPT,
        messages: enrichedMessages,
      });

      response.status(200).json({ replyText });
    } catch (error) {
      logger.error('reviewFeedback failed', error);
      response.status(500).json({ error: 'Failed to generate feedback' });
    }
  },
);
```

- [ ] **Step 3: TypeScript 빌드 확인**

```bash
cd functions && npm run build 2>&1
```

Expected: 에러 없이 빌드 성공

- [ ] **Step 4: curl로 동작 확인**

```bash
cd functions && npx ts-node -e "
const { requestReviewFeedbackFromOpenAI } = require('./src/openai-client');
console.log('signature ok');
"
```

Expected: `signature ok` 출력

- [ ] **Step 5: Commit**

```bash
git add functions/src/openai-client.ts functions/src/review-feedback.ts
git commit -m "feat(functions): reviewFeedback messages 배열 기반 멀티턴으로 전환"
```

---

### Task 2: 클라이언트 API 타입/함수 변경

**Files:**
- Modify: `features/quiz/review-feedback.ts`

- [ ] **Step 1: `features/quiz/review-feedback.ts` 전체 교체**

```ts
// features/quiz/review-feedback.ts
import { reviewFeedbackUrl, reviewFeedbackTimeoutMs } from '@/constants/env';

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type ReviewFeedbackInput = {
  weaknessId: string;
  stepTitle: string;
  stepBody: string;
  messages: ChatMessage[];
};

export type ReviewFeedbackResult = {
  replyText: string;
};

export async function requestReviewFeedback(
  input: ReviewFeedbackInput,
): Promise<ReviewFeedbackResult> {
  if (!reviewFeedbackUrl) {
    throw new Error('Review feedback endpoint is not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), reviewFeedbackTimeoutMs);

  try {
    const response = await fetch(reviewFeedbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg =
        (payload && typeof payload.error === 'string' && payload.error) ||
        `Review feedback request failed (HTTP ${response.status})`;
      throw new Error(errorMsg);
    }

    if (!payload || typeof payload.replyText !== 'string' || !payload.replyText.trim()) {
      throw new Error('Review feedback returned empty or invalid response');
    }

    return { replyText: payload.replyText.trim() };
  } finally {
    clearTimeout(timeoutId);
  }
}
```

- [ ] **Step 2: TypeScript 타입 확인**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: `features/quiz/review-feedback.ts` 관련 에러가 없어야 함 (hook에서 아직 이전 타입을 쓰므로 hook 관련 에러는 정상)

- [ ] **Step 3: Commit**

```bash
git add features/quiz/review-feedback.ts
git commit -m "feat(client): reviewFeedback 요청 타입을 messages 배열로 변경"
```

---

### Task 3: Hook — chatMessages + onSendChatMessage

**Files:**
- Modify: `features/quiz/hooks/use-review-session-screen.ts`

- [ ] **Step 1: `use-review-session-screen.ts` 전체 교체**

```ts
// features/quiz/hooks/use-review-session-screen.ts
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { getReviewThinkingSteps, type ThinkingStep } from '@/data/review-content-map';
import { completeReviewTask, rescheduleReviewTask } from '@/features/learning/review-scheduler';
import { LocalReviewTaskStore } from '@/features/learning/review-task-store';
import type { ReviewTask } from '@/features/learning/types';
import { useCurrentLearner } from '@/features/learner/provider';
import { getSingleParam } from '@/utils/get-single-param';
import { requestReviewFeedback, type ChatMessage } from '@/features/quiz/review-feedback';

type StepPhase = 'input' | 'chat';

type ChatEntry = {
  role: 'user' | 'ai';
  text: string;
};

export type UseReviewSessionScreenResult = {
  task: ReviewTask | null;
  steps: ThinkingStep[];
  currentStepIndex: number;
  stepPhase: StepPhase;
  selectedChoiceIndex: number | null;
  userText: string;
  chatMessages: ChatEntry[];
  chatText: string;
  isLoadingFeedback: boolean;
  sessionComplete: boolean;
  hasInput: boolean;
  onBack: () => void;
  onSelectChoice: (index: number) => void;
  onChangeText: (text: string) => void;
  onPressNext: () => void;
  onChangeChatText: (text: string) => void;
  onSendChatMessage: () => void;
  onPressContinue: () => void;
  onPressRemember: () => void;
  onPressRetry: () => void;
};

const store = new LocalReviewTaskStore();

export function useReviewSessionScreen(): UseReviewSessionScreenResult {
  const params = useLocalSearchParams();
  const taskId = getSingleParam(params.taskId) ?? '';
  const { session, refresh, profile, recordAttempt } = useCurrentLearner();
  const accountKey = session?.accountKey ?? '';

  const [task, setTask] = useState<ReviewTask | null>(null);
  const [steps, setSteps] = useState<ThinkingStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepPhase, setStepPhase] = useState<StepPhase>('input');
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState<number | null>(null);
  const [userText, setUserText] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatEntry[]>([]);
  const [chatText, setChatText] = useState('');
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);

  const isFetchingRef = useRef(false);
  const sessionStartedAtRef = useRef(new Date().toISOString());
  const firstAttemptCorrectRef = useRef<Array<boolean | null>>([]);

  // task 로드
  useEffect(() => {
    if (!accountKey || !taskId) {
      return;
    }
    let cancelled = false;
    store.load(accountKey).then((tasks) => {
      if (cancelled) return;
      const found = tasks.find((t) => t.id === taskId) ?? null;
      setTask(found);
      if (found) {
        setSteps(getReviewThinkingSteps(found.weaknessId));
        firstAttemptCorrectRef.current = new Array(
          getReviewThinkingSteps(found.weaknessId).length,
        ).fill(null);
        sessionStartedAtRef.current = new Date().toISOString();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [accountKey, taskId]);

  const resetStepState = () => {
    setSelectedChoiceIndex(null);
    setUserText('');
    setChatMessages([]);
    setChatText('');
    setStepPhase('input');
  };

  const onSelectChoice = (index: number) => {
    setSelectedChoiceIndex(index);
    if (stepPhase === 'input' && firstAttemptCorrectRef.current[currentStepIndex] === null) {
      const isCorrect = steps[currentStepIndex]?.choices[index]?.correct ?? false;
      firstAttemptCorrectRef.current[currentStepIndex] = isCorrect;
    }
  };

  const onChangeText = (text: string) => {
    setUserText(text);
  };

  const onChangeChatText = (text: string) => {
    setChatText(text);
  };

  const onPressNext = async () => {
    if (isFetchingRef.current) return;
    const step = steps[currentStepIndex];
    if (!step || !task) return;

    const hasChoice = selectedChoiceIndex !== null;
    const hasText = userText.trim().length > 0;
    if (!hasChoice && !hasText) return;

    // 첫 번째 user 메시지 조합
    const parts: string[] = [];
    if (hasChoice) parts.push(`선택: ${step.choices[selectedChoiceIndex!]?.text ?? ''}`);
    if (hasText) parts.push(hasChoice ? `직접 쓴 내용: ${userText.trim()}` : userText.trim());
    const firstUserContent = parts.join('\n');

    const firstUserEntry: ChatEntry = { role: 'user', text: firstUserContent };

    isFetchingRef.current = true;
    setIsLoadingFeedback(true);
    setChatMessages([firstUserEntry]);
    setStepPhase('chat');

    try {
      const apiMessages: ChatMessage[] = [{ role: 'user', content: firstUserContent }];
      const result = await requestReviewFeedback({
        weaknessId: task.weaknessId,
        stepTitle: step.title,
        stepBody: step.body,
        messages: apiMessages,
      });
      setChatMessages([firstUserEntry, { role: 'ai', text: result.replyText }]);
    } catch {
      // 에러 시 AI 응답 없이 계속 진행 가능
    } finally {
      isFetchingRef.current = false;
      setIsLoadingFeedback(false);
    }
  };

  const onSendChatMessage = async () => {
    if (isFetchingRef.current || !chatText.trim() || !task) return;
    const step = steps[currentStepIndex];
    if (!step) return;

    const userInput = chatText.trim();
    const newUserEntry: ChatEntry = { role: 'user', text: userInput };
    const allMessages = [...chatMessages, newUserEntry];

    setChatMessages(allMessages);
    setChatText('');
    isFetchingRef.current = true;
    setIsLoadingFeedback(true);

    try {
      const apiMessages: ChatMessage[] = allMessages.map((m) => ({
        role: m.role === 'ai' ? ('assistant' as const) : ('user' as const),
        content: m.text,
      }));
      const result = await requestReviewFeedback({
        weaknessId: task.weaknessId,
        stepTitle: step.title,
        stepBody: step.body,
        messages: apiMessages,
      });
      setChatMessages([...allMessages, { role: 'ai', text: result.replyText }]);
    } catch {
      // 에러 시 사용자 메시지만 보임, 계속 진행 가능
    } finally {
      isFetchingRef.current = false;
      setIsLoadingFeedback(false);
    }
  };

  const onPressContinue = () => {
    if (!task || steps.length === 0) {
      return;
    }
    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= steps.length) {
      setSessionComplete(true);
    } else {
      setCurrentStepIndex(nextIndex);
      resetStepState();
    }
  };

  const onPressRemember = async () => {
    if (!task || !profile) {
      return;
    }

    const completedAt = new Date().toISOString();
    const results = firstAttemptCorrectRef.current;
    const questionCount = steps.length;
    const correctCount = results.filter((r) => r === true).length;
    const accuracy =
      questionCount > 0 ? Math.round((correctCount / questionCount) * 100) : 100;

    try {
      await recordAttempt({
        attemptId: `review-${task.id}-${Date.now().toString(36)}`,
        accountKey,
        learnerId: profile.learnerId,
        source: 'weakness-practice',
        sourceEntityId: task.sourceId,
        gradeSnapshot: profile.grade,
        startedAt: sessionStartedAtRef.current,
        completedAt,
        questionCount,
        correctCount,
        wrongCount: results.filter((r) => r === false).length,
        accuracy,
        primaryWeaknessId: task.weaknessId,
        topWeaknesses: [task.weaknessId],
        reviewContext: {
          reviewTaskId: task.id,
          reviewStage: task.stage,
        },
        questions: steps.map((step, i) => ({
          questionId: `${task.id}-step-${i}`,
          questionNumber: i + 1,
          topic: step.title,
          selectedIndex: null,
          isCorrect: results[i] ?? false,
          finalWeaknessId: task.weaknessId,
          methodId: null,
          diagnosisSource: null,
          finalMethodSource: null,
          diagnosisCompleted: true,
          usedDontKnow: false,
          usedAiHelp: false,
        })),
      });
    } catch (error) {
      console.warn('Failed to record review attempt', error);
    }

    try {
      await completeReviewTask(accountKey, task.id, store);
      await refresh();
    } catch (error) {
      console.warn('Failed to complete review task', error);
    }
    router.back();
  };

  const onPressRetry = async () => {
    if (!task) {
      return;
    }
    try {
      await rescheduleReviewTask(accountKey, task.id, store);
      await refresh();
    } catch (error) {
      console.warn('Failed to reschedule review task', error);
    }
    router.back();
  };

  const hasInput = selectedChoiceIndex !== null || userText.trim().length > 0;

  return {
    task,
    steps,
    currentStepIndex,
    stepPhase,
    selectedChoiceIndex,
    userText,
    chatMessages,
    chatText,
    isLoadingFeedback,
    sessionComplete,
    hasInput,
    onBack: router.back,
    onSelectChoice,
    onChangeText,
    onPressNext,
    onChangeChatText,
    onSendChatMessage,
    onPressContinue,
    onPressRemember,
    onPressRetry,
  };
}
```

- [ ] **Step 2: TypeScript 타입 확인**

```bash
npx tsc --noEmit 2>&1 | grep "use-review-session-screen" | head -20
```

Expected: 에러 없음 (view에서 아직 이전 props를 쓰므로 view 관련 에러는 정상)

- [ ] **Step 3: Commit**

```bash
git add features/quiz/hooks/use-review-session-screen.ts
git commit -m "feat(hook): chatMessages + onSendChatMessage 멀티턴 대화 상태 추가"
```

---

### Task 4: View — chat phase UI

**Files:**
- Modify: `features/quiz/components/review-session-screen-view.tsx`

이 Task는 view 파일 전체를 교체한다. 핵심 변화:
- props에서 `aiFeedback` 제거, `chatMessages`, `chatText`, `onChangeChatText`, `onSendChatMessage` 추가
- `stepPhase === 'feedback'` → `stepPhase === 'chat'`
- input 카드 내부: `stepPhase === 'input'`이면 기존 UI, `stepPhase === 'chat'`이면 채팅 UI
- `continueLabel`을 "이해했어요" 접두사로 변경
- 채팅 버블, 채팅 입력창 스타일 추가

- [ ] **Step 1: `review-session-screen-view.tsx` 전체 교체**

```tsx
// features/quiz/components/review-session-screen-view.tsx
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { diagnosisMap } from '@/data/diagnosisMap';
import type { UseReviewSessionScreenResult } from '@/features/quiz/hooks/use-review-session-screen';
import { useIsTablet } from '@/hooks/use-is-tablet';
import { IconSymbol } from '@/components/ui/icon-symbol';

export function ReviewSessionScreenView({
  task,
  steps,
  currentStepIndex,
  stepPhase,
  selectedChoiceIndex,
  userText,
  chatMessages,
  chatText,
  isLoadingFeedback,
  sessionComplete,
  hasInput,
  onBack,
  onSelectChoice,
  onChangeText,
  onPressNext,
  onChangeChatText,
  onSendChatMessage,
  onPressContinue,
  onPressRemember,
  onPressRetry,
}: UseReviewSessionScreenResult) {
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();

  const appBar = (
    <SafeAreaView edges={['top']} style={styles.appBar}>
      <View style={styles.appBarInner}>
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          accessibilityLabel="뒤로가기"
          accessibilityRole="button">
          <IconSymbol name="chevron.left" size={24} color={BrandColors.primary} />
        </Pressable>
        <Text style={styles.appBarTitle}>오늘의 복습</Text>
        <View style={styles.appBarSpacer} />
      </View>
    </SafeAreaView>
  );

  if (!task) {
    return (
      <View style={styles.screen}>
        {appBar}
        <View style={styles.loadingContent}>
          <Text style={styles.loadingText}>복습 데이터를 불러오는 중...</Text>
        </View>
      </View>
    );
  }

  const weaknessLabel = diagnosisMap[task.weaknessId]?.labelKo ?? task.weaknessId;
  const step = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  if (sessionComplete || !step) {
    return (
      <View style={styles.screen}>
        {appBar}
        <View style={[styles.doneScreen, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.doneEmoji}>🌿</Text>
          <Text style={styles.doneTitle}>모든 단계 완료!</Text>
          <Text style={styles.doneSub}>{weaknessLabel} 흐름을{'\n'}다시 확인했어요.</Text>

          <View style={styles.scheduleBox}>
            <Text style={styles.scheduleLabel}>다음 복습 일정</Text>
            <Text style={styles.scheduleVal}>
              {task.stage === 'day1' ? '3일 후' :
               task.stage === 'day3' ? '7일 후' :
               task.stage === 'day7' ? '30일 후' : '졸업 🎓'}
            </Text>
          </View>

          <View style={styles.doneButtons}>
            <Pressable style={styles.retryBtn} onPress={onPressRetry}>
              <Text style={styles.retryBtnText}>🤔 다시 볼게요</Text>
            </Pressable>
            <Pressable style={styles.rememberBtn} onPress={onPressRemember}>
              <Text style={styles.rememberBtnText}>✓ 기억났어요!</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  const continueLabel = isLastStep ? '이해했어요, 완료 →' : '이해했어요, 다음 단계 →';

  // ── 입력 카드 공통 내부 (mobile + tablet 공유) ──────────────────────────────
  const inputCardContent =
    stepPhase === 'input' ? (
      <>
        <Text style={styles.inputLabel}>💭 이 단계, 어떻게 이해했나요?</Text>
        <View style={styles.choices}>
          {step.choices.map((choice, i) => (
            <Pressable
              key={i}
              style={[styles.choiceBtn, selectedChoiceIndex === i && styles.choiceBtnSelected]}
              onPress={() => onSelectChoice(i)}>
              <Text
                style={[
                  styles.choiceBtnText,
                  selectedChoiceIndex === i && styles.choiceBtnTextSelected,
                ]}>
                {choice.text}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>또는 직접 써도 돼요</Text>
          <View style={styles.dividerLine} />
        </View>
        <TextInput
          style={styles.textInput}
          value={userText}
          onChangeText={onChangeText}
          placeholder="자유롭게 써보세요..."
          placeholderTextColor={BrandColors.disabled}
          multiline
        />
        <Pressable
          style={[styles.primaryBtn, (!hasInput || isLoadingFeedback) && styles.primaryBtnDisabled]}
          onPress={onPressNext}
          disabled={!hasInput || isLoadingFeedback}>
          {isLoadingFeedback ? (
            <ActivityIndicator color="#F6F2EA" size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>다음으로</Text>
          )}
        </Pressable>
      </>
    ) : (
      <>
        <View style={styles.chatMessages}>
          {chatMessages.map((msg, i) => (
            <View
              key={i}
              style={[
                styles.bubbleRow,
                msg.role === 'user' ? styles.bubbleRowUser : styles.bubbleRowAi,
              ]}>
              {msg.role === 'ai' && <Text style={styles.aiBadgeIcon}>✨</Text>}
              <View style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleAi]}>
                {msg.text ? (
                  <Text style={[styles.bubbleText, msg.role === 'user' && styles.bubbleTextUser]}>
                    {msg.text}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
          {isLoadingFeedback && (
            <View style={[styles.bubbleRow, styles.bubbleRowAi]}>
              <Text style={styles.aiBadgeIcon}>✨</Text>
              <View style={[styles.bubble, styles.bubbleAi]}>
                <ActivityIndicator size="small" color={BrandColors.primary} />
              </View>
            </View>
          )}
        </View>
        <View style={styles.chatInputRow}>
          <TextInput
            style={styles.chatInput}
            value={chatText}
            onChangeText={onChangeChatText}
            placeholder="계속 써보세요..."
            placeholderTextColor={BrandColors.disabled}
            editable={!isLoadingFeedback}
            returnKeyType="send"
            onSubmitEditing={onSendChatMessage}
          />
          <Pressable
            style={[
              styles.sendBtn,
              (!chatText.trim() || isLoadingFeedback) && styles.sendBtnDisabled,
            ]}
            onPress={onSendChatMessage}
            disabled={!chatText.trim() || isLoadingFeedback}>
            <Text style={styles.sendBtnText}>↑</Text>
          </Pressable>
        </View>
        <Pressable
          style={[styles.primaryBtn, isLoadingFeedback && styles.primaryBtnDisabled]}
          onPress={onPressContinue}
          disabled={isLoadingFeedback}>
          <Text style={styles.primaryBtnText}>{continueLabel}</Text>
        </Pressable>
      </>
    );

  if (isTablet) {
    return (
      <View style={styles.screen}>
        {appBar}
        <View style={[styles.progressBar, styles.tabletProgressBar]}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={[styles.progressSeg, i <= currentStepIndex && styles.progressSegDone]}
            />
          ))}
        </View>
        <View style={styles.tabletRow}>
          <ScrollView
            style={styles.tabletLeft}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.stepCard}>
              <View style={styles.stepNumRow}>
                <View style={styles.stepNumBadge}>
                  <Text style={styles.stepNumText}>{currentStepIndex + 1}</Text>
                </View>
                <Text style={styles.stepNumLabel}>{`${currentStepIndex + 1} / ${steps.length} 단계`}</Text>
              </View>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepBody}>{step.body}</Text>
              {step.example ? (
                <View style={styles.stepExampleBox}>
                  <Text style={styles.stepExampleText}>{step.example}</Text>
                </View>
              ) : null}
            </View>
          </ScrollView>
          <ScrollView
            style={[styles.tabletRight, { backgroundColor: '#FFFFFF' }]}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled">
            <View style={styles.inputCard}>{inputCardContent}</View>
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {appBar}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.progressBar}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={[styles.progressSeg, i <= currentStepIndex && styles.progressSegDone]}
            />
          ))}
        </View>
        <View style={styles.stepCard}>
          <View style={styles.stepNumRow}>
            <View style={styles.stepNumBadge}>
              <Text style={styles.stepNumText}>{currentStepIndex + 1}</Text>
            </View>
            <Text style={styles.stepNumLabel}>{`${currentStepIndex + 1} / ${steps.length} 단계`}</Text>
          </View>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={styles.stepBody}>{step.body}</Text>
          {step.example ? (
            <View style={styles.stepExampleBox}>
              <Text style={styles.stepExampleText}>{step.example}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.inputCard}>{inputCardContent}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F2EA',
  },
  appBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.border,
  },
  appBarInner: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarTitle: {
    flex: 1,
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    color: BrandColors.primary,
    textAlign: 'center',
  },
  appBarSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: BrandSpacing.md,
    gap: BrandSpacing.sm,
  },
  loadingText: {
    fontFamily: FontFamilies.regular,
    fontSize: 15,
    color: BrandColors.mutedText,
    textAlign: 'center',
    marginTop: 40,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: BrandSpacing.sm,
  },
  progressSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D6E2D4',
  },
  progressSegDone: {
    backgroundColor: BrandColors.primary,
  },
  stepCard: {
    backgroundColor: '#fff',
    borderRadius: BrandRadius.lg,
    padding: BrandSpacing.lg,
    gap: BrandSpacing.xs,
    borderWidth: 1.5,
    borderColor: '#D6E2D4',
  },
  stepNumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  stepNumBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    color: '#F6F2EA',
  },
  stepNumLabel: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    color: BrandColors.mutedText,
  },
  stepTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 17,
    color: BrandColors.primary,
  },
  stepBody: {
    fontFamily: FontFamilies.regular,
    fontSize: 14,
    color: BrandColors.text,
    lineHeight: 22,
  },
  stepExampleBox: {
    backgroundColor: '#F6F2EA',
    borderRadius: BrandRadius.sm,
    padding: 10,
    marginTop: 4,
  },
  stepExampleText: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    color: BrandColors.primarySoft,
  },
  inputCard: {
    backgroundColor: '#fff',
    borderRadius: BrandRadius.lg,
    padding: BrandSpacing.md,
    gap: BrandSpacing.sm,
    borderWidth: 1.5,
    borderColor: '#D6E2D4',
  },
  inputLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    color: BrandColors.primary,
  },
  choices: {
    gap: 6,
  },
  choiceBtn: {
    backgroundColor: '#F6F2EA',
    borderWidth: 1.5,
    borderColor: '#D6E2D4',
    borderRadius: BrandRadius.sm,
    padding: 12,
  },
  choiceBtnSelected: {
    backgroundColor: '#eef3ec',
    borderColor: BrandColors.primary,
  },
  choiceBtnText: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    color: BrandColors.text,
  },
  choiceBtnTextSelected: {
    fontFamily: FontFamilies.bold,
    color: BrandColors.primary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D6E2D4',
  },
  dividerText: {
    fontFamily: FontFamilies.regular,
    fontSize: 11,
    color: BrandColors.disabled,
  },
  textInput: {
    backgroundColor: '#F6F2EA',
    borderWidth: 1,
    borderColor: '#D6E2D4',
    borderRadius: BrandRadius.sm,
    padding: 11,
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    color: BrandColors.text,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  // 채팅 UI
  chatMessages: {
    gap: 10,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowAi: {
    justifyContent: 'flex-start',
  },
  bubble: {
    borderRadius: 12,
    padding: 10,
    maxWidth: '82%',
  },
  bubbleUser: {
    backgroundColor: BrandColors.primary,
    borderBottomRightRadius: 2,
  },
  bubbleAi: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#D6E2D4',
    borderTopLeftRadius: 2,
  },
  bubbleText: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    color: BrandColors.text,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: '#fff',
  },
  aiBadgeIcon: {
    fontSize: 14,
    marginBottom: 2,
  },
  chatInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#F6F2EA',
    borderWidth: 1,
    borderColor: '#D6E2D4',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    color: BrandColors.text,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: BrandColors.disabled,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FontFamilies.bold,
  },
  primaryBtn: {
    backgroundColor: BrandColors.primary,
    borderRadius: BrandRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    backgroundColor: BrandColors.disabled,
  },
  primaryBtnText: {
    fontFamily: FontFamilies.bold,
    fontSize: 15,
    color: '#F6F2EA',
  },
  // 완료 화면
  doneScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: BrandSpacing.xl,
    gap: BrandSpacing.sm,
  },
  doneEmoji: {
    fontSize: 52,
    marginBottom: 4,
  },
  doneTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 20,
    color: BrandColors.primary,
    textAlign: 'center',
  },
  doneSub: {
    fontFamily: FontFamilies.regular,
    fontSize: 14,
    color: BrandColors.mutedText,
    textAlign: 'center',
    lineHeight: 22,
  },
  scheduleBox: {
    backgroundColor: '#fff',
    borderRadius: BrandRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D6E2D4',
    alignItems: 'center',
    width: '100%',
    marginVertical: 4,
  },
  scheduleLabel: {
    fontFamily: FontFamilies.regular,
    fontSize: 11,
    color: BrandColors.mutedText,
    marginBottom: 4,
  },
  scheduleVal: {
    fontFamily: FontFamilies.bold,
    fontSize: 15,
    color: BrandColors.success,
  },
  doneButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  retryBtn: {
    flex: 1,
    backgroundColor: '#F6F2EA',
    borderRadius: BrandRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D6E2D4',
  },
  retryBtnText: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: BrandColors.mutedText,
  },
  rememberBtn: {
    flex: 2,
    backgroundColor: BrandColors.primary,
    borderRadius: BrandRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  rememberBtnText: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: '#F6F2EA',
  },
  // 태블릿 레이아웃
  tabletProgressBar: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  tabletRow: {
    flex: 1,
    flexDirection: 'row',
  },
  tabletLeft: {
    flex: 55,
    borderRightWidth: 1,
    borderRightColor: '#D6E2D4',
  },
  tabletRight: {
    flex: 45,
  },
});
```

- [ ] **Step 2: TypeScript 전체 타입 확인**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add features/quiz/components/review-session-screen-view.tsx
git commit -m "feat(view): chat phase UI — 채팅 버블, 입력창, 이해했어요 버튼"
```

---

### Task 5: e2e 테스트 업데이트

**Files:**
- Modify: `e2e/review-session.spec.ts`

테스트 3과 4는 "다음 단계 →" / "완료 →" 텍스트를 찾는데, 이제 그 텍스트는 없어지고 "이해했어요" 버튼이 생긴다.

- [ ] **Step 1: `e2e/review-session.spec.ts` 테스트 3·4 업데이트**

```ts
import { test, expect } from '@playwright/test';

// ── 헬퍼 ───────────────────────────────────────────────────────────────────

async function loginAsDevGuest(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByText('개발용 익명으로 계속').click();
  await page.waitForURL(/quiz/);
}

async function seedAndGoToQuiz(
  page: import('@playwright/test').Page,
  seedLabel: string,
) {
  await page.goto('/profile');
  await page.getByText(seedLabel).click();
  await page.waitForTimeout(800);
  await page.goto('/quiz');
}

// ── 테스트 ─────────────────────────────────────────────────────────────────

test.describe('복습 세션 흐름', () => {
  test('1. review-available 시드 → ReviewHomeCard 표시', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, '오늘 복습 있음');

    await expect(page.getByText('오늘 안 하면 리셋')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('사고 흐름 확인하기')).toBeVisible();
  });

  test('2. 카운트다운 완료 후 CTA 활성화 → 복습 세션 진입', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, '오늘 복습 있음');

    await expect(page.getByText('사고 흐름 확인하기')).toBeVisible({ timeout: 8000 });

    // __DEV__ ? 1 : 10 — 개발 환경에서 1초 카운트다운
    await page.waitForTimeout(1500);

    await page.getByText('사고 흐름 확인하기').click();
    await expect(page).toHaveURL(/review-session/, { timeout: 5000 });
    await expect(page.getByText('오늘의 복습')).toBeVisible({ timeout: 3000 });
  });

  test('3. 입력 없이 다음으로 버튼은 비활성 — 선택 후 활성화 → 채팅 전환', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, '오늘 복습 있음');

    await expect(page.getByText('사고 흐름 확인하기')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1500);
    await page.getByText('사고 흐름 확인하기').click();
    await expect(page).toHaveURL(/review-session/, { timeout: 5000 });

    await expect(page.getByText('오늘의 복습')).toBeVisible({ timeout: 5000 });

    // 선택 없으면 비활성
    const nextBtn = page.getByRole('button', { name: '다음으로' });
    await expect(nextBtn).toBeVisible({ timeout: 5000 });
    await expect(nextBtn).toBeDisabled();

    // 첫 번째 선택지 클릭 → 활성화
    const firstChoice = page.getByRole('button').filter({ hasNotText: /다음으로|뒤로가기/ }).first();
    await firstChoice.click();
    await expect(nextBtn).toBeEnabled();

    // 다음으로 클릭 → chat phase 전환 → "이해했어요" 버튼 표시
    await nextBtn.click();
    await expect(page.getByText(/이해했어요/)).toBeVisible({ timeout: 15000 });
  });

  test('4. 모든 단계 완료 → 완료 화면 표시', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, '오늘 복습 있음');

    await expect(page.getByText('사고 흐름 확인하기')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1500);
    await page.getByText('사고 흐름 확인하기').click();
    await expect(page).toHaveURL(/review-session/, { timeout: 5000 });

    // 최대 10단계 반복 (실제는 약점에 따라 3단계 전후)
    for (let i = 0; i < 10; i++) {
      const isDone = await page.getByText('모든 단계 완료!').isVisible();
      if (isDone) break;

      const hasNext = await page.getByText('다음으로').isVisible();
      if (hasNext) {
        const firstChoice = page.getByRole('button').filter({ hasNotText: /다음으로|뒤로가기/ }).first();
        await expect(firstChoice).toBeVisible({ timeout: 5000 });
        await firstChoice.click();
        await page.getByText('다음으로').click();
        // AI 호출 포함 최대 15초 대기 → chat phase의 이해했어요 버튼
        await expect(page.getByText(/이해했어요/)).toBeVisible({ timeout: 15000 });
      }

      const hasContinue = await page.getByText(/이해했어요/).isVisible();
      if (hasContinue) {
        await page.getByText(/이해했어요/).click();
        await page.waitForTimeout(200);
      }
    }

    await expect(page.getByText('모든 단계 완료!')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('✓ 기억났어요!')).toBeVisible();
    await expect(page.getByText('🤔 다시 볼게요')).toBeVisible();
  });

  test('5. day3 시드 → ReviewHomeCard에 DAY 3 표시', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, 'DAY 3 복습 있음');

    await expect(page.getByText('DAY 3')).toBeVisible({ timeout: 8000 });
  });

  test('6. day7 시드 → ReviewHomeCard에 DAY 7 표시', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, 'DAY 7 복습 있음');

    await expect(page.getByText('DAY 7')).toBeVisible({ timeout: 8000 });
  });

  test('7. day30 시드 → ReviewHomeCard에 DAY 30 표시', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, 'DAY 30 복습 있음');

    await expect(page.getByText('DAY 30')).toBeVisible({ timeout: 8000 });
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/review-session.spec.ts
git commit -m "test(e2e): 복습 세션 테스트 3·4를 chat phase 흐름으로 업데이트"
```

---

### Task 6: Firebase 재배포

**Files:** 없음 (배포만)

- [ ] **Step 1: Firebase 함수 재배포**

```bash
npx firebase deploy --only functions:reviewFeedback --project dasida-app 2>&1
```

Expected:
```
✔  functions[reviewFeedback(asia-northeast3)] Successful update operation.
✔  Deploy complete!
```

- [ ] **Step 2: curl로 멀티턴 동작 확인**

```bash
curl -s -X POST https://asia-northeast3-dasida-app.cloudfunctions.net/reviewFeedback \
  -H "Content-Type: application/json" \
  -d '{
    "weaknessId": "test",
    "stepTitle": "판별식 읽기",
    "stepBody": "ax²+bx+c에서 각 계수를 부호 포함해서 먼저 읽는다.",
    "messages": [
      {"role": "user", "content": "그러게요"},
      {"role": "assistant", "content": "이 개념을 자신의 말로 설명해볼 수 있을까요?"},
      {"role": "user", "content": "a는 x² 앞 계수인데 부호도 포함이라는 거죠?"}
    ]
  }'
```

Expected: `{"replyText": "좋은 방향이에요!..."}` — 이전 대화 맥락을 반영한 응답

- [ ] **Step 3: git push**

```bash
git push origin main 2>&1
```

---

## Self-Review

**1. Spec coverage 확인:**
- ✅ "다음으로" 누른 후 채팅 UI 전환 → Task 3(hook), Task 4(view)
- ✅ 학생 메시지 초록 버블 오른쪽, AI 메시지 연두 버블 왼쪽 → Task 4
- ✅ 전체 대화 이력 AI에 전달 → Task 3 `onSendChatMessage`
- ✅ AI 단계 범위 제약 → Task 1 시스템 프롬프트
- ✅ "이해했어요" 버튼 → Task 4
- ✅ e2e 테스트 → Task 5

**2. Placeholder scan:** 없음

**3. Type consistency:**
- `ChatEntry`: hook에서 `{role: 'user' | 'ai', text: string}` — view에서 동일하게 사용
- `ChatMessage`: `features/quiz/review-feedback.ts`에서 `{role: 'user' | 'assistant', content: string}` — Firebase 함수 스키마와 동일
- `onSendChatMessage: () => void` — hook 반환 타입과 view props 타입 일치

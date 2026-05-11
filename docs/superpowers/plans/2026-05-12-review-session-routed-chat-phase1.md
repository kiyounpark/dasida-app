# Review Session Routed Chat — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 복습 세션 화면을 단일 ScrollView + entry 누적 모델로 재구성하고, 시작 시 자유 입력을 부활시킨다. AI 응답은 진단 스타일 아바타 말풍선으로 통일하며, 기존 `review-feedback` 백엔드의 2턴 (`explore` / `close`) 모드를 그대로 활용한다. Phase 2의 `review-router` 도입을 위한 무대를 깐다.

**Architecture:** `review-entries.ts` 단일 엔트리 모델로 통합. 기존 `remedial-entries.ts`는 흡수/대체된다. 화면은 `ScrollView` 하나에 모든 entry kind를 순서대로 렌더. 자유 입력 응답은 기존 `requestReviewFeedback` 함수를 1턴(=`explore`) + 선택적 2턴(=`close`) 호출.

**Tech Stack:** Expo React Native, expo-image (avatar), `@testing-library/react-native`, jest. 기존 `DiagnosisChatBubble` 컴포넌트 재사용.

**Related spec:** [2026-05-12-review-session-routed-chat-design.md](../specs/2026-05-12-review-session-routed-chat-design.md)

**Out of scope (Phase 2+):** `review-router` Cloud Function, 라우팅 분기, remedial 노드의 `summary`/`triggers` 메타데이터, 별도 plan으로 분리.

---

## File Structure

### Create
- `features/quiz/components/review-session/review-entries.ts` — 통합 entry 타입 & 팩토리
- `features/quiz/components/review-session/review-entries.test.ts`
- `features/quiz/components/review-session/input-area.tsx` — 선택지 + 자유 입력 통합 컴포넌트
- `features/quiz/components/review-session/feedback-banner.tsx` — 정답/오답 피드백 카드
- `features/quiz/components/review-session/fallback-input-card.tsx` — 2턴째 자유 입력 카드
- `features/quiz/components/review-session/ai-typing-bubble.tsx` — typing dots + 아바타
- `features/quiz/components/review-session/entry-renderer.tsx` — entry kind → 컴포넌트 매핑
- `features/quiz/hooks/use-review-entries.ts` — entries 상태 & 액션 분리 (use-review-session-screen이 너무 커지지 않도록)

### Modify
- `features/quiz/hooks/use-review-session-screen.ts` — entries 모델로 전환, `chatMessages`/`aiResponseCount`/`remedialFlowState` 통합
- `features/quiz/components/review-session-screen-view.tsx` — 단일 ScrollView + entry-renderer
- `features/quiz/hooks/use-review-session-screen.test.ts` — 새 시나리오 추가

### Delete (Task 12)
- `features/quiz/components/review-session/chat-section.tsx` — deprecated
- `features/quiz/components/review-session/remedial-flow.tsx` — entry-renderer로 흡수
- `features/quiz/components/review-session/remedial-ai-help-card.tsx` — fallback-input-card으로 대체
- `features/quiz/components/review-session/remedial-ai-help-actions.tsx` — 작용은 entries 안의 'done-cta'로 흡수
- `features/quiz/components/review-session/input-section.tsx` — input-area로 대체
- `features/quiz/components/review-session/remedial-entries.ts` — review-entries.ts로 통합

---

## Task 1: 정의 — ReviewEntry 타입과 팩토리

**Files:**
- Create: `features/quiz/components/review-session/review-entries.ts`
- Test: `features/quiz/components/review-session/review-entries.test.ts`

- [ ] **Step 1: 테스트 작성**

```ts
// features/quiz/components/review-session/review-entries.test.ts
import {
  createStepCardEntry,
  createInputAreaEntry,
  createChoiceBubbleEntry,
  createFeedbackBannerEntry,
  createUserBubbleEntry,
  createAiBubbleEntry,
  createAiTypingEntry,
  createFallbackInputEntry,
  createRemedialNodeEntry,
  createDoneCtaEntry,
  lockAllEntries,
} from './review-entries';
import type { ExplainNode } from '@/data/review-remedial-flows';

describe('review-entries factories', () => {
  it('createStepCardEntry sets kind/stepIndex', () => {
    expect(createStepCardEntry(0)).toEqual({ kind: 'step-card', stepIndex: 0 });
  });

  it('createInputAreaEntry defaults interactive=true', () => {
    expect(createInputAreaEntry(2)).toEqual({
      kind: 'input-area',
      stepIndex: 2,
      interactive: true,
    });
  });

  it('createChoiceBubbleEntry carries correctness', () => {
    expect(createChoiceBubbleEntry(1, 'two halves', false)).toEqual({
      kind: 'choice-bubble',
      choiceIndex: 1,
      text: 'two halves',
      correct: false,
    });
  });

  it('createAiTypingEntry yields a non-interactive marker', () => {
    expect(createAiTypingEntry()).toEqual({ kind: 'ai-typing' });
  });

  it('createFallbackInputEntry sets turn and interactive', () => {
    expect(createFallbackInputEntry(2)).toEqual({
      kind: 'fallback-input',
      turn: 2,
      interactive: true,
    });
  });

  it('createRemedialNodeEntry wraps a node', () => {
    const node: ExplainNode = {
      id: 'n1',
      kind: 'explain',
      title: 't',
      body: 'b',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'n2',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'n3',
    };
    expect(createRemedialNodeEntry(node)).toEqual({
      kind: 'remedial-node',
      node,
      interactive: true,
    });
  });

  it('lockAllEntries sets interactive=false on every entry that supports it', () => {
    const input = [
      createInputAreaEntry(0),
      createAiBubbleEntry('hi'),
      createFallbackInputEntry(1),
    ];
    const out = lockAllEntries(input);
    expect(out[0]).toMatchObject({ interactive: false });
    expect(out[1]).toEqual({ kind: 'ai-bubble', text: 'hi' });
    expect(out[2]).toMatchObject({ interactive: false });
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm test -- review-entries.test.ts
```

Expected: "Cannot find module './review-entries'".

- [ ] **Step 3: 구현**

```ts
// features/quiz/components/review-session/review-entries.ts
import type { RemedialNode } from '@/data/review-remedial-flows';

export type ReviewEntry =
  | { kind: 'step-card'; stepIndex: number }
  | { kind: 'input-area'; stepIndex: number; interactive: boolean }
  | { kind: 'choice-bubble'; choiceIndex: number; text: string; correct: boolean }
  | { kind: 'feedback-banner'; correct: boolean; text: string }
  | { kind: 'user-bubble'; text: string }
  | { kind: 'ai-bubble'; text: string }
  | { kind: 'ai-typing' }
  | { kind: 'fallback-input'; turn: 1 | 2; interactive: boolean }
  | { kind: 'remedial-node'; node: RemedialNode; interactive: boolean }
  | { kind: 'done-cta'; label: string };

export function createStepCardEntry(stepIndex: number): Extract<ReviewEntry, { kind: 'step-card' }> {
  return { kind: 'step-card', stepIndex };
}

export function createInputAreaEntry(stepIndex: number): Extract<ReviewEntry, { kind: 'input-area' }> {
  return { kind: 'input-area', stepIndex, interactive: true };
}

export function createChoiceBubbleEntry(
  choiceIndex: number,
  text: string,
  correct: boolean,
): Extract<ReviewEntry, { kind: 'choice-bubble' }> {
  return { kind: 'choice-bubble', choiceIndex, text, correct };
}

export function createFeedbackBannerEntry(
  correct: boolean,
  text: string,
): Extract<ReviewEntry, { kind: 'feedback-banner' }> {
  return { kind: 'feedback-banner', correct, text };
}

export function createUserBubbleEntry(text: string): Extract<ReviewEntry, { kind: 'user-bubble' }> {
  return { kind: 'user-bubble', text };
}

export function createAiBubbleEntry(text: string): Extract<ReviewEntry, { kind: 'ai-bubble' }> {
  return { kind: 'ai-bubble', text };
}

export function createAiTypingEntry(): Extract<ReviewEntry, { kind: 'ai-typing' }> {
  return { kind: 'ai-typing' };
}

export function createFallbackInputEntry(turn: 1 | 2): Extract<ReviewEntry, { kind: 'fallback-input' }> {
  return { kind: 'fallback-input', turn, interactive: true };
}

export function createRemedialNodeEntry(node: RemedialNode): Extract<ReviewEntry, { kind: 'remedial-node' }> {
  return { kind: 'remedial-node', node, interactive: true };
}

export function createDoneCtaEntry(label: string): Extract<ReviewEntry, { kind: 'done-cta' }> {
  return { kind: 'done-cta', label };
}

type Lockable = Extract<ReviewEntry, { interactive: boolean }>;

export function lockAllEntries(entries: readonly ReviewEntry[]): ReviewEntry[] {
  return entries.map((e) => {
    if ('interactive' in e) {
      return { ...e, interactive: false } as Lockable;
    }
    return e;
  });
}
```

- [ ] **Step 4: 통과 확인**

```bash
npm test -- review-entries.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/components/review-session/review-entries.ts features/quiz/components/review-session/review-entries.test.ts
git commit -m "feat(review): add unified ReviewEntry types and factories"
```

---

## Task 2: InputArea 컴포넌트 — 선택지 + 자유 입력

**Files:**
- Create: `features/quiz/components/review-session/input-area.tsx`
- Test: `features/quiz/components/review-session/input-area.test.tsx`

기존 `input-section.tsx`의 선택지 스타일을 유지하면서, 그 아래에 자유 입력 박스를 추가한다. 한 컴포넌트 안에서 사용자는 (a) 선택지 클릭, (b) 자유 텍스트 작성 후 전송 중 하나를 한다. interactive=false면 두 인터랙션 모두 잠긴다.

- [ ] **Step 1: 테스트 작성**

```tsx
// features/quiz/components/review-session/input-area.test.tsx
import { fireEvent, render } from '@testing-library/react-native';
import { InputArea } from './input-area';

const step = {
  title: 't', body: 'b',
  choices: [
    { text: '가 선택지', correct: true },
    { text: '나 선택지', correct: false },
  ],
} as any;

describe('InputArea', () => {
  it('선택지 누르면 onSelectChoice 호출', () => {
    const onSelectChoice = jest.fn();
    const { getByText } = render(
      <InputArea
        step={step}
        freeText=""
        interactive
        onSelectChoice={onSelectChoice}
        onChangeFreeText={() => {}}
        onSubmitFreeText={() => {}}
      />,
    );
    fireEvent.press(getByText('가 선택지'));
    expect(onSelectChoice).toHaveBeenCalledWith(0);
  });

  it('자유 입력 전송 버튼은 텍스트 있고 interactive일 때만 활성', () => {
    const onSubmit = jest.fn();
    const { getByLabelText, rerender } = render(
      <InputArea
        step={step}
        freeText=""
        interactive
        onSelectChoice={() => {}}
        onChangeFreeText={() => {}}
        onSubmitFreeText={onSubmit}
      />,
    );
    fireEvent.press(getByLabelText('자유 입력 전송'));
    expect(onSubmit).not.toHaveBeenCalled();

    rerender(
      <InputArea
        step={step}
        freeText="이해한 내용"
        interactive
        onSelectChoice={() => {}}
        onChangeFreeText={() => {}}
        onSubmitFreeText={onSubmit}
      />,
    );
    fireEvent.press(getByLabelText('자유 입력 전송'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('interactive=false면 선택지와 입력 모두 비활성', () => {
    const onSelectChoice = jest.fn();
    const onSubmit = jest.fn();
    const { getByText, getByLabelText } = render(
      <InputArea
        step={step}
        freeText="x"
        interactive={false}
        onSelectChoice={onSelectChoice}
        onChangeFreeText={() => {}}
        onSubmitFreeText={onSubmit}
      />,
    );
    fireEvent.press(getByText('가 선택지'));
    fireEvent.press(getByLabelText('자유 입력 전송'));
    expect(onSelectChoice).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm test -- input-area.test.tsx
```

Expected: "Cannot find module './input-area'".

- [ ] **Step 3: 구현**

```tsx
// features/quiz/components/review-session/input-area.tsx
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';
import type { ThinkingStep } from '@/data/review-content-map';

import { Paper } from './paper-tokens';

const CHOICE_LABELS = ['가', '나', '다', '라'];

interface InputAreaProps {
  step: ThinkingStep;
  freeText: string;
  interactive: boolean;
  onSelectChoice: (index: number) => void;
  onChangeFreeText: (text: string) => void;
  onSubmitFreeText: () => void;
}

export function InputArea({
  step,
  freeText,
  interactive,
  onSelectChoice,
  onChangeFreeText,
  onSubmitFreeText,
}: InputAreaProps) {
  const canSubmit = interactive && freeText.trim().length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>💭 이 단계, 어떻게 이해했나요?</Text>

      <View>
        {step.choices.map((choice, i) => (
          <Pressable
            key={i}
            onPress={() => interactive && onSelectChoice(i)}
            disabled={!interactive}
            accessibilityRole="button"
            accessibilityLabel={`보기 ${CHOICE_LABELS[i] ?? i + 1}: ${choice.text}`}
            style={[styles.choiceBtn, !interactive && styles.choiceBtnDim]}>
            <View style={styles.choiceBadge}>
              <Text style={styles.choiceBadgeText}>{CHOICE_LABELS[i] ?? `${i + 1}`}</Text>
            </View>
            <Text style={styles.choiceText}>{choice.text}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.orLabel}>또는 직접 적어주세요</Text>

      <View style={styles.freeInputRow}>
        <View style={[styles.freeInputBox, !interactive && styles.freeInputBoxDim]}>
          <TextInput
            style={styles.freeInputText}
            value={freeText}
            onChangeText={onChangeFreeText}
            editable={interactive}
            placeholder="이해한 내용을 짧게 적어보세요"
            placeholderTextColor={Paper.inkFaint}
            multiline
          />
        </View>
        <Pressable
          onPress={() => canSubmit && onSubmitFreeText()}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="자유 입력 전송"
          accessibilityState={{ disabled: !canSubmit }}
          style={[styles.sendBtn, !canSubmit && styles.sendBtnDisabled]}>
          <Text style={styles.sendBtnText}>↑</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  label: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 12,
    color: Paper.ink,
    paddingLeft: 4,
  },
  choiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: Paper.ink,
    borderRadius: 12,
    backgroundColor: Paper.paper,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 8,
    boxShadow: '0 2px 0 rgba(26,25,22,0.06)',
  },
  choiceBtnDim: { opacity: 0.5 },
  choiceBadge: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1.5, borderColor: Paper.ink, backgroundColor: Paper.cream,
    alignItems: 'center', justifyContent: 'center',
  },
  choiceBadgeText: {
    fontFamily: FontFamilies.serifBold, fontSize: 13, color: Paper.ink,
  },
  choiceText: {
    flex: 1, fontFamily: FontFamilies.medium, fontSize: 13, lineHeight: 19, color: Paper.ink,
  },
  orLabel: {
    fontFamily: FontFamilies.medium, fontSize: 11, color: Paper.inkMute,
    paddingLeft: 4, marginTop: 4,
  },
  freeInputRow: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-end',
  },
  freeInputBox: {
    flex: 1, minHeight: 50, maxHeight: 120,
    borderWidth: 1.5, borderColor: Paper.ink, borderRadius: 14,
    backgroundColor: Paper.paper, paddingHorizontal: 14, paddingVertical: 10,
    boxShadow: '0 2px 0 rgba(26,25,22,0.06)',
  },
  freeInputBoxDim: { opacity: 0.5 },
  freeInputText: {
    fontFamily: FontFamilies.regular, fontSize: 13, color: Paper.ink, padding: 0,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1.5, borderColor: Paper.ink, backgroundColor: Paper.forest800,
    alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 0 rgba(26,25,22,0.4)',
  },
  sendBtnDisabled: {
    backgroundColor: Paper.creamDeep, borderColor: Paper.edge,
    boxShadow: 'none',
  },
  sendBtnText: {
    fontFamily: FontFamilies.extrabold, fontSize: 18, color: Paper.cream,
  },
});
```

- [ ] **Step 4: 통과 확인**

```bash
npm test -- input-area.test.tsx
```

Expected: All 3 tests pass.

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/components/review-session/input-area.tsx features/quiz/components/review-session/input-area.test.tsx
git commit -m "feat(review): add InputArea with choices and free-text input"
```

---

## Task 3: FeedbackBanner / FallbackInputCard / AiTypingBubble

세 개의 작은 컴포넌트를 한 번에 묶어 작성. 모두 50줄 미만의 presentational 컴포넌트.

**Files:**
- Create: `features/quiz/components/review-session/feedback-banner.tsx`
- Create: `features/quiz/components/review-session/fallback-input-card.tsx`
- Create: `features/quiz/components/review-session/ai-typing-bubble.tsx`
- Test: `features/quiz/components/review-session/feedback-banner.test.tsx`
- Test: `features/quiz/components/review-session/fallback-input-card.test.tsx`

- [ ] **Step 1: feedback-banner 테스트 + 구현**

```tsx
// feedback-banner.test.tsx
import { render } from '@testing-library/react-native';
import { FeedbackBanner } from './feedback-banner';

describe('FeedbackBanner', () => {
  it('correct=true → "정답" 라벨', () => {
    const { getByText } = render(<FeedbackBanner correct text="잘 했어요" />);
    expect(getByText('정답')).toBeTruthy();
    expect(getByText('잘 했어요')).toBeTruthy();
  });
  it('correct=false → "다시 한 번" 라벨', () => {
    const { getByText } = render(<FeedbackBanner correct={false} text="다른 보기를 보세요" />);
    expect(getByText('다시 한 번')).toBeTruthy();
  });
});
```

```tsx
// feedback-banner.tsx
import { StyleSheet, Text, View } from 'react-native';
import { FontFamilies } from '@/constants/typography';
import { Paper } from './paper-tokens';

export function FeedbackBanner({ correct, text }: { correct: boolean; text: string }) {
  return (
    <View style={styles.box}>
      <View style={styles.marginLine} />
      <View style={[styles.flag, !correct && styles.flagWrong]}>
        <Text style={styles.flagText}>{correct ? '정답' : '다시 한 번'}</Text>
      </View>
      <Text style={styles.text} selectable>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 12, paddingTop: 14, paddingRight: 14, paddingBottom: 12, paddingLeft: 38,
    borderWidth: 1.5, borderColor: Paper.ink, borderRadius: 12,
    backgroundColor: Paper.paper, position: 'relative',
    boxShadow: '0 2px 0 rgba(26,25,22,0.08)',
  },
  marginLine: {
    position: 'absolute', top: 0, bottom: 0, left: 22, width: 1.5,
    backgroundColor: Paper.marginRed,
  },
  flag: {
    position: 'absolute', top: -10, left: 14,
    backgroundColor: Paper.forest800, borderWidth: 1.5, borderColor: Paper.ink,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  flagWrong: { backgroundColor: Paper.rustDeep },
  flagText: {
    fontFamily: FontFamilies.extrabold, fontSize: 10,
    color: Paper.cream, letterSpacing: 1.2,
  },
  text: {
    fontFamily: FontFamilies.regular, fontSize: 13, lineHeight: 20, color: Paper.inkSoft,
  },
});
```

- [ ] **Step 2: fallback-input-card 테스트 + 구현**

```tsx
// fallback-input-card.test.tsx
import { fireEvent, render } from '@testing-library/react-native';
import { FallbackInputCard } from './fallback-input-card';

describe('FallbackInputCard', () => {
  it('전송 버튼 클릭 시 onSubmit 호출', () => {
    const onSubmit = jest.fn();
    const { getByLabelText } = render(
      <FallbackInputCard
        text="한 번 더 답변"
        turn={2}
        interactive
        onChangeText={() => {}}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.press(getByLabelText('자유 입력 전송'));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('interactive=false면 비활성', () => {
    const onSubmit = jest.fn();
    const { getByLabelText } = render(
      <FallbackInputCard
        text="x"
        turn={1}
        interactive={false}
        onChangeText={() => {}}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.press(getByLabelText('자유 입력 전송'));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

```tsx
// fallback-input-card.tsx
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { FontFamilies } from '@/constants/typography';
import { Paper } from './paper-tokens';

interface Props {
  text: string;
  turn: 1 | 2;
  interactive: boolean;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
}

export function FallbackInputCard({ text, turn, interactive, onChangeText, onSubmit }: Props) {
  const canSubmit = interactive && text.trim().length > 0;
  const hint = turn === 1 ? '한 번 더 이야기해볼래요?' : '마지막으로 한 번만 더 물어볼게요';
  return (
    <View style={[styles.card, !interactive && styles.locked]}>
      <Text style={styles.hint}>{hint}</Text>
      <View style={styles.row}>
        <View style={styles.inputBox}>
          <TextInput
            style={styles.inputText}
            value={text}
            onChangeText={onChangeText}
            editable={interactive}
            placeholder="짧게 적어주세요"
            placeholderTextColor={Paper.inkFaint}
            multiline
          />
        </View>
        <Pressable
          onPress={() => canSubmit && onSubmit()}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="자유 입력 전송"
          style={[styles.sendBtn, !canSubmit && styles.sendBtnDisabled]}>
          <Text style={styles.sendBtnText}>↑</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 8, padding: 12, gap: 8,
    backgroundColor: Paper.cream, borderColor: Paper.edge, borderWidth: 1, borderRadius: 12,
  },
  locked: { opacity: 0.55 },
  hint: { fontFamily: FontFamilies.medium, fontSize: 12, color: Paper.inkMute },
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  inputBox: {
    flex: 1, minHeight: 44, maxHeight: 100,
    borderWidth: 1.5, borderColor: Paper.ink, borderRadius: 12,
    backgroundColor: Paper.paper, paddingHorizontal: 12, paddingVertical: 8,
  },
  inputText: { fontFamily: FontFamilies.regular, fontSize: 13, color: Paper.ink, padding: 0 },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1.5, borderColor: Paper.ink, backgroundColor: Paper.forest800,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Paper.creamDeep, borderColor: Paper.edge,
  },
  sendBtnText: { fontFamily: FontFamilies.extrabold, fontSize: 16, color: Paper.cream },
});
```

- [ ] **Step 3: ai-typing-bubble 구현 (테스트 생략 — 순수 presentational, 분기 없음)**

```tsx
// ai-typing-bubble.tsx
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Paper } from './paper-tokens';

const AVATAR_SIZE = 28;

export function AiTypingBubble() {
  return (
    <View style={styles.row}>
      <Image
        source={require('@/assets/review/ai-coach-avatar.png')}
        style={styles.avatar}
        contentFit="cover"
      />
      <View style={styles.bubble}>
        <View style={styles.dots}>
          <View style={[styles.dot, { opacity: 0.3 }]} />
          <View style={[styles.dot, { opacity: 0.6 }]} />
          <View style={[styles.dot, { opacity: 1 }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  avatar: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, flexShrink: 0,
  },
  bubble: {
    backgroundColor: Paper.paper,
    borderWidth: 1, borderColor: Paper.edge,
    borderRadius: 16, borderBottomLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Paper.forest500 },
});
```

- [ ] **Step 4: 테스트 실행**

```bash
npm test -- feedback-banner.test.tsx fallback-input-card.test.tsx
```

Expected: All pass.

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/components/review-session/feedback-banner.tsx \
  features/quiz/components/review-session/feedback-banner.test.tsx \
  features/quiz/components/review-session/fallback-input-card.tsx \
  features/quiz/components/review-session/fallback-input-card.test.tsx \
  features/quiz/components/review-session/ai-typing-bubble.tsx
git commit -m "feat(review): add feedback banner, fallback input, and AI typing components"
```

---

## Task 4: EntryRenderer — kind → 컴포넌트 매핑

**Files:**
- Create: `features/quiz/components/review-session/entry-renderer.tsx`
- Test: `features/quiz/components/review-session/entry-renderer.test.tsx`

핸들러 props를 받고 ReviewEntry 하나를 적절한 컴포넌트로 렌더한다. 부모(`review-session-screen-view`)가 entries 배열을 map하면서 호출.

- [ ] **Step 1: 테스트 작성**

```tsx
// entry-renderer.test.tsx
import { render } from '@testing-library/react-native';
import { EntryRenderer } from './entry-renderer';
import { createAiBubbleEntry, createChoiceBubbleEntry, createAiTypingEntry } from './review-entries';

const baseProps = {
  step: { title: 's', body: 'b', choices: [], example: '' } as any,
  currentStepIndex: 0, totalSteps: 1,
  freeText: '', fallbackText: '',
  onSelectChoice: jest.fn(), onChangeFreeText: jest.fn(), onSubmitFreeText: jest.fn(),
  onChangeFallbackText: jest.fn(), onSubmitFallback: jest.fn(),
  onPressDoneCta: jest.fn(),
  onRemedialExplainPrimary: jest.fn(), onRemedialExplainSecondary: jest.fn(),
  onRemedialCheckOption: jest.fn(), onRemedialCheckDontKnow: jest.fn(),
};

describe('EntryRenderer', () => {
  it('ai-bubble entry → AI 텍스트 표시', () => {
    const { getByText } = render(
      <EntryRenderer entry={createAiBubbleEntry('안녕하세요')} {...baseProps} />,
    );
    expect(getByText('안녕하세요')).toBeTruthy();
  });
  it('choice-bubble → "보기 X" 텍스트 표시', () => {
    const { getByText } = render(
      <EntryRenderer entry={createChoiceBubbleEntry(1, '두 배', false)} {...baseProps} />,
    );
    expect(getByText(/두 배/)).toBeTruthy();
  });
  it('ai-typing → 렌더 가능 (스냅샷)', () => {
    const tree = render(<EntryRenderer entry={createAiTypingEntry()} {...baseProps} />);
    expect(tree).toBeTruthy();
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm test -- entry-renderer.test.tsx
```

Expected: Cannot find module.

- [ ] **Step 3: 구현**

```tsx
// entry-renderer.tsx
import { StepCard } from './step-card';
import { InputArea } from './input-area';
import { FeedbackBanner } from './feedback-banner';
import { FallbackInputCard } from './fallback-input-card';
import { AiTypingBubble } from './ai-typing-bubble';
import { RemedialExplainCard } from './remedial-explain-card';
import { RemedialCheckCard } from './remedial-check-card';
import { DiagnosisChatBubble } from '@/features/quiz/components/diagnosis-chat-bubble';
import { Pressable, StyleSheet, Text } from 'react-native';
import { FontFamilies } from '@/constants/typography';
import { Paper } from './paper-tokens';
import type { ReviewEntry } from './review-entries';
import type { ThinkingStep } from '@/data/review-content-map';

const CHOICE_LABELS = ['가', '나', '다', '라'];

type Props = {
  entry: ReviewEntry;
  step: ThinkingStep;
  currentStepIndex: number;
  totalSteps: number;
  freeText: string;
  fallbackText: string;
  onSelectChoice: (i: number) => void;
  onChangeFreeText: (t: string) => void;
  onSubmitFreeText: () => void;
  onChangeFallbackText: (t: string) => void;
  onSubmitFallback: () => void;
  onPressDoneCta: () => void;
  onRemedialExplainPrimary: (nodeId: string) => void;
  onRemedialExplainSecondary: (nodeId: string) => void;
  onRemedialCheckOption: (nodeId: string, optionId: string) => void;
  onRemedialCheckDontKnow: (nodeId: string) => void;
};

export function EntryRenderer(props: Props) {
  const { entry, step, currentStepIndex, totalSteps } = props;

  switch (entry.kind) {
    case 'step-card':
      return <StepCard step={step} currentStepIndex={currentStepIndex} totalSteps={totalSteps} />;

    case 'input-area':
      return (
        <InputArea
          step={step}
          freeText={props.freeText}
          interactive={entry.interactive}
          onSelectChoice={props.onSelectChoice}
          onChangeFreeText={props.onChangeFreeText}
          onSubmitFreeText={props.onSubmitFreeText}
        />
      );

    case 'choice-bubble':
      return (
        <DiagnosisChatBubble
          role="user"
          text={`보기 ${CHOICE_LABELS[entry.choiceIndex] ?? entry.choiceIndex + 1}: ${entry.text}`}
        />
      );

    case 'feedback-banner':
      return <FeedbackBanner correct={entry.correct} text={entry.text} />;

    case 'user-bubble':
      return <DiagnosisChatBubble role="user" text={entry.text} />;

    case 'ai-bubble':
      return <DiagnosisChatBubble role="assistant" text={entry.text} showAvatar />;

    case 'ai-typing':
      return <AiTypingBubble />;

    case 'fallback-input':
      return (
        <FallbackInputCard
          text={props.fallbackText}
          turn={entry.turn}
          interactive={entry.interactive}
          onChangeText={props.onChangeFallbackText}
          onSubmit={props.onSubmitFallback}
        />
      );

    case 'remedial-node': {
      const node = entry.node;
      if (node.kind === 'explain') {
        return (
          <RemedialExplainCard
            node={node}
            interactive={entry.interactive}
            onPressPrimary={() => props.onRemedialExplainPrimary(node.id)}
            onPressSecondary={() => props.onRemedialExplainSecondary(node.id)}
          />
        );
      }
      if (node.kind === 'check') {
        return (
          <RemedialCheckCard
            node={node}
            interactive={entry.interactive}
            onPressOption={(opt) => props.onRemedialCheckOption(node.id, opt)}
            onPressDontKnow={() => props.onRemedialCheckDontKnow(node.id)}
          />
        );
      }
      return null;
    }

    case 'done-cta':
      return (
        <Pressable
          style={ctaStyles.btn}
          onPress={props.onPressDoneCta}
          accessibilityRole="button"
          accessibilityLabel={entry.label}>
          <Text style={ctaStyles.text}>{entry.label}</Text>
        </Pressable>
      );

    default:
      return null;
  }
}

const ctaStyles = StyleSheet.create({
  btn: {
    marginTop: 14, height: 50,
    borderWidth: 1.5, borderColor: Paper.ink, borderRadius: 14, backgroundColor: Paper.forest800,
    alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 3px 0 rgba(26,25,22,1)',
  },
  text: {
    fontFamily: FontFamilies.bold, fontSize: 14, color: Paper.cream, letterSpacing: -0.2,
  },
});
```

- [ ] **Step 4: 통과 확인**

```bash
npm test -- entry-renderer.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/components/review-session/entry-renderer.tsx features/quiz/components/review-session/entry-renderer.test.tsx
git commit -m "feat(review): add EntryRenderer mapping entry kind to component"
```

---

## Task 5: useReviewEntries 훅 — entries 상태와 액션 분리

큰 `use-review-session-screen.ts`에서 entries 관리만 떼어내는 작은 훅. 검증 가능한 단위로 만든다.

**Files:**
- Create: `features/quiz/hooks/use-review-entries.ts`
- Test: `features/quiz/hooks/use-review-entries.test.ts`

- [ ] **Step 1: 테스트 작성**

```ts
// use-review-entries.test.ts
import { act, renderHook } from '@testing-library/react-native';
import { useReviewEntries } from './use-review-entries';

describe('useReviewEntries', () => {
  it('초기화 시 step-card + input-area 시드', () => {
    const { result } = renderHook(() => useReviewEntries(0));
    expect(result.current.entries).toEqual([
      { kind: 'step-card', stepIndex: 0 },
      { kind: 'input-area', stepIndex: 0, interactive: true },
    ]);
  });

  it('appendEntries 시 뒤에 추가', () => {
    const { result } = renderHook(() => useReviewEntries(0));
    act(() => result.current.appendEntries([{ kind: 'user-bubble', text: 'hi' }]));
    expect(result.current.entries[2]).toEqual({ kind: 'user-bubble', text: 'hi' });
  });

  it('resetForStep 호출 시 entries 새로 시드', () => {
    const { result } = renderHook(() => useReviewEntries(0));
    act(() => result.current.appendEntries([{ kind: 'user-bubble', text: 'hi' }]));
    act(() => result.current.resetForStep(3));
    expect(result.current.entries).toEqual([
      { kind: 'step-card', stepIndex: 3 },
      { kind: 'input-area', stepIndex: 3, interactive: true },
    ]);
  });

  it('lockInputArea — 모든 input-area, fallback-input 인터랙티브 false로', () => {
    const { result } = renderHook(() => useReviewEntries(0));
    act(() => result.current.appendEntries([
      { kind: 'fallback-input', turn: 1, interactive: true },
    ]));
    act(() => result.current.lockInputArea());
    const inputArea = result.current.entries.find((e) => e.kind === 'input-area');
    const fb = result.current.entries.find((e) => e.kind === 'fallback-input');
    expect(inputArea).toMatchObject({ interactive: false });
    expect(fb).toMatchObject({ interactive: false });
  });

  it('replaceTypingWithBubble — 마지막 ai-typing을 ai-bubble로 교체', () => {
    const { result } = renderHook(() => useReviewEntries(0));
    act(() => result.current.appendEntries([{ kind: 'ai-typing' }]));
    act(() => result.current.replaceTypingWithBubble('응답입니다'));
    const last = result.current.entries[result.current.entries.length - 1];
    expect(last).toEqual({ kind: 'ai-bubble', text: '응답입니다' });
  });

  it('replaceTypingWithBubble — typing 없으면 단순 append', () => {
    const { result } = renderHook(() => useReviewEntries(0));
    act(() => result.current.replaceTypingWithBubble('응답'));
    const last = result.current.entries[result.current.entries.length - 1];
    expect(last).toEqual({ kind: 'ai-bubble', text: '응답' });
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm test -- use-review-entries.test.ts
```

Expected: Cannot find module.

- [ ] **Step 3: 구현**

```ts
// features/quiz/hooks/use-review-entries.ts
import { useCallback, useState } from 'react';
import {
  createInputAreaEntry,
  createStepCardEntry,
  createAiBubbleEntry,
  type ReviewEntry,
} from '@/features/quiz/components/review-session/review-entries';

export function useReviewEntries(initialStepIndex: number) {
  const [entries, setEntries] = useState<ReviewEntry[]>(() => [
    createStepCardEntry(initialStepIndex),
    createInputAreaEntry(initialStepIndex),
  ]);

  const appendEntries = useCallback((next: ReviewEntry[]) => {
    setEntries((prev) => [...prev, ...next]);
  }, []);

  const resetForStep = useCallback((stepIndex: number) => {
    setEntries([createStepCardEntry(stepIndex), createInputAreaEntry(stepIndex)]);
  }, []);

  const lockInputArea = useCallback(() => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.kind === 'input-area' || e.kind === 'fallback-input') {
          return { ...e, interactive: false };
        }
        return e;
      }),
    );
  }, []);

  const lockRemedialNodes = useCallback(() => {
    setEntries((prev) =>
      prev.map((e) => (e.kind === 'remedial-node' ? { ...e, interactive: false } : e)),
    );
  }, []);

  const replaceTypingWithBubble = useCallback((text: string) => {
    setEntries((prev) => {
      const lastIdx = prev.length - 1;
      if (lastIdx >= 0 && prev[lastIdx].kind === 'ai-typing') {
        const next = prev.slice(0, lastIdx);
        next.push(createAiBubbleEntry(text));
        return next;
      }
      return [...prev, createAiBubbleEntry(text)];
    });
  }, []);

  const removeLastTyping = useCallback(() => {
    setEntries((prev) => {
      const lastIdx = prev.length - 1;
      if (lastIdx >= 0 && prev[lastIdx].kind === 'ai-typing') {
        return prev.slice(0, lastIdx);
      }
      return prev;
    });
  }, []);

  return {
    entries,
    appendEntries,
    resetForStep,
    lockInputArea,
    lockRemedialNodes,
    replaceTypingWithBubble,
    removeLastTyping,
  };
}
```

- [ ] **Step 4: 통과 확인**

```bash
npm test -- use-review-entries.test.ts
```

Expected: 6 tests pass.

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/hooks/use-review-entries.ts features/quiz/hooks/use-review-entries.test.ts
git commit -m "feat(review): extract useReviewEntries hook for entries state management"
```

---

## Task 6: use-review-session-screen 통합 — 정답/오답 선택 흐름

기존 `use-review-session-screen.ts`는 큰 훅이라 한 번에 다 바꾸지 않는다. 이 task에서는:
- `useReviewEntries`를 도입
- 선택지 클릭 → `choice-bubble` + `feedback-banner` + (정답이면 `done-cta` / 오답이면 remedial 진입) entries 추가
- 자유 입력 흐름은 Task 7에서 처리
- 기존 `stepPhase`, `chatMessages`, `remedialFlowState` 등 옛 필드는 일단 남겨두고 새 필드 병행 (Task 12에서 정리)

**Files:**
- Modify: `features/quiz/hooks/use-review-session-screen.ts`
- Modify: `features/quiz/hooks/use-review-session-screen.test.ts`

- [ ] **Step 1: 기존 테스트 보존 확인**

```bash
npm test -- use-review-session-screen.test.ts
```

Expected: 기존 테스트 모두 통과. (현재 흐름은 변경 전이므로 그대로 작동)

- [ ] **Step 2: 새 시나리오 테스트 추가**

`use-review-session-screen.test.ts` 에 새 `describe('entries-based flow')` 블록을 추가:

```ts
describe('entries-based flow', () => {
  it('초기 entries에 step-card와 input-area가 있다', () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    expect(result.current.entries[0]).toMatchObject({ kind: 'step-card' });
    expect(result.current.entries[1]).toMatchObject({ kind: 'input-area', interactive: true });
  });

  it('정답 선택 시 choice-bubble + feedback-banner + done-cta 추가', async () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));
    const correctIdx = result.current.steps[0].choices.findIndex((c) => c.correct);

    await act(async () => {
      result.current.onSelectChoice(correctIdx);
    });

    const kinds = result.current.entries.map((e) => e.kind);
    expect(kinds).toContain('choice-bubble');
    expect(kinds).toContain('feedback-banner');
    expect(kinds).toContain('done-cta');
    const inputArea = result.current.entries.find((e) => e.kind === 'input-area');
    expect(inputArea).toMatchObject({ interactive: false });
  });

  it('오답 선택 시 choice-bubble + feedback-banner + 첫 remedial-node 추가', async () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));
    const wrongIdx = result.current.steps[0].choices.findIndex((c) => !c.correct);

    await act(async () => {
      result.current.onSelectChoice(wrongIdx);
    });

    const kinds = result.current.entries.map((e) => e.kind);
    expect(kinds).toContain('choice-bubble');
    expect(kinds).toContain('feedback-banner');
    expect(kinds).toContain('remedial-node');
  });
});
```

- [ ] **Step 3: 실패 확인**

```bash
npm test -- use-review-session-screen.test.ts
```

Expected: 새 3개 테스트 실패 ("entries is undefined" 등).

- [ ] **Step 4: 훅 수정 — useReviewEntries 도입 + 선택 핸들러 갱신**

`use-review-session-screen.ts` 변경 사항:

1. 파일 상단 import 추가:
   ```ts
   import { useReviewEntries } from './use-review-entries';
   import {
     createChoiceBubbleEntry,
     createFeedbackBannerEntry,
     createDoneCtaEntry,
     createRemedialNodeEntry,
   } from '@/features/quiz/components/review-session/review-entries';
   ```

2. 훅 본문 안에서 `useReviewEntries` 호출 (현재 step index 사용):
   ```ts
   const reviewEntries = useReviewEntries(currentStepIndex);
   ```

3. `useEffect` 추가 — `currentStepIndex` 변경 시 entries 리셋:
   ```ts
   useEffect(() => {
     reviewEntries.resetForStep(currentStepIndex);
   }, [currentStepIndex]);
   ```
   (eslint-disable react-hooks/exhaustive-deps 필요 시 함수 ref 안정성 위해)

4. 기존 `onSelectChoice` 함수를 찾아서 (현재 `setSelectedChoiceIndex`, `setSelectedChoiceFeedback`, remedial-flow 시작 등을 수행) 그 직후에 entry append 로직 추가:
   ```ts
   const onSelectChoice = (index: number) => {
     // ...기존 로직 그대로...

     const choice = steps[currentStepIndex].choices[index];
     const feedbackText = /* 기존에 계산하던 selectedChoiceFeedback */;

     reviewEntries.lockInputArea();
     reviewEntries.appendEntries([
       createChoiceBubbleEntry(index, choice.text, choice.correct),
       createFeedbackBannerEntry(choice.correct, feedbackText),
     ]);

     if (choice.correct) {
       const isLast = currentStepIndex === steps.length - 1;
       reviewEntries.appendEntries([
         createDoneCtaEntry(isLast ? '이해했어요, 완료' : '이해했어요, 다음으로'),
       ]);
     } else {
       // 오답: 약점의 remedial-flow 첫 노드를 찾아 entry로 추가
       const entryNodeId = /* 기존에 사용하던 진입 노드 ID */;
       const firstNode = getRemedialNode(task.weaknessId, entryNodeId);
       if (firstNode && firstNode.kind !== 'exit') {
         reviewEntries.appendEntries([createRemedialNodeEntry(firstNode)]);
       }
     }
   };
   ```

5. 반환 객체에 추가:
   ```ts
   entries: reviewEntries.entries,
   ```

   타입에도 `entries: ReviewEntry[]` 추가.

- [ ] **Step 5: 통과 확인**

```bash
npm test -- use-review-session-screen.test.ts
```

Expected: 기존 + 새 테스트 모두 통과.

- [ ] **Step 6: 커밋**

```bash
git add features/quiz/hooks/use-review-session-screen.ts features/quiz/hooks/use-review-session-screen.test.ts
git commit -m "feat(review): drive choice flow through entries model"
```

---

## Task 7: 자유 입력 흐름 — 1턴 호출 + ai-typing

자유 입력 제출 시 `requestReviewFeedback` 호출, typing 표시, 응답 ai-bubble로 교체. 응답 후 두 번째 fallback-input 또는 done-cta 결정은 Task 8에서.

**Files:**
- Modify: `features/quiz/hooks/use-review-session-screen.ts`
- Modify: `features/quiz/hooks/use-review-session-screen.test.ts`

- [ ] **Step 1: 테스트 추가**

기존 entries-based flow 블록 안에:

```ts
it('자유 입력 제출 시 user-bubble + ai-typing → ai-bubble로 교체', async () => {
  const spy = jest
    .spyOn(reviewFeedback, 'requestReviewFeedback')
    .mockResolvedValue({ replyText: 'AI 응답 내용' });

  const { result } = renderHook(() => useReviewSessionScreen());
  await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));

  act(() => result.current.onChangeFreeText('이해한 내용 작성'));
  await act(async () => {
    await result.current.onSubmitFreeText();
  });

  const kinds = result.current.entries.map((e) => e.kind);
  expect(kinds).toContain('user-bubble');
  expect(kinds).toContain('ai-bubble');
  expect(kinds).not.toContain('ai-typing'); // 응답 도착 후 사라짐

  spy.mockRestore();
});

it('자유 입력 호출 실패 시 ai-typing 제거 + 에러 메시지 ai-bubble', async () => {
  const spy = jest
    .spyOn(reviewFeedback, 'requestReviewFeedback')
    .mockRejectedValue(new Error('network'));

  const { result } = renderHook(() => useReviewSessionScreen());
  await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));

  act(() => result.current.onChangeFreeText('hello'));
  await act(async () => {
    await result.current.onSubmitFreeText();
  });

  const kinds = result.current.entries.map((e) => e.kind);
  expect(kinds).not.toContain('ai-typing');
  const lastAi = [...result.current.entries].reverse().find((e) => e.kind === 'ai-bubble');
  expect(lastAi).toBeDefined();

  spy.mockRestore();
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm test -- use-review-session-screen.test.ts
```

Expected: 새 2개 테스트 실패 ("onSubmitFreeText is undefined").

- [ ] **Step 3: 자유 입력 핸들러 추가**

```ts
// use-review-session-screen.ts — 추가 import
import {
  createUserBubbleEntry,
  createAiTypingEntry,
  createFallbackInputEntry,
} from '@/features/quiz/components/review-session/review-entries';

// 상태 추가
const [freeText, setFreeText] = useState('');
const [fallbackText, setFallbackText] = useState('');
const [fallbackTurnsUsed, setFallbackTurnsUsed] = useState(0);
const chatHistoryRef = useRef<ChatMessage[]>([]);

// 핸들러
const onChangeFreeText = (text: string) => setFreeText(text);

const onSubmitFreeText = async () => {
  const text = freeText.trim();
  if (!text || !task) return;

  setFreeText('');
  reviewEntries.lockInputArea();
  reviewEntries.appendEntries([
    createUserBubbleEntry(text),
    createAiTypingEntry(),
  ]);

  chatHistoryRef.current = [{ role: 'user', content: text }];

  try {
    const result = await requestReviewFeedback({
      weaknessId: task.weaknessId,
      stepTitle: steps[currentStepIndex].title,
      stepBody: steps[currentStepIndex].body,
      messages: chatHistoryRef.current,
    });
    chatHistoryRef.current.push({ role: 'assistant', content: result.replyText });
    reviewEntries.replaceTypingWithBubble(result.replyText);
    // 1턴 완료 — fallback-input(turn=2) 추가는 Task 8
    setFallbackTurnsUsed(1);
  } catch {
    reviewEntries.replaceTypingWithBubble('응답이 늦고 있어요. 잠시 후 다시 시도해주세요.');
  }
};

// 반환 객체에 추가
freeText,
fallbackText,
onChangeFreeText,
onSubmitFreeText,
```

- [ ] **Step 4: 통과 확인**

```bash
npm test -- use-review-session-screen.test.ts
```

Expected: 모든 테스트 통과.

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/hooks/use-review-session-screen.ts features/quiz/hooks/use-review-session-screen.test.ts
git commit -m "feat(review): wire free-text submit to review-feedback first turn"
```

---

## Task 8: 2턴째 fallback-input + close 모드 + done-cta

1턴 응답 후 자동으로 `fallback-input` (turn=2) entry 추가. 두 번째 제출 시 `close` 모드로 응답 + done-cta. 호출 측은 같은 `requestReviewFeedback` 함수, 백엔드가 messages 배열의 assistant 카운트로 모드 결정.

**Files:**
- Modify: `features/quiz/hooks/use-review-session-screen.ts`
- Modify: `features/quiz/hooks/use-review-session-screen.test.ts`

- [ ] **Step 1: 테스트 추가**

```ts
it('1턴 응답 후 fallback-input(turn=2) 자동 추가', async () => {
  const spy = jest
    .spyOn(reviewFeedback, 'requestReviewFeedback')
    .mockResolvedValue({ replyText: '1차 응답' });

  const { result } = renderHook(() => useReviewSessionScreen());
  await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));

  act(() => result.current.onChangeFreeText('첫 입력'));
  await act(async () => { await result.current.onSubmitFreeText(); });

  const fb = result.current.entries.find((e) => e.kind === 'fallback-input');
  expect(fb).toMatchObject({ turn: 2, interactive: true });

  spy.mockRestore();
});

it('2턴 응답 후 done-cta 추가, fallback-input 잠금', async () => {
  const spy = jest
    .spyOn(reviewFeedback, 'requestReviewFeedback')
    .mockResolvedValueOnce({ replyText: '1차' })
    .mockResolvedValueOnce({ replyText: '2차 마무리' });

  const { result } = renderHook(() => useReviewSessionScreen());
  await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));

  act(() => result.current.onChangeFreeText('첫 입력'));
  await act(async () => { await result.current.onSubmitFreeText(); });

  act(() => result.current.onChangeFallbackText('두 번째 입력'));
  await act(async () => { await result.current.onSubmitFallback(); });

  const fb = result.current.entries.find((e) => e.kind === 'fallback-input');
  expect(fb).toMatchObject({ interactive: false });
  const lastEntry = result.current.entries[result.current.entries.length - 1];
  expect(lastEntry.kind).toBe('done-cta');

  spy.mockRestore();
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm test -- use-review-session-screen.test.ts
```

Expected: 새 2개 테스트 실패.

- [ ] **Step 3: Task 7의 onSubmitFreeText 수정 + onSubmitFallback 추가**

```ts
// onSubmitFreeText 끝부분 변경
try {
  // ...기존...
  reviewEntries.replaceTypingWithBubble(result.replyText);
  setFallbackTurnsUsed(1);
  reviewEntries.appendEntries([createFallbackInputEntry(2)]);
} catch { /* ... */ }

// 새 핸들러
const onChangeFallbackText = (text: string) => setFallbackText(text);

const onSubmitFallback = async () => {
  const text = fallbackText.trim();
  if (!text || !task) return;

  setFallbackText('');
  reviewEntries.lockInputArea(); // fallback-input도 잠금됨
  reviewEntries.appendEntries([
    createUserBubbleEntry(text),
    createAiTypingEntry(),
  ]);

  chatHistoryRef.current.push({ role: 'user', content: text });

  try {
    const result = await requestReviewFeedback({
      weaknessId: task.weaknessId,
      stepTitle: steps[currentStepIndex].title,
      stepBody: steps[currentStepIndex].body,
      messages: chatHistoryRef.current,
    });
    chatHistoryRef.current.push({ role: 'assistant', content: result.replyText });
    reviewEntries.replaceTypingWithBubble(result.replyText);
    setFallbackTurnsUsed(2);
    const isLast = currentStepIndex === steps.length - 1;
    reviewEntries.appendEntries([
      createDoneCtaEntry(isLast ? '이해했어요, 완료' : '이해했어요, 다음으로'),
    ]);
  } catch {
    reviewEntries.replaceTypingWithBubble('응답이 늦고 있어요. 다시 시도해 주세요.');
  }
};

// 반환에 추가
onChangeFallbackText,
onSubmitFallback,
```

- [ ] **Step 4: 통과 확인**

```bash
npm test -- use-review-session-screen.test.ts
```

Expected: 모든 테스트 통과.

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/hooks/use-review-session-screen.ts features/quiz/hooks/use-review-session-screen.test.ts
git commit -m "feat(review): add fallback-input turn 2 and done-cta after close mode"
```

---

## Task 9: Remedial 노드 진행 — entries 안에서 explain/check 핸들링

기존 `remedial-flow.tsx`가 자체 ScrollView 안에서 처리하던 explain/check 진행을 entries-based로 옮긴다. "다음으로" 누르면 다음 노드 entry append, "모르겠어요" 누르면 secondary 노드 + fallback-input 시퀀스.

**Files:**
- Modify: `features/quiz/hooks/use-review-session-screen.ts`
- Modify: `features/quiz/hooks/use-review-session-screen.test.ts`

- [ ] **Step 1: 테스트 추가**

```ts
it('remedial explain 카드의 primary → 다음 노드 entry 추가, 이전 노드 잠금', async () => {
  const { result } = renderHook(() => useReviewSessionScreen());
  await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));
  const wrongIdx = result.current.steps[0].choices.findIndex((c) => !c.correct);
  await act(async () => { result.current.onSelectChoice(wrongIdx); });

  const firstNode = result.current.entries.find((e) => e.kind === 'remedial-node') as any;
  await act(async () => {
    result.current.onRemedialExplainPrimary(firstNode.node.id);
  });

  const nodes = result.current.entries.filter((e) => e.kind === 'remedial-node');
  expect(nodes.length).toBeGreaterThanOrEqual(2);
  expect(nodes[0]).toMatchObject({ interactive: false });
  expect(nodes[1]).toMatchObject({ interactive: true });
});

it('remedial check option 누르면 다음 노드 진행', async () => {
  // 약점 데이터에 따라 다를 수 있어 약점 fixture를 mock하지 않는 한 skip 가능.
  // 실 데이터로 진행 가능한 약점("formula_understanding")에서만 테스트 실행.
});

it('remedial 노드 진행 중 exit 노드 도달 시 done-cta 추가', async () => {
  // exit 노드까지 step-by-step 진행하는 통합 테스트.
  // 약점 데이터 의존성이 있어, 'formula_understanding' 약점의 가장 짧은 경로로 검증.
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm test -- use-review-session-screen.test.ts
```

Expected: 첫 새 테스트 실패 ("onRemedialExplainPrimary not defined" 또는 핸들러는 있지만 entries에 영향 없음).

- [ ] **Step 3: remedial 핸들러 수정**

기존 `onPressRemedialPrimary` / `onPressRemedialSecondary` / `onPressRemedialChoice` / `onPressRemedialCheckDontKnow` 함수들 안에서 `remedialFlowState`의 entries만 갱신하던 것을 → `reviewEntries`도 함께 갱신하도록 한다.

```ts
// 헬퍼: 다음 노드로 진행
const advanceRemedialToNode = (nextNodeId: string) => {
  if (!task) return;
  reviewEntries.lockRemedialNodes(); // 모든 기존 remedial-node 잠금
  const next = getRemedialNode(task.weaknessId, nextNodeId);
  if (!next || next.kind === 'exit') {
    const isLast = currentStepIndex === steps.length - 1;
    reviewEntries.appendEntries([
      createDoneCtaEntry(isLast ? '이해했어요, 완료' : '이해했어요, 다음으로'),
    ]);
    return;
  }
  reviewEntries.appendEntries([createRemedialNodeEntry(next)]);
};

const onRemedialExplainPrimary = (nodeId: string) => {
  if (!task) return;
  const node = getRemedialNode(task.weaknessId, nodeId);
  if (!node || node.kind !== 'explain') return;
  advanceRemedialToNode(node.primaryNextNodeId);
};

const onRemedialExplainSecondary = (nodeId: string) => {
  if (!task) return;
  const node = getRemedialNode(task.weaknessId, nodeId);
  if (!node || node.kind !== 'explain') return;
  // 모르겠어요 → fallback-input 자유 입력으로 진입 (Phase 2에서 라우터로 대체)
  reviewEntries.lockRemedialNodes();
  reviewEntries.appendEntries([createFallbackInputEntry(1)]);
  setFallbackTurnsUsed(0);
};

const onRemedialCheckOption = (nodeId: string, optionId: string) => {
  if (!task) return;
  const node = getRemedialNode(task.weaknessId, nodeId);
  if (!node || node.kind !== 'check') return;
  const opt = node.options.find((o) => o.id === optionId);
  if (!opt) return;
  reviewEntries.appendEntries([createUserBubbleEntry(opt.text)]);
  advanceRemedialToNode(opt.nextNodeId);
};

const onRemedialCheckDontKnow = (nodeId: string) => {
  if (!task) return;
  const node = getRemedialNode(task.weaknessId, nodeId);
  if (!node || node.kind !== 'check') return;
  reviewEntries.lockRemedialNodes();
  reviewEntries.appendEntries([createFallbackInputEntry(1)]);
  setFallbackTurnsUsed(0);
};

// 반환에 추가
onRemedialExplainPrimary,
onRemedialExplainSecondary,
onRemedialCheckOption,
onRemedialCheckDontKnow,
```

기존 `remedialFlowState` 관련 핸들러는 Task 12에서 제거. 일단 병행.

- [ ] **Step 4: 통과 확인**

```bash
npm test -- use-review-session-screen.test.ts
```

Expected: 모든 테스트 통과 (실 약점 의존성이 있는 테스트는 skip 또는 약점별 fixture 사용).

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/hooks/use-review-session-screen.ts features/quiz/hooks/use-review-session-screen.test.ts
git commit -m "feat(review): drive remedial node progression through entries"
```

---

## Task 10: 화면 통합 — review-session-screen-view 단일 ScrollView 전환

지금까지 entries는 훅에 들어왔지만 화면이 그걸 안 그리고 있다. 이번 task에서 `review-session-screen-view.tsx`를 entries 기반 단일 ScrollView로 바꾼다.

**Files:**
- Modify: `features/quiz/components/review-session-screen-view.tsx`

- [ ] **Step 1: 현재 파일 구조 확인**

```bash
wc -l features/quiz/components/review-session-screen-view.tsx
```

Expected: 약 250–350 라인. 모바일 / 태블릿 분기와 InputSection / RemedialFlow / ChatSection 셋의 분기가 있음.

- [ ] **Step 2: entries 기반 렌더 함수 추가**

파일 상단 import:
```tsx
import { EntryRenderer } from './review-session/entry-renderer';
```

기존 `inputCardContent` 변수 정의 부분 (현재 `stepPhase === 'input' ? ... : ... : ...` 삼항)을 통째로 교체:

```tsx
const entryHandlers = {
  step,
  currentStepIndex,
  totalSteps,
  freeText,
  fallbackText,
  onSelectChoice,
  onChangeFreeText,
  onSubmitFreeText,
  onChangeFallbackText,
  onSubmitFallback,
  onPressDoneCta: onPressNext, // 기존 onPressNext 재사용 — 다음 스텝/완료 핸들러
  onRemedialExplainPrimary,
  onRemedialExplainSecondary,
  onRemedialCheckOption,
  onRemedialCheckDontKnow,
};

const renderedEntries = entries.map((entry, idx) => (
  <EntryRenderer key={`${entry.kind}-${idx}`} entry={entry} {...entryHandlers} />
));
```

기존 모바일 ScrollView 본문에서 `<StepCard ... />`, `<InputSection .../RemedialFlow .../ChatSection .../>` 부분을 `{renderedEntries}` 한 줄로 교체.

태블릿 분기는 `entries`를 두 그룹으로 분할:
```tsx
const leftEntries = entries.filter((e) => e.kind === 'step-card');
const rightEntries = entries.filter((e) => e.kind !== 'step-card');
```

좌측 ScrollView에는 `leftEntries`, 우측에는 `rightEntries` 매핑.

- [ ] **Step 3: 화면 view에 필요한 props 추가**

`ReviewSessionScreenViewProps` 타입에 새 필드 추가:
```ts
entries: ReviewEntry[];
freeText: string;
fallbackText: string;
onChangeFreeText: (t: string) => void;
onSubmitFreeText: () => void;
onChangeFallbackText: (t: string) => void;
onSubmitFallback: () => void;
onRemedialExplainPrimary: (nodeId: string) => void;
onRemedialExplainSecondary: (nodeId: string) => void;
onRemedialCheckOption: (nodeId: string, optionId: string) => void;
onRemedialCheckDontKnow: (nodeId: string) => void;
```

screen.tsx (route file `app/quiz/review-session.tsx`)에서 훅 반환을 그대로 펼쳐 view에 전달:
```tsx
// app/quiz/review-session.tsx
const screen = useReviewSessionScreen();
return <ReviewSessionScreenView {...screen} />;
```

(현재 이미 `{...screen}` 같은 패턴이면 자동으로 전달됨.)

- [ ] **Step 4: 시뮬레이터 검증**

```bash
npx expo prebuild --clean
npx expo run:ios
```

확인 항목:
- 화면 진입 시 StepCard + InputArea(선택지 + 자유 입력) 보임
- 정답 선택 시 choice-bubble + 정답 배너 + "이해했어요, 다음으로" 버튼 등장
- 오답 선택 시 choice-bubble + "다시 한 번" 배너 + 첫 remedial 카드 등장
- 자유 입력 → AI 응답 → 두 번째 입력 카드 → 두 번째 응답 → "이해했어요, 다음으로"
- 위로 스크롤 시 이전 모든 entry 보임

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/components/review-session-screen-view.tsx app/quiz/review-session.tsx
git commit -m "refactor(review): render review session through single ScrollView of entries"
```

---

## Task 11: 자동 스크롤 + 키보드 어색함 처리

새 entry가 append될 때마다 ScrollView를 bottom으로 자동 스크롤. 키보드가 올라올 때 입력창이 가려지지 않도록.

**Files:**
- Modify: `features/quiz/components/review-session-screen-view.tsx`

- [ ] **Step 1: useRef와 autoScrollFlagRef 패턴 도입**

기존 `remedial-flow`가 사용하던 `autoScrollFlagRef` + `onContentSizeChange` 패턴을 전체 ScrollView에 적용.

```tsx
import { useRef } from 'react';
import { ScrollView } from 'react-native';

const scrollRef = useRef<ScrollView | null>(null);
const prevEntryCountRef = useRef(entries.length);

useEffect(() => {
  if (entries.length > prevEntryCountRef.current) {
    // 새 entry 추가됨 → 다음 onContentSizeChange에서 스크롤
    autoScrollFlagRef.current = true;
  }
  prevEntryCountRef.current = entries.length;
}, [entries.length]);

const autoScrollFlagRef = useRef(false);

const handleContentSizeChange = () => {
  if (autoScrollFlagRef.current) {
    autoScrollFlagRef.current = false;
    scrollRef.current?.scrollToEnd({ animated: true });
  }
};

// ScrollView에 ref와 onContentSizeChange 연결
<ScrollView
  ref={scrollRef}
  onContentSizeChange={handleContentSizeChange}
  contentInsetAdjustmentBehavior="automatic"
  // ...
>
```

- [ ] **Step 2: KeyboardAvoidingView로 감싸기**

```tsx
import { KeyboardAvoidingView, Platform } from 'react-native';

return (
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    {/* 기존 screen 컨테이너 */}
  </KeyboardAvoidingView>
);
```

- [ ] **Step 3: 시뮬레이터 검증**

```bash
npx expo run:ios
```

확인:
- 새 entry가 추가될 때 부드럽게 bottom으로 스크롤
- 자유 입력 박스에 포커스 시 키보드 위로 입력창이 충분히 올라옴
- 사용자가 위로 스크롤해서 보고 있는 상태에서 새 entry가 추가돼도 부드럽게 따라감

- [ ] **Step 4: 커밋**

```bash
git add features/quiz/components/review-session-screen-view.tsx
git commit -m "feat(review): auto-scroll on new entry and keyboard avoidance"
```

---

## Task 12: Deprecated 코드 제거 & 정리

Phase 1 동작이 검증되면, 사용되지 않는 옛 코드를 삭제. 기존 훅의 `chatMessages`, `aiResponseCount`, `remedialFlowState` 등도 정리.

**Files:**
- Delete: `features/quiz/components/review-session/chat-section.tsx`
- Delete: `features/quiz/components/review-session/remedial-flow.tsx`
- Delete: `features/quiz/components/review-session/remedial-ai-help-card.tsx`
- Delete: `features/quiz/components/review-session/remedial-ai-help-actions.tsx`
- Delete: `features/quiz/components/review-session/remedial-transition-card.tsx` (사용처가 없다면)
- Delete: `features/quiz/components/review-session/input-section.tsx`
- Delete: `features/quiz/components/review-session/remedial-entries.ts`
- Delete: `features/quiz/components/review-session/remedial-entries.test.ts`
- Modify: `features/quiz/hooks/use-review-session-screen.ts` — 옛 상태/핸들러 제거
- Modify: `features/quiz/components/review-session-screen-view.tsx` — 옛 import 제거
- Modify: `features/quiz/hooks/use-review-session-screen.test.ts` — 옛 테스트 제거

- [ ] **Step 1: 삭제 대상 파일이 어디서도 import되지 않는지 확인**

```bash
grep -rn "chat-section\|remedial-flow\|remedial-ai-help-card\|remedial-ai-help-actions\|input-section\|remedial-entries\|remedial-transition-card" features app --include='*.ts' --include='*.tsx' | grep -v ".test.ts"
```

Expected: entry-renderer는 새 컴포넌트만 import하므로 위 파일들의 reference는 0개여야 한다 (Task 4 이후).

만약 reference가 남아있으면 그 import를 먼저 제거한 후 다음 단계로.

- [ ] **Step 2: 파일 삭제**

```bash
rm features/quiz/components/review-session/chat-section.tsx
rm features/quiz/components/review-session/remedial-flow.tsx
rm features/quiz/components/review-session/remedial-ai-help-card.tsx
rm features/quiz/components/review-session/remedial-ai-help-actions.tsx
rm features/quiz/components/review-session/input-section.tsx
rm features/quiz/components/review-session/remedial-entries.ts
rm features/quiz/components/review-session/remedial-entries.test.ts
# remedial-transition-card는 entry-renderer에서 'transition' kind를 안 다루므로 제거
rm features/quiz/components/review-session/remedial-transition-card.tsx
```

- [ ] **Step 3: 훅의 옛 상태/핸들러 제거**

`use-review-session-screen.ts`에서:
- `chatMessages`, `setChatMessages` 제거
- `chatText`, `setChatText` 제거
- `aiResponseCount`, `setAiResponseCount` 제거
- `remedialFlowState`, `setRemedialFlowState` 제거
- `aiHelpUsedPerStepRef` 제거 (단, analytics에서 사용 중이면 새 이름으로 마이그레이션)
- `onChangeChatText`, `onSendChatMessage` 제거
- `onPressRemedialPrimary`, `onPressRemedialSecondary`, `onPressRemedialChoice`, `onChangeRemedialAiHelpInput`, `onSendRemedialAiHelp`, `onPressRemedialAiHelpAction` 제거
- 관련 타입 정의 (반환 타입 인터페이스에서) 제거

- [ ] **Step 4: 옛 테스트 케이스 제거 또는 마이그레이션**

`use-review-session-screen.test.ts`에서 `aiHelpUsed`, `remedialFlowState`, `aiResponseCount` 등을 직접 검사하는 테스트들을 삭제하거나, 동등한 entries 검사로 마이그레이션.

- [ ] **Step 5: 전체 테스트 + 타입체크**

```bash
npm test
npx tsc --noEmit
```

Expected: 모두 통과.

- [ ] **Step 6: 시뮬레이터 회귀 검증**

```bash
npx expo run:ios
```

전체 시나리오 다시 한 번:
- 정답 / 오답 / 자유입력→1턴 / 자유입력→2턴 / 오답→remedial→"모르겠어요"→fallback / 마지막 스텝 완료

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "refactor(review): remove deprecated chat-section, remedial-flow, and related dead code"
```

---

## Task 13: Analytics 이벤트 마이그레이션 (옵션)

기존 `aiHelpUsedPerStepRef` 가 analytics 이벤트 발화에 쓰였다면 새 entries 모델에서 동등한 이벤트 발화 지점을 매핑. 발화 키는 기존 이름 유지.

**Files:**
- Modify: `features/quiz/hooks/use-review-session-screen.ts`

- [ ] **Step 1: 기존 발화 지점 grep**

```bash
grep -n "trackEvent\|analytics\|logEvent" features/quiz/hooks/use-review-session-screen.ts
```

이벤트 키 목록 파악 (e.g., `review_step_completed`, `review_ai_help_used`).

- [ ] **Step 2: 발화 지점 매핑**

- `onSelectChoice` 정답 → `review_step_completed` (기존 위치 그대로)
- `onSubmitFreeText` 호출 직전 → `review_ai_help_used` (필요 시 turn 메타데이터 추가)
- `onSubmitFallback` 호출 직전 → `review_ai_help_used`

기존 발화 함수가 옛 상태에 의존했다면, entries 기반으로 동등하게 다시 호출.

- [ ] **Step 3: 시뮬레이터에서 Firebase Analytics 디버그뷰 확인** (가능한 경우)

```bash
npx expo run:ios
# 시뮬레이터에서 진행하면서 디버그뷰에 이벤트 도착하는지 확인
```

- [ ] **Step 4: 커밋**

```bash
git add features/quiz/hooks/use-review-session-screen.ts
git commit -m "chore(review): preserve analytics events under new entries model"
```

---

## Task 14: 시각/UX 마무리 & PR 준비

**Files:**
- 다양 (스타일 조정)

- [ ] **Step 1: 다크모드/태블릿 / 키보드 시나리오 회귀**

```bash
npx expo run:ios
```

iPhone / iPad / 다크모드 토글 / 길게 스크롤 / 키보드 띄움 모두 확인.

- [ ] **Step 2: 접근성**

- 모든 Pressable에 `accessibilityRole` / `accessibilityLabel`이 있는지 확인 (Task 2–4에서 이미 추가됨, 누락 점검만)
- `<Text selectable>` — feedback-banner, ai-bubble의 텍스트가 선택 가능한지 확인

- [ ] **Step 3: 진행 알림 + PR**

```bash
npm run notify:start -- "Review session entries refactor — Phase 1"
git push -u origin "$(git symbolic-ref --short HEAD)"
gh pr create --title "feat(review): entries-based session with restored free input" --body "$(cat <<'EOF'
## Summary
- 복습 세션을 entries 누적 단일 ScrollView로 재구성
- 시작 시 선택지 + 자유 입력 동시 노출 (옛 디자인 부활)
- AI 응답은 진단 스타일 아바타 말풍선으로 통일 (DiagnosisChatBubble 재사용)
- 자유 입력 시 review-feedback 백엔드 explore/close 2턴 호출
- 오답 시 기존 remedial-flow 노드를 entries에 흡수해 진행
- deprecated chat-section, remedial-flow, input-section, remedial-ai-help-* 제거

Phase 2 (review-router로 자유 입력을 remedial 노드로 매칭) 는 별도 plan/PR.

## Test plan
- [ ] 정답 / 오답 / 자유입력 1턴 / 자유입력 2턴 / 오답→remedial→모르겠어요→fallback 시나리오
- [ ] 마지막 스텝 완료 후 done view 진입
- [ ] iPad / 다크모드 / 키보드 시나리오
- [ ] Analytics 이벤트 발화 확인

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
npm run notify:done -- "Review session Phase 1 PR opened"
```

---

## 진행 후 다음 단계 (Phase 2 — 별도 plan으로)

본 plan은 entries 인프라까지만. 다음은:
- `data/review-remedial-flows.ts` 노드에 `summary` / `triggers` 메타데이터 추가
- `functions/src/review-router.ts` Cloud Function 작성
- `features/quiz/review-router.ts` 클라이언트 + mock
- 자유 입력 / "모르겠어요" 흐름에서 라우터 우선 호출, 실패 시 폴백 챗 fall-through
- 새 plan 파일: `docs/superpowers/plans/2026-05-12-review-session-routed-chat-phase2.md` (Phase 1 머지 후 작성)

---

## Self-Review

스펙 § 별 task 매핑:

- 스펙 §3 시나리오 A (라우팅 성공) — Phase 2 (이 plan 범위 아님)
- 스펙 §3 시나리오 B (폴백 챗) — Task 7, 8
- 스펙 §3 시나리오 C (정답) — Task 6
- 스펙 §3 시나리오 D (오답 → remedial) — Task 6, 9
- 스펙 §3 시나리오 E (remedial 도중 모르겠어요) — Task 9 (Phase 1 에선 fallback-input으로 진행; Phase 2 에서 라우터로 대체)
- 스펙 §4.1 entry-driven 모델 — Task 1, 5
- 스펙 §4.2 컴포넌트 매핑 — Task 2, 3, 4
- 스펙 §4.3 ScrollView 구조 — Task 10, 11
- 스펙 §4.4 태블릿 — Task 10 (좌/우 분배)
- 스펙 §5 review-router — Phase 2
- 스펙 §6 데이터 & 훅 변경 — Task 5–9, 12, 13
- 스펙 §7 마이그레이션 — Phase 1 단계는 본 plan, Phase 2–4 후속
- 스펙 §8 테스트 — Task 1–9 모든 곳에 TDD 단계
- 스펙 §9 Q1 (짧은 입력) — 결정: 무조건 라우터. Phase 2 plan에서 다룸
- 스펙 §9 Q2 (위쪽 입력 잠금) — Task 6 (lockInputArea)
- 스펙 §9 Q3 (라우팅 중 입력 잠금) — Task 7 (`ai-typing` + 입력 잠금 패턴). Phase 2의 라우터 호출에서도 동일 패턴 적용

타입 / 함수명 일관성:
- `ReviewEntry`, `createXxxEntry`, `lockAllEntries` — Task 1에서 정의
- `useReviewEntries`, `appendEntries`, `resetForStep`, `lockInputArea`, `lockRemedialNodes`, `replaceTypingWithBubble`, `removeLastTyping` — Task 5에서 정의, Task 6–9에서 사용
- `onSubmitFreeText`, `onSubmitFallback`, `onChangeFreeText`, `onChangeFallbackText`, `onRemedialExplainPrimary` 등 — Task 6–10에서 일관 사용
- `freeText` / `fallbackText` 상태 분리 — Task 7, 8
- `chatHistoryRef` — Task 7에서 도입, Task 8에서 push

플레이스홀더 스캔: "TBD" / "TODO" — Task 13의 "필요 시 turn 메타데이터 추가" 정도가 약간 모호하지만, 옵션 task라 허용. 그 외 없음.

# 복습 세션 오답별 보완 학습 흐름 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 복습 세션의 각 오답이 진단 시스템(`detailedDiagnosisFlows.ts`)과 동일한 노드 그래프 패턴으로 자기에게 맞춘 보완 학습 흐름을 거친 뒤 본류로 합류하도록 구현한다.

**Architecture:** `ThinkingStep.choices[].remedialFlowStartNodeId`로 오답별 분기 시작점을 지정하고, `data/review-remedial-flows.ts`(신규)에 약점 단위 노드 그래프(ExplainNode/CheckNode/ExitNode)를 사전 정의한다. 훅(`use-review-session-screen.ts`)의 `StepPhase`에 `'remedial'`을 추가하고 진단 시스템의 `chatEntries` 누적 패턴을 차용한 `remedial-flow.tsx`를 새로 만든다. AI 도움은 "모르겠어요" 클릭의 두 번째 의미(첫 클릭: AI 입력 카드 노출 / 이후 클릭: fallback 노드)로 통합한다.

**Tech Stack:** TypeScript, React Native, Expo, Jest 29 (jest-expo preset), React Native ScrollView, 기존 `Paper` 컬러 토큰

**Reference Spec:** `docs/superpowers/specs/2026-05-09-review-session-remedial-step-design.md`

---

## 파일 구조 / 변경 맵

**신규:**
- `data/review-remedial-flows.ts` — 노드 그래프 타입 + 약점별 매핑 + `getRemedialNode()` 헬퍼
- `data/remedial-flows/formula_understanding.ts` — 시범 약점 콘텐츠 (별도 파일 분리로 다른 약점 PR 충돌 최소화)
- `data/review-remedial-flows.test.ts` — 노드 그래프 무결성 테스트
- `features/quiz/components/review-session/remedial-flow.tsx` — 카드 누적 컨테이너
- `features/quiz/components/review-session/remedial-explain-card.tsx`
- `features/quiz/components/review-session/remedial-check-card.tsx`
- `features/quiz/components/review-session/remedial-ai-help-card.tsx`
- `features/quiz/components/review-session/remedial-ai-help-actions.tsx`
- `features/quiz/components/review-session/remedial-transition-card.tsx`
- `features/quiz/components/review-session/remedial-entries.ts` — `RemedialEntry` 타입 + 헬퍼 생성자 (createBubbleEntry 등)

**수정:**
- `data/review-content-map.ts` — `Choice.remedialFlowStartNodeId?`, `ThinkingStep.id` 추가, 기존 콘텐츠에 id 부여
- `data/review-content-map.test.ts` — id 무결성 + 오답 choice의 remedialFlowStartNodeId 검증
- `features/quiz/review-feedback.ts` — `remedialContext?` 옵션 필드 추가
- `features/quiz/hooks/use-review-session-screen.ts` — phase 'remedial' 추가, 새 상태/핸들러
- `features/quiz/components/review-session-screen-view.tsx` — phase 분기 렌더링

**미사용 처리 (제거하지 않고 보존):**
- `features/quiz/components/review-session/chat-section.tsx` — dead code 유지, 별도 cleanup PR에서 정리

---

## 빌드 순서 / Phase 개요

1. **Phase 1 (Task 1~3)** — 데이터 구조 토대 (타입 + 빈 매핑 + 무결성 테스트). 코드는 컴파일되지만 동작은 변함없음.
2. **Phase 2 (Task 4)** — `review-feedback.ts` 옵션 확장. 후속 AI 도움에서 사용.
3. **Phase 3 (Task 5~6)** — 훅 상태/핸들러 (UI 없이도 단위 테스트로 검증 가능한 로직). entries 누적 로직 포함.
4. **Phase 4 (Task 7~12)** — UI 컴포넌트 6개 (개별 단위 테스트 + 시각적 톤 일치).
5. **Phase 5 (Task 13)** — `review-session-screen-view.tsx`에 phase 분기 통합.
6. **Phase 6 (Task 14)** — 시범 약점 `formula_understanding` 보완 콘텐츠 작성 + e2e 시나리오 검증.
7. **Phase 7 (Task 15)** — 메인 챗 사용 핸들러/상태 deprecation 표시 + 회귀 검증.

---

## Task 1: 데이터 타입 확장 — `Choice` / `ThinkingStep`에 신규 필드

**Files:**
- Modify: `data/review-content-map.ts:3-19`
- Test: `data/review-content-map.test.ts`

- [ ] **Step 1: 기존 테스트 확장 — 모든 ThinkingStep에 id가 있어야 한다는 실패 테스트 추가**

`data/review-content-map.test.ts`에 추가:

```ts
describe('review-content-map 신규 필드', () => {
  it('콘텐츠가 있는 모든 ThinkingStep이 고유한 id를 가진다', () => {
    const allIds: string[] = [];
    for (const weaknessId of weaknessOrder) {
      const steps = getReviewThinkingSteps(weaknessId);
      if (!steps || steps.length === 0) continue;
      for (const step of steps) {
        expect(typeof step.id).toBe('string');
        expect(step.id.length).toBeGreaterThan(0);
        allIds.push(step.id);
      }
    }
    const unique = new Set(allIds);
    expect(unique.size).toBe(allIds.length);
  });

  it('모든 오답 Choice는 remedialFlowStartNodeId를 가진다 (콘텐츠 작성된 약점만 검증)', () => {
    // 콘텐츠 작성된 약점만 검사 (점진 도입 정책)
    const authoredWeaknesses: string[] = ['formula_understanding'];
    for (const weaknessId of authoredWeaknesses) {
      const steps = getReviewThinkingSteps(weaknessId as any);
      for (const step of steps) {
        for (const choice of step.choices) {
          if (!choice.correct) {
            expect(typeof choice.remedialFlowStartNodeId).toBe('string');
            expect(choice.remedialFlowStartNodeId!.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npm test -- data/review-content-map.test.ts`
Expected: FAIL — `step.id`가 undefined / `remedialFlowStartNodeId`가 undefined

- [ ] **Step 3: 타입 정의 변경**

`data/review-content-map.ts` 1-19줄을 다음으로 교체:

```ts
import { diagnosisMap, type WeaknessId } from './diagnosisMap';

export type Choice = {
  text: string;
  correct: boolean;
  feedback: string;
  /** 오답 선택 시 진입할 보완 노드 그래프의 시작 노드 id. 정답 Choice는 없어야 함. */
  remedialFlowStartNodeId?: string;
};

export type ThinkingStep = {
  /** 약점 prefix를 포함한 고유 키. 예: "formula_understanding.step1" */
  id: string;
  title: string;
  body: string;
  example?: string;
  choices: Choice[];
};

type ReviewContent = {
  heroPrompt: string;
  thinkingSteps: ThinkingStep[];
};
```

- [ ] **Step 4: 기존 콘텐츠에 id 부여 (`reviewContentMap` 전체 step에 id 추가)**

`data/review-content-map.ts`의 `reviewContentMap` 객체 안 모든 `thinkingSteps` 배열의 각 step 객체 첫 줄에 `id: '<weaknessId>.step<index+1>'` 추가. 예:

```ts
discriminant_calculation: {
  heroPrompt: '...',
  thinkingSteps: [
    {
      id: 'discriminant_calculation.step1',  // 신규
      title: 'a, b, c 부호 확인',
      // ...
    },
    {
      id: 'discriminant_calculation.step2',  // 신규
      // ...
    },
    // ...
  ],
},
```

**규약:** 모든 약점에 대해 step1, step2, step3 순서대로 1-based 번호.

- [ ] **Step 5: 첫 테스트(id 존재/유일성) 통과 확인**

Run: `npm test -- data/review-content-map.test.ts -t '고유한 id'`
Expected: PASS

(remedialFlowStartNodeId 테스트는 Task 6에서 콘텐츠 작성 시 통과)

- [ ] **Step 6: 타입 체크**

Run: `npm run typecheck`
Expected: PASS (다른 곳에서 `step.id` 참조하지 않으므로 깨지지 않음)

- [ ] **Step 7: 커밋**

```bash
git add data/review-content-map.ts data/review-content-map.test.ts
git commit -m "feat(review): add id to ThinkingStep and remedialFlowStartNodeId to Choice"
```

---

## Task 2: 보완 노드 그래프 타입과 빈 매핑 — `review-remedial-flows.ts`

**Files:**
- Create: `data/review-remedial-flows.ts`
- Create: `data/review-remedial-flows.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`data/review-remedial-flows.test.ts` 신규:

```ts
import { weaknessOrder } from './diagnosisMap';
import {
  getRemedialNode,
  remedialFlows,
  type CheckNode,
  type ExplainNode,
  type ExitNode,
  type RemedialNode,
} from './review-remedial-flows';

describe('review-remedial-flows 무결성', () => {
  it('각 등록된 약점의 모든 노드 nextNodeId 참조가 같은 그래프 안에 존재한다', () => {
    for (const weaknessId of weaknessOrder) {
      const flow = remedialFlows[weaknessId];
      if (!flow) continue;

      const allIds = new Set(Object.keys(flow.nodes));
      for (const [nodeId, node] of Object.entries(flow.nodes)) {
        if (node.kind === 'explain') {
          expect(allIds.has(node.primaryNextNodeId)).toBe(true);
          expect(allIds.has(node.secondaryNextNodeId)).toBe(true);
        } else if (node.kind === 'check') {
          for (const option of node.options) {
            expect(allIds.has(option.nextNodeId)).toBe(true);
          }
          expect(allIds.has(node.dontKnowNextNodeId)).toBe(true);
        }
      }
    }
  });

  it('각 등록된 약점에 정확히 하나 이상의 ExitNode가 있다', () => {
    for (const weaknessId of weaknessOrder) {
      const flow = remedialFlows[weaknessId];
      if (!flow) continue;
      const exitNodes = Object.values(flow.nodes).filter((n) => n.kind === 'exit');
      expect(exitNodes.length).toBeGreaterThan(0);
    }
  });

  it('getRemedialNode가 등록된 노드를 반환한다', () => {
    expect(getRemedialNode('formula_understanding' as any, 'nonexistent')).toBeUndefined();
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npm test -- data/review-remedial-flows.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: `review-remedial-flows.ts` 작성**

`data/review-remedial-flows.ts` 신규:

```ts
import type { WeaknessId } from './diagnosisMap';

export type ExplainNode = {
  id: string;
  kind: 'explain';
  title: string;
  body: string;
  primaryLabel: '다음으로';
  primaryNextNodeId: string;
  secondaryLabel: '모르겠어요';
  secondaryNextNodeId: string;
};

export type CheckNode = {
  id: string;
  kind: 'check';
  title: string;
  prompt: string;
  options: ReadonlyArray<{
    id: string;
    text: string;
    isCorrect: boolean;
    nextNodeId: string;
  }>;
  dontKnowNextNodeId: string;
};

export type ExitNode = {
  id: string;
  kind: 'exit';
};

export type RemedialNode = ExplainNode | CheckNode | ExitNode;

export type RemedialFlow = {
  nodes: Record<string, RemedialNode>;
};

export const remedialFlows: Partial<Record<WeaknessId, RemedialFlow>> = {};

export function getRemedialNode(
  weaknessId: WeaknessId,
  nodeId: string,
): RemedialNode | undefined {
  return remedialFlows[weaknessId]?.nodes[nodeId];
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- data/review-remedial-flows.test.ts`
Expected: PASS (등록된 flow가 없으므로 무결성 검사는 vacuously true, `getRemedialNode` 미정의 케이스 통과)

- [ ] **Step 5: 타입 체크**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add data/review-remedial-flows.ts data/review-remedial-flows.test.ts
git commit -m "feat(review): add remedial node graph types and empty flow map"
```

---

## Task 3: `RemedialEntry` 타입 + 헬퍼 함수

**Files:**
- Create: `features/quiz/components/review-session/remedial-entries.ts`
- Create: `features/quiz/components/review-session/remedial-entries.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`features/quiz/components/review-session/remedial-entries.test.ts` 신규:

```ts
import {
  createNodeEntry,
  createUserBubbleEntry,
  createAiHelpInputEntry,
  createAiBubbleEntry,
  createAiHelpActionsEntry,
  createTransitionEntry,
  lockAllEntries,
} from './remedial-entries';

describe('remedial-entries 헬퍼', () => {
  it('createNodeEntry는 interactive=true로 시작한다', () => {
    const e = createNodeEntry('explain', { id: 'a', kind: 'explain' } as any);
    expect(e.kind).toBe('node');
    expect(e.interactive).toBe(true);
  });

  it('lockAllEntries는 모든 entry의 interactive를 false로 만든다', () => {
    const entries = [createNodeEntry('explain', { id: 'a' } as any)];
    const locked = lockAllEntries(entries);
    expect(locked[0].interactive).toBe(false);
  });

  it('createAiHelpActionsEntry는 두 액션을 가진다', () => {
    const e = createAiHelpActionsEntry('explain');
    expect(e.kind).toBe('ai-help-actions');
    expect(e.actions).toEqual(['continue', 'fallback']);
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npm test -- features/quiz/components/review-session/remedial-entries.test.ts`
Expected: FAIL

- [ ] **Step 3: 구현**

`features/quiz/components/review-session/remedial-entries.ts` 신규:

```ts
import type { RemedialNode } from '@/data/review-remedial-flows';

export type RemedialEntry =
  | { kind: 'node'; interactive: boolean; payload: RemedialNode }
  | { kind: 'user-bubble'; interactive: false; text: string }
  | { kind: 'ai-help-input'; interactive: boolean; nodeId: string; nodeKind: 'explain' | 'check' }
  | { kind: 'ai-bubble'; interactive: false; text: string }
  | { kind: 'ai-help-actions'; interactive: boolean; sourceNodeKind: 'explain' | 'check'; actions: ['continue', 'fallback'] }
  | { kind: 'transition'; interactive: false; text: string };

export function createNodeEntry(
  _nodeKind: RemedialNode['kind'],
  payload: RemedialNode,
): Extract<RemedialEntry, { kind: 'node' }> {
  return { kind: 'node', interactive: true, payload };
}

export function createUserBubbleEntry(text: string): Extract<RemedialEntry, { kind: 'user-bubble' }> {
  return { kind: 'user-bubble', interactive: false, text };
}

export function createAiHelpInputEntry(
  nodeId: string,
  nodeKind: 'explain' | 'check',
): Extract<RemedialEntry, { kind: 'ai-help-input' }> {
  return { kind: 'ai-help-input', interactive: true, nodeId, nodeKind };
}

export function createAiBubbleEntry(text: string): Extract<RemedialEntry, { kind: 'ai-bubble' }> {
  return { kind: 'ai-bubble', interactive: false, text };
}

export function createAiHelpActionsEntry(
  sourceNodeKind: 'explain' | 'check',
): Extract<RemedialEntry, { kind: 'ai-help-actions' }> {
  return { kind: 'ai-help-actions', interactive: true, sourceNodeKind, actions: ['continue', 'fallback'] };
}

export function createTransitionEntry(text: string): Extract<RemedialEntry, { kind: 'transition' }> {
  return { kind: 'transition', interactive: false, text };
}

export function lockAllEntries(entries: readonly RemedialEntry[]): RemedialEntry[] {
  return entries.map((e) => ({ ...e, interactive: false }) as RemedialEntry);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- features/quiz/components/review-session/remedial-entries.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: 타입 체크**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add features/quiz/components/review-session/remedial-entries.ts features/quiz/components/review-session/remedial-entries.test.ts
git commit -m "feat(review): add RemedialEntry types and helper constructors"
```

---

## Task 4: `requestReviewFeedback`에 `remedialContext` 옵션 추가

**Files:**
- Modify: `features/quiz/review-feedback.ts`

- [ ] **Step 1: 현재 인터페이스 파악**

Run: `grep -n "type\|export\|interface" features/quiz/review-feedback.ts | head -10`

요청 타입의 정확한 export 이름과 위치를 확인.

- [ ] **Step 2: 요청 페이로드에 `remedialContext` 옵션 추가**

`features/quiz/review-feedback.ts`의 요청 객체 타입(보통 `RequestReviewFeedbackInput` 또는 inline 객체)에 다음 필드 추가:

```ts
remedialContext?: {
  nodeId: string;
  nodeKind: 'explain' | 'check';
  nodeTitle: string;
  nodeBody?: string;
  nodePrompt?: string;
  nodeOptions?: ReadonlyArray<string>;
};
```

그리고 함수 본문에서 fetch body에 포함하도록 추가:

```ts
body: JSON.stringify({
  // ... 기존 필드들
  remedialContext: input.remedialContext,
}),
```

- [ ] **Step 3: 타입 체크**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: 기존 호출처가 깨지지 않는지 확인 (optional 필드라 자동 통과)**

Run: `grep -rn "requestReviewFeedback(" features/ --include="*.ts" --include="*.tsx" | head`
모든 호출이 새 optional 필드 없이도 동작하는지 시각 확인.

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/review-feedback.ts
git commit -m "feat(review): add optional remedialContext to requestReviewFeedback"
```

---

## Task 5: 훅 — `remedialFlowState` 상태 + 핸들러 골격

**Files:**
- Modify: `features/quiz/hooks/use-review-session-screen.ts`

본 Task는 UI 통합 전 훅의 상태/액션을 먼저 만든다. Task 6에서 e2e 단위 테스트 작성.

- [ ] **Step 1: import 추가**

`features/quiz/hooks/use-review-session-screen.ts` 상단:

```ts
import type { WeaknessId } from '@/data/diagnosisMap';
import {
  getRemedialNode,
  type RemedialNode,
} from '@/data/review-remedial-flows';
import {
  createAiBubbleEntry,
  createAiHelpActionsEntry,
  createAiHelpInputEntry,
  createNodeEntry,
  createTransitionEntry,
  createUserBubbleEntry,
  lockAllEntries,
  type RemedialEntry,
} from '@/features/quiz/components/review-session/remedial-entries';
```

- [ ] **Step 2: `StepPhase` 타입 확장**

기존:
```ts
type StepPhase = 'input' | 'chat';
```
변경:
```ts
type StepPhase = 'input' | 'chat' | 'remedial';
```

(`'chat'`은 보존하되 본 spec에서는 진입 경로 제거. cleanup PR에서 제거 예정.)

- [ ] **Step 3: 신규 상태 추가**

`useState` 블록에 추가:

```ts
const [remedialFlowState, setRemedialFlowState] = useState<{
  weaknessId: WeaknessId;
  currentNodeId: string;
  entries: RemedialEntry[];
  aiHelpUsed: boolean;
  aiHelpState: { nodeId: string; input: string; isLoading: boolean; error: string } | null;
} | null>(null);

// 약점 분석 데이터 캡처용 ref
const firstAttemptChoiceIndexRef = useRef<(number | null)[]>([]);
const aiHelpUsedPerStepRef = useRef<boolean[]>([]);
const wrongAttemptsPerStepRef = useRef<number[]>([]);
```

- [ ] **Step 4: task 로드 시 ref 초기화**

기존 `firstAttemptCorrectRef.current = new Array(...).fill(null)` 옆에 추가:

```ts
firstAttemptChoiceIndexRef.current = new Array(steps.length).fill(null);
aiHelpUsedPerStepRef.current = new Array(steps.length).fill(false);
wrongAttemptsPerStepRef.current = new Array(steps.length).fill(0);
```

(두 군데 — `__mock__` 분기와 실제 store 로드 분기 모두 갱신)

- [ ] **Step 5: `onSelectChoice` 확장 — `firstSelectedIndex` 기록**

```ts
const onSelectChoice = (index: number) => {
  setSelectedChoiceIndex(index);
  const choice = steps[currentStepIndex]?.choices[index];
  setSelectedChoiceFeedback(choice?.feedback ?? null);
  if (stepPhase === 'input' && firstAttemptCorrectRef.current[currentStepIndex] === null) {
    const isCorrect = choice?.correct ?? false;
    firstAttemptCorrectRef.current[currentStepIndex] = isCorrect;
    firstAttemptChoiceIndexRef.current[currentStepIndex] = index;   // 신규
  }
};
```

- [ ] **Step 6: `onPressNext` 재작성**

기존 함수를 다음으로 완전히 교체:

```ts
const onPressNext = () => {
  const step = steps[currentStepIndex];
  if (!step || !task) return;

  const choiceIndex = selectedChoiceIndex;
  if (choiceIndex === null) return;
  const choice = step.choices[choiceIndex];
  if (!choice) return;

  if (choice.correct) {
    // 정답: 메인 챗 진입 없이 바로 다음 step
    onPressContinue();
    return;
  }

  if (!choice.remedialFlowStartNodeId) {
    // 오답인데 보완 정의 없음 → fallback
    console.warn(`Choice index ${choiceIndex} of step ${step.id} has no remedialFlowStartNodeId`);
    onPressContinue();
    return;
  }

  const startNode = getRemedialNode(task.weaknessId, choice.remedialFlowStartNodeId);
  if (!startNode) {
    console.warn(`Remedial node not found: ${choice.remedialFlowStartNodeId}`);
    onPressContinue();
    return;
  }

  setStepPhase('remedial');
  setRemedialFlowState({
    weaknessId: task.weaknessId,
    currentNodeId: startNode.id,
    entries: [createNodeEntry(startNode.kind, startNode)],
    aiHelpUsed: false,
    aiHelpState: null,
  });
};
```

- [ ] **Step 7: 보완 진행 핸들러 추가**

```ts
const appendEntries = (...newEntries: RemedialEntry[]) => {
  setRemedialFlowState((prev) => {
    if (!prev) return prev;
    return {
      ...prev,
      entries: [...lockAllEntries(prev.entries), ...newEntries],
    };
  });
};

const advanceToNode = (nodeId: string) => {
  if (!task) return;
  const node = getRemedialNode(task.weaknessId, nodeId);
  if (!node) {
    console.warn(`Remedial node not found: ${nodeId}`);
    onPressContinue();
    return;
  }
  if (node.kind === 'exit') {
    // ExitNode 도달 → 짧은 전환 안내 후 다음 step
    appendEntries(createTransitionEntry('이해 잘 되셨네요. 다음으로 가요.'));
    // 0ms timeout으로 transition 카드가 한 프레임 그려진 뒤 step 이동
    setTimeout(() => onPressContinue(), 600);
    return;
  }
  appendEntries(createNodeEntry(node.kind, node));
  setRemedialFlowState((prev) => (prev ? { ...prev, currentNodeId: node.id } : prev));
};

const onPressRemedialPrimary = (nodeId: string) => {
  if (!task) return;
  const node = getRemedialNode(task.weaknessId, nodeId);
  if (!node || node.kind !== 'explain') return;
  advanceToNode(node.primaryNextNodeId);
};

const onPressRemedialSecondary = (nodeId: string) => {
  if (!task || !remedialFlowState) return;
  const node = getRemedialNode(task.weaknessId, nodeId);
  if (!node) return;

  const fallbackId = node.kind === 'explain' ? node.secondaryNextNodeId
                    : node.kind === 'check' ? node.dontKnowNextNodeId
                    : null;
  if (!fallbackId) return;

  if (remedialFlowState.aiHelpUsed) {
    // 두 번째 이후 → AI 안 띄움, fallback
    appendEntries(createUserBubbleEntry('모르겠어요'));
    advanceToNode(fallbackId);
    return;
  }

  // 첫 번째 → AI 입력 카드 노출
  appendEntries(
    createUserBubbleEntry('모르겠어요'),
    createAiHelpInputEntry(node.id, node.kind === 'explain' ? 'explain' : 'check'),
  );
  setRemedialFlowState((prev) => prev ? {
    ...prev,
    aiHelpUsed: true,
    aiHelpState: { nodeId: node.id, input: '', isLoading: false, error: '' },
  } : prev);
  aiHelpUsedPerStepRef.current[currentStepIndex] = true;
};

const onPressRemedialChoice = (nodeId: string, optionId: string) => {
  if (!task) return;
  const node = getRemedialNode(task.weaknessId, nodeId);
  if (!node || node.kind !== 'check') return;
  const option = node.options.find((o) => o.id === optionId);
  if (!option) return;
  if (!option.isCorrect) {
    wrongAttemptsPerStepRef.current[currentStepIndex] += 1;
  }
  advanceToNode(option.nextNodeId);
};

const onChangeRemedialAiHelpInput = (text: string) => {
  setRemedialFlowState((prev) => prev && prev.aiHelpState ? {
    ...prev,
    aiHelpState: { ...prev.aiHelpState, input: text, error: '' },
  } : prev);
};

const onSendRemedialAiHelp = async () => {
  const state = remedialFlowState;
  if (!state || !state.aiHelpState || !task) return;
  const input = state.aiHelpState.input.trim();
  if (!input || state.aiHelpState.isLoading) return;

  const node = getRemedialNode(state.weaknessId, state.aiHelpState.nodeId);
  if (!node || node.kind === 'exit') return;

  setRemedialFlowState((prev) => prev && prev.aiHelpState ? {
    ...prev,
    aiHelpState: { ...prev.aiHelpState, isLoading: true, error: '' },
  } : prev);

  try {
    const result = await requestReviewFeedback({
      weaknessId: task.weaknessId,
      stepTitle: steps[currentStepIndex].title,
      stepBody: steps[currentStepIndex].body,
      selectedChoiceText: selectedChoiceIndex !== null
        ? steps[currentStepIndex].choices[selectedChoiceIndex]?.text
        : undefined,
      selectedChoiceCorrect: selectedChoiceIndex !== null
        ? steps[currentStepIndex].choices[selectedChoiceIndex]?.correct
        : undefined,
      messages: [{ role: 'user', content: input }],
      remedialContext: {
        nodeId: node.id,
        nodeKind: node.kind,
        nodeTitle: node.title,
        nodeBody: node.kind === 'explain' ? node.body : undefined,
        nodePrompt: node.kind === 'check' ? node.prompt : undefined,
        nodeOptions: node.kind === 'check' ? node.options.map((o) => o.text) : undefined,
      },
    });

    appendEntries(
      createUserBubbleEntry(input),
      createAiBubbleEntry(result.replyText),
      createAiHelpActionsEntry(node.kind === 'explain' ? 'explain' : 'check'),
    );
    setRemedialFlowState((prev) => prev ? { ...prev, aiHelpState: null } : prev);
  } catch (error) {
    setRemedialFlowState((prev) => prev && prev.aiHelpState ? {
      ...prev,
      aiHelpState: {
        ...prev.aiHelpState,
        isLoading: false,
        error: '응답이 조금 늦고 있어요. 다시 시도하거나 더 쉬운 설명으로 이어갈 수 있어요.',
      },
    } : prev);
  }
};

const onPressRemedialAiHelpAction = (action: 'continue' | 'fallback') => {
  if (!task || !remedialFlowState) return;
  const node = getRemedialNode(task.weaknessId, remedialFlowState.currentNodeId);
  if (!node) return;

  if (action === 'continue') {
    if (node.kind === 'explain') {
      advanceToNode(node.primaryNextNodeId);
    } else if (node.kind === 'check') {
      // CheckNode 재활성화 — 같은 노드를 다시 entry로 추가
      appendEntries(createNodeEntry('check', node));
    }
  } else if (action === 'fallback') {
    const fallbackId = node.kind === 'explain' ? node.secondaryNextNodeId
                      : node.kind === 'check' ? node.dontKnowNextNodeId
                      : null;
    if (fallbackId) advanceToNode(fallbackId);
  }
};
```

- [ ] **Step 8: `onPressContinue` 보완 상태 리셋**

기존 함수에 한 줄 추가:

```ts
const onPressContinue = () => {
  if (!task || steps.length === 0) return;
  const nextIndex = currentStepIndex + 1;
  if (nextIndex >= steps.length) {
    setSessionComplete(true);
  } else {
    setCurrentStepIndex(nextIndex);
    resetStepState();
    setRemedialFlowState(null);     // 신규
  }
};
```

- [ ] **Step 9: 반환 객체에 신규 핸들러/상태 추가**

`UseReviewSessionScreenResult` 타입과 return 객체에:

```ts
// 타입에 추가
remedialFlowState: {
  weaknessId: WeaknessId;
  currentNodeId: string;
  entries: RemedialEntry[];
  aiHelpUsed: boolean;
  aiHelpState: { nodeId: string; input: string; isLoading: boolean; error: string } | null;
} | null;
onPressRemedialPrimary: (nodeId: string) => void;
onPressRemedialSecondary: (nodeId: string) => void;
onPressRemedialChoice: (nodeId: string, optionId: string) => void;
onChangeRemedialAiHelpInput: (text: string) => void;
onSendRemedialAiHelp: () => void;
onPressRemedialAiHelpAction: (action: 'continue' | 'fallback') => void;
```

- [ ] **Step 10: 타입 체크**

Run: `npm run typecheck`
Expected: PASS — 호출처(`review-session-screen-view.tsx`)가 새 필드를 안 쓰므로 컴파일 통과해야 한다. 안 되면 view에서 destructuring 누락 추가.

- [ ] **Step 11: 커밋**

```bash
git add features/quiz/hooks/use-review-session-screen.ts
git commit -m "feat(review): add remedial flow state and handlers to session hook"
```

---

## Task 6: 훅 단위 테스트 — 진입 / 분기 / fallback 시나리오

**Files:**
- Create: `features/quiz/hooks/use-review-session-screen.test.ts`

- [ ] **Step 1: 테스트 작성**

```ts
import { act, renderHook, waitFor } from '@testing-library/react-native';
// (테스트 환경에 따라 react-hooks-testing-library 또는 jest-expo native 구성 필요)

// 본 테스트는 통합 mocking이 복잡하므로 다음 시나리오를 커버한다:
// 1. 정답 선택 → onPressNext → 보완 진입하지 않음 (entries 빈 상태 유지)
// 2. 오답 선택 + remedial 정의 있음 → entries에 시작 노드 추가
// 3. ExplainNode "다음으로" → 다음 노드 추가
// 4. ExplainNode "모르겠어요" 첫 번째 → AI 입력 카드 등장 + aiHelpUsed=true
// 5. "모르겠어요" 두 번째 (aiHelpUsed=true) → fallback 노드로 진행, AI 안 띄움
// 6. CheckNode 정답 → ExitNode → onPressContinue 호출

// 통합 mocking 복잡도로 인해, 실용적 단위 테스트는 헬퍼 함수 단위로 분리한다:
// `advanceToNode`, `onPressRemedialSecondary`의 분기 결정 등을 순수 함수로 추출 가능하면
// 추출 후 테스트. 그렇지 않으면 e2e (Task 14)에 의존.

describe.skip('use-review-session-screen 보완 흐름 (통합)', () => {
  it.todo('정답 선택 시 보완 phase에 진입하지 않는다');
  it.todo('오답 선택 + remedial 정의 있음 시 remedial phase로 전환되고 시작 노드 entry가 추가된다');
  it.todo('ExplainNode "다음으로"가 primaryNextNodeId 노드를 추가한다');
  it.todo('"모르겠어요" 첫 클릭이 AI 입력 카드를 추가하고 aiHelpUsed를 true로 만든다');
  it.todo('aiHelpUsed=true 상태에서 "모르겠어요" 클릭이 AI 없이 fallback 노드로 진행한다');
  it.todo('CheckNode 정답이 ExitNode 경유 후 다음 step으로 이동한다');
});
```

**참고:** 본 프로젝트에 hook 단위 테스트 인프라가 셋업되어 있지 않다면 본 task의 통합 테스트는 e2e(Task 14)에 위임하고 `.skip`을 유지한다. 단위 테스트가 가능한 환경이면 todos를 실제 테스트로 채운다.

- [ ] **Step 2: 우선 컴파일 / lint 통과 확인**

Run: `npm test -- features/quiz/hooks/use-review-session-screen.test.ts`
Expected: PASS (모든 it.todo는 todo로 표시되어 통과)

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/hooks/use-review-session-screen.test.ts
git commit -m "test(review): scaffold remedial flow hook tests (todos)"
```

---

## Task 7: `remedial-transition-card.tsx` (가장 단순한 카드부터)

**Files:**
- Create: `features/quiz/components/review-session/remedial-transition-card.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Paper } from './paper-tokens';

type Props = { text: string };

export function RemedialTransitionCard({ text }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Paper.forest100,
    borderColor: Paper.forest300,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 8,
    alignItems: 'center',
  },
  text: {
    color: Paper.forest700,
    fontSize: 13,
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: 타입 체크**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/components/review-session/remedial-transition-card.tsx
git commit -m "feat(review): add RemedialTransitionCard component"
```

---

## Task 8: `remedial-explain-card.tsx`

**Files:**
- Create: `features/quiz/components/review-session/remedial-explain-card.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ExplainNode } from '@/data/review-remedial-flows';
import { Paper } from './paper-tokens';

type Props = {
  node: ExplainNode;
  interactive: boolean;
  onPressPrimary: () => void;
  onPressSecondary: () => void;
};

export function RemedialExplainCard({ node, interactive, onPressPrimary, onPressSecondary }: Props) {
  return (
    <View style={[styles.card, !interactive && styles.locked]}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>💡 잠깐 짚고 가요</Text>
      </View>
      <Text style={styles.title}>{node.title}</Text>
      <Text style={styles.body}>{node.body}</Text>
      <View style={styles.actions}>
        <Pressable
          style={[styles.primaryBtn, !interactive && styles.btnDisabled]}
          onPress={onPressPrimary}
          disabled={!interactive}
          accessibilityRole="button"
          accessibilityLabel={node.primaryLabel}>
          <Text style={styles.primaryBtnText}>{node.primaryLabel}</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryBtn, !interactive && styles.btnDisabled]}
          onPress={onPressSecondary}
          disabled={!interactive}
          accessibilityRole="button"
          accessibilityLabel={node.secondaryLabel}>
          <Text style={styles.secondaryBtnText}>{node.secondaryLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Paper.cream,
    borderColor: Paper.edge,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginVertical: 8,
  },
  locked: { opacity: 0.55 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Paper.honeyTape,
    borderColor: Paper.honeyTapeBorder,
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 99,
    marginBottom: 10,
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: Paper.ink },
  title: { fontSize: 15, fontWeight: '700', color: Paper.ink, marginBottom: 6 },
  body: { fontSize: 13, color: Paper.inkSoft, lineHeight: 20, marginBottom: 14 },
  actions: { flexDirection: 'row', gap: 8 },
  primaryBtn: {
    flex: 2,
    backgroundColor: Paper.forest800,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: { color: Paper.paper, fontSize: 13, fontWeight: '600' },
  secondaryBtn: {
    flex: 1,
    backgroundColor: Paper.paper,
    borderColor: Paper.forest800,
    borderWidth: 1.5,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryBtnText: { color: Paper.forest800, fontSize: 13, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
});
```

- [ ] **Step 2: 타입 체크**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/components/review-session/remedial-explain-card.tsx
git commit -m "feat(review): add RemedialExplainCard component"
```

---

## Task 9: `remedial-check-card.tsx`

**Files:**
- Create: `features/quiz/components/review-session/remedial-check-card.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CheckNode } from '@/data/review-remedial-flows';
import { Paper } from './paper-tokens';

type Props = {
  node: CheckNode;
  interactive: boolean;
  onPressOption: (optionId: string) => void;
  onPressDontKnow: () => void;
};

export function RemedialCheckCard({ node, interactive, onPressOption, onPressDontKnow }: Props) {
  const [pickedId, setPickedId] = useState<string | null>(null);

  const handlePick = (optionId: string) => {
    if (!interactive) return;
    setPickedId(optionId);
    onPressOption(optionId);
  };

  return (
    <View style={[styles.card, !interactive && styles.locked]}>
      <Text style={styles.title}>{node.title}</Text>
      <Text style={styles.prompt}>{node.prompt}</Text>
      <View style={styles.options}>
        {node.options.map((option) => {
          const isPicked = pickedId === option.id;
          return (
            <Pressable
              key={option.id}
              style={[
                styles.option,
                isPicked && (option.isCorrect ? styles.optionCorrect : styles.optionWrong),
                !interactive && styles.btnDisabled,
              ]}
              onPress={() => handlePick(option.id)}
              disabled={!interactive}
              accessibilityRole="button"
              accessibilityLabel={option.text}>
              <Text style={styles.optionText}>{option.text}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        style={[styles.dontKnow, !interactive && styles.btnDisabled]}
        onPress={onPressDontKnow}
        disabled={!interactive}
        accessibilityRole="button"
        accessibilityLabel="모르겠어요">
        <Text style={styles.dontKnowText}>모르겠어요</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Paper.paper,
    borderColor: Paper.edge,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginVertical: 8,
  },
  locked: { opacity: 0.55 },
  title: { fontSize: 13, fontWeight: '700', color: Paper.inkSoft, marginBottom: 6 },
  prompt: { fontSize: 14, color: Paper.ink, lineHeight: 21, marginBottom: 12 },
  options: { gap: 8, marginBottom: 12 },
  option: {
    backgroundColor: Paper.paper,
    borderColor: Paper.edge,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  optionCorrect: { borderColor: Paper.forest500, backgroundColor: Paper.forest100, borderWidth: 2 },
  optionWrong: { borderColor: Paper.rust, backgroundColor: Paper.rustSoft, borderWidth: 2 },
  optionText: { fontSize: 13, color: Paper.ink, fontWeight: '500' },
  dontKnow: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 10 },
  dontKnowText: { fontSize: 12, color: Paper.inkMute, textDecorationLine: 'underline' },
  btnDisabled: { opacity: 0.5 },
});
```

- [ ] **Step 2: 타입 체크**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/components/review-session/remedial-check-card.tsx
git commit -m "feat(review): add RemedialCheckCard component"
```

---

## Task 10: `remedial-ai-help-card.tsx` (AI 입력 카드)

**Files:**
- Create: `features/quiz/components/review-session/remedial-ai-help-card.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Paper } from './paper-tokens';

type Props = {
  input: string;
  isLoading: boolean;
  error: string;
  interactive: boolean;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
};

export function RemedialAiHelpCard({
  input,
  isLoading,
  error,
  interactive,
  onChangeText,
  onSubmit,
}: Props) {
  const canSubmit = interactive && !isLoading && input.trim().length > 0;
  return (
    <View style={[styles.card, !interactive && styles.locked]}>
      <Text style={styles.label}>AI에게 물어보기</Text>
      <TextInput
        style={styles.input}
        value={input}
        onChangeText={onChangeText}
        editable={interactive && !isLoading}
        placeholder="궁금한 점을 짧게 적어주세요"
        placeholderTextColor={Paper.inkFaint}
        multiline
        returnKeyType="send"
        onSubmitEditing={onSubmit}
      />
      {error.length > 0 ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        style={[styles.submitBtn, !canSubmit && styles.btnDisabled]}
        onPress={onSubmit}
        disabled={!canSubmit}
        accessibilityRole="button"
        accessibilityLabel="질문 전송">
        {isLoading ? (
          <ActivityIndicator color={Paper.paper} />
        ) : (
          <Text style={styles.submitBtnText}>전송</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Paper.paper,
    borderColor: Paper.honey,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginVertical: 8,
  },
  locked: { opacity: 0.55 },
  label: {
    fontSize: 11,
    color: Paper.inkMute,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Paper.cream,
    borderColor: Paper.edge,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: Paper.ink,
    minHeight: 64,
    marginBottom: 10,
  },
  error: { fontSize: 12, color: Paper.rustDeep, marginBottom: 8 },
  submitBtn: {
    backgroundColor: Paper.forest800,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitBtnText: { color: Paper.paper, fontSize: 13, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
});
```

- [ ] **Step 2: 타입 체크**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/components/review-session/remedial-ai-help-card.tsx
git commit -m "feat(review): add RemedialAiHelpCard component"
```

---

## Task 11: `remedial-ai-help-actions.tsx` (AI 응답 후 후속 액션)

**Files:**
- Create: `features/quiz/components/review-session/remedial-ai-help-actions.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Paper } from './paper-tokens';

type Props = {
  interactive: boolean;
  onContinue: () => void;
  onFallback: () => void;
};

export function RemedialAiHelpActions({ interactive, onContinue, onFallback }: Props) {
  return (
    <View style={[styles.card, !interactive && styles.locked]}>
      <Text style={styles.label}>이제 어떻게 하시겠어요?</Text>
      <View style={styles.row}>
        <Pressable
          style={[styles.primaryBtn, !interactive && styles.btnDisabled]}
          onPress={onContinue}
          disabled={!interactive}
          accessibilityRole="button"
          accessibilityLabel="다시 풀어볼게요">
          <Text style={styles.primaryBtnText}>다시 풀어볼게요</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryBtn, !interactive && styles.btnDisabled]}
          onPress={onFallback}
          disabled={!interactive}
          accessibilityRole="button"
          accessibilityLabel="여전히 모르겠어요">
          <Text style={styles.secondaryBtnText}>여전히 모르겠어요</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Paper.cream,
    borderColor: Paper.edge,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  locked: { opacity: 0.55 },
  label: { fontSize: 12, color: Paper.inkMute, marginBottom: 10, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8 },
  primaryBtn: {
    flex: 2,
    backgroundColor: Paper.forest800,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: { color: Paper.paper, fontSize: 13, fontWeight: '600' },
  secondaryBtn: {
    flex: 1,
    backgroundColor: Paper.paper,
    borderColor: Paper.forest800,
    borderWidth: 1.5,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryBtnText: { color: Paper.forest800, fontSize: 12, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
});
```

- [ ] **Step 2: 타입 체크 + 커밋**

```bash
npm run typecheck
git add features/quiz/components/review-session/remedial-ai-help-actions.tsx
git commit -m "feat(review): add RemedialAiHelpActions component"
```

---

## Task 12: `remedial-flow.tsx` 컨테이너 (entries 렌더링 + 자동 스크롤)

**Files:**
- Create: `features/quiz/components/review-session/remedial-flow.tsx`

- [ ] **Step 1: 컨테이너 작성**

```tsx
import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Paper } from './paper-tokens';
import { RemedialExplainCard } from './remedial-explain-card';
import { RemedialCheckCard } from './remedial-check-card';
import { RemedialAiHelpCard } from './remedial-ai-help-card';
import { RemedialAiHelpActions } from './remedial-ai-help-actions';
import { RemedialTransitionCard } from './remedial-transition-card';
import type { RemedialEntry } from './remedial-entries';

type Props = {
  entries: readonly RemedialEntry[];
  aiHelpInput: string;
  aiHelpLoading: boolean;
  aiHelpError: string;
  onPressExplainPrimary: (nodeId: string) => void;
  onPressExplainSecondary: (nodeId: string) => void;
  onPressCheckOption: (nodeId: string, optionId: string) => void;
  onPressCheckDontKnow: (nodeId: string) => void;
  onChangeAiHelpInput: (text: string) => void;
  onSubmitAiHelp: () => void;
  onPressAiHelpAction: (action: 'continue' | 'fallback') => void;
};

export function RemedialFlow(props: Props) {
  const {
    entries,
    aiHelpInput,
    aiHelpLoading,
    aiHelpError,
    onPressExplainPrimary,
    onPressExplainSecondary,
    onPressCheckOption,
    onPressCheckDontKnow,
    onChangeAiHelpInput,
    onSubmitAiHelp,
    onPressAiHelpAction,
  } = props;

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [entries.length]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      {entries.map((entry, index) => {
        switch (entry.kind) {
          case 'node':
            if (entry.payload.kind === 'explain') {
              return (
                <RemedialExplainCard
                  key={`explain-${index}`}
                  node={entry.payload}
                  interactive={entry.interactive}
                  onPressPrimary={() => onPressExplainPrimary(entry.payload.id)}
                  onPressSecondary={() => onPressExplainSecondary(entry.payload.id)}
                />
              );
            }
            if (entry.payload.kind === 'check') {
              return (
                <RemedialCheckCard
                  key={`check-${index}`}
                  node={entry.payload}
                  interactive={entry.interactive}
                  onPressOption={(optionId) => onPressCheckOption(entry.payload.id, optionId)}
                  onPressDontKnow={() => onPressCheckDontKnow(entry.payload.id)}
                />
              );
            }
            return null;
          case 'user-bubble':
            return (
              <View key={`u-${index}`} style={[styles.bubble, styles.userBubble]}>
                <Text style={styles.userBubbleText}>{entry.text}</Text>
              </View>
            );
          case 'ai-bubble':
            return (
              <View key={`a-${index}`} style={[styles.bubble, styles.aiBubble]}>
                <Text style={styles.aiBubbleText}>{entry.text}</Text>
              </View>
            );
          case 'ai-help-input':
            return (
              <RemedialAiHelpCard
                key={`ai-input-${index}`}
                input={aiHelpInput}
                isLoading={aiHelpLoading}
                error={aiHelpError}
                interactive={entry.interactive}
                onChangeText={onChangeAiHelpInput}
                onSubmit={onSubmitAiHelp}
              />
            );
          case 'ai-help-actions':
            return (
              <RemedialAiHelpActions
                key={`ai-actions-${index}`}
                interactive={entry.interactive}
                onContinue={() => onPressAiHelpAction('continue')}
                onFallback={() => onPressAiHelpAction('fallback')}
              />
            );
          case 'transition':
            return <RemedialTransitionCard key={`t-${index}`} text={entry.text} />;
          default:
            return null;
        }
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Paper.paper },
  content: { padding: 16, paddingBottom: 32 },
  bubble: { maxWidth: '85%', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, marginVertical: 4 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: Paper.rustSoft, borderTopRightRadius: 4 },
  userBubbleText: { fontSize: 13, color: Paper.rustDeep, lineHeight: 19 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: Paper.forest100, borderTopLeftRadius: 4 },
  aiBubbleText: { fontSize: 13, color: Paper.forest800, lineHeight: 19 },
});
```

- [ ] **Step 2: 타입 체크**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/components/review-session/remedial-flow.tsx
git commit -m "feat(review): add RemedialFlow scroll container with auto-scroll"
```

---

## Task 13: 화면 통합 — `review-session-screen-view.tsx`에 phase 분기

**Files:**
- Modify: `features/quiz/components/review-session-screen-view.tsx`

- [ ] **Step 1: 훅 결과 destructuring 확장**

기존 destructuring에 추가:

```ts
const {
  // ... 기존
  remedialFlowState,
  onPressRemedialPrimary,
  onPressRemedialSecondary,
  onPressRemedialChoice,
  onChangeRemedialAiHelpInput,
  onSendRemedialAiHelp,
  onPressRemedialAiHelpAction,
} = useReviewSessionScreen();
```

- [ ] **Step 2: `RemedialFlow` import**

```ts
import { RemedialFlow } from './review-session/remedial-flow';
```

- [ ] **Step 3: phase 'remedial' 렌더링 분기 추가**

기존 `stepPhase === 'input' ? (...) : (...)` 패턴을 다음으로 교체:

```tsx
{stepPhase === 'input' ? (
  // 기존 input-section 렌더링 그대로
) : stepPhase === 'remedial' && remedialFlowState ? (
  <RemedialFlow
    entries={remedialFlowState.entries}
    aiHelpInput={remedialFlowState.aiHelpState?.input ?? ''}
    aiHelpLoading={remedialFlowState.aiHelpState?.isLoading ?? false}
    aiHelpError={remedialFlowState.aiHelpState?.error ?? ''}
    onPressExplainPrimary={onPressRemedialPrimary}
    onPressExplainSecondary={onPressRemedialSecondary}
    onPressCheckOption={onPressRemedialChoice}
    onPressCheckDontKnow={onPressRemedialSecondary}
    onChangeAiHelpInput={onChangeRemedialAiHelpInput}
    onSubmitAiHelp={onSendRemedialAiHelp}
    onPressAiHelpAction={onPressRemedialAiHelpAction}
  />
) : null}
```

(`'chat'` phase 분기는 본 spec에서 진입 안 하므로 제거하지 않되 효과적으로 unreachable. cleanup PR에서 정리.)

- [ ] **Step 4: input-section에서 자유 텍스트 입력 UI 제거**

`features/quiz/components/review-session/input-section.tsx`를 열어 자유 텍스트 `TextInput` 및 관련 props/styles를 제거하고 선택지 렌더링만 남긴다. 변경 폭에 따라 별도 commit으로 분리.

```bash
git add features/quiz/components/review-session/input-section.tsx
git commit -m "refactor(review): remove free-text input from input-section (unused in remedial flow)"
```

- [ ] **Step 5: 타입 체크 + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add features/quiz/components/review-session-screen-view.tsx
git commit -m "feat(review): wire RemedialFlow into review session screen view"
```

---

## Task 14: 시범 약점 콘텐츠 — `formula_understanding` 보완 그래프

**Files:**
- Create: `data/remedial-flows/formula_understanding.ts`
- Modify: `data/review-remedial-flows.ts` (import + 등록)
- Modify: `data/review-content-map.ts` (`formula_understanding` step의 오답 choice들에 `remedialFlowStartNodeId` 추가)

- [ ] **Step 1: `formula_understanding` 콘텐츠 작성**

`data/remedial-flows/formula_understanding.ts` 신규:

```ts
import type { RemedialFlow } from '../review-remedial-flows';

// 노드 ID 컨벤션: fu_step<N>_<choice>_<role>
// 약점 prefix: fu

export const formula_understanding_flow: RemedialFlow = {
  nodes: {
    // ─────────────── step1 ───────────────
    'fu_step1_A_explain': {
      id: 'fu_step1_A_explain',
      kind: 'explain',
      title: 'x 계수의 절반부터 다시 보기',
      body: '완전제곱식 (x + a)² 을 전개하면 2a가 x의 계수가 됩니다. 그래서 거꾸로 갈 때는 x 계수를 2로 나눠 a를 얻어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'fu_step1_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'fu_step1_A_easy',
    },
    'fu_step1_A_easy': {
      id: 'fu_step1_A_easy',
      kind: 'explain',
      title: '더 짧게 한 번 더',
      body: 'x² + 6x 라면, 6 ÷ 2 = 3. 그래서 (x+3)² 모양으로 갑니다. 절반을 먼저 보세요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'fu_step1_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'fu_step1_exit',
    },
    'fu_step1_A_check': {
      id: 'fu_step1_A_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'x² + 8x 를 완전제곱식으로 만들 때, 절반을 취해야 하는 수는?',
      options: [
        { id: 'correct', text: '4', isCorrect: true, nextNodeId: 'fu_step1_exit' },
        { id: 'wrong1',  text: '8', isCorrect: false, nextNodeId: 'fu_step1_A_remedy' },
        { id: 'wrong2',  text: '16', isCorrect: false, nextNodeId: 'fu_step1_A_remedy' },
      ],
      dontKnowNextNodeId: 'fu_step1_A_easy',
    },
    'fu_step1_A_remedy': {
      id: 'fu_step1_A_remedy',
      kind: 'explain',
      title: '한 번 더 짚어봐요',
      body: '8 ÷ 2 = 4. 즉 x² + 8x = (x + 4)² - 16 입니다. "x 계수의 절반"이 항상 답입니다.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'fu_step1_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'fu_step1_exit',
    },
    // Choice C 분기 (예: "음수일 땐 다르게 한다" 같은 오답)
    'fu_step1_C_explain': {
      id: 'fu_step1_C_explain',
      kind: 'explain',
      title: '음수일 때도 같은 공식',
      body: 'x 계수가 음수여도 절반을 취하는 규칙은 같아요. 부호를 그대로 절반에 반영합니다.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'fu_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'fu_step1_A_easy',
    },
    'fu_step1_C_check': {
      id: 'fu_step1_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'x² - 6x 를 완전제곱식으로 바꿀 때 절반은?',
      options: [
        { id: 'correct', text: '-3', isCorrect: true, nextNodeId: 'fu_step1_exit' },
        { id: 'wrong1',  text: '3',  isCorrect: false, nextNodeId: 'fu_step1_C_remedy' },
        { id: 'wrong2',  text: '-6', isCorrect: false, nextNodeId: 'fu_step1_C_remedy' },
      ],
      dontKnowNextNodeId: 'fu_step1_A_easy',
    },
    'fu_step1_C_remedy': {
      id: 'fu_step1_C_remedy',
      kind: 'explain',
      title: '부호까지 그대로',
      body: '-6의 절반은 -3 입니다. 부호도 절반에 그대로 적용해요. (x - 3)² - 9 가 됩니다.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'fu_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'fu_step1_exit',
    },
    'fu_step1_exit': { id: 'fu_step1_exit', kind: 'exit' },

    // ─────────────── step2 ───────────────
    // (위 step1과 동일 패턴. 약점 콘텐츠의 step2 오답 선택지 텍스트에 맞춰 작성)
    // ... 생략 (step2/step3도 동일 컨벤션. 각자 _exit 노드 별도 또는 공용 결정)

    // 공용 또는 마지막 exit
    'fu_step2_exit': { id: 'fu_step2_exit', kind: 'exit' },
    'fu_step3_exit': { id: 'fu_step3_exit', kind: 'exit' },
  },
};
```

**참고:** step2/step3 노드는 step1과 동일한 컨벤션(`fu_stepN_<choice>_<role>`)으로 각자 explain / easy / check / remedy / exit를 작성. 분량이 크므로 본 task의 첫 commit은 step1만 포함하고, step2/step3는 후속 commit으로 분리해도 좋다.

- [ ] **Step 2: `review-remedial-flows.ts`에 등록**

```ts
import { formula_understanding_flow } from './remedial-flows/formula_understanding';

export const remedialFlows: Partial<Record<WeaknessId, RemedialFlow>> = {
  formula_understanding: formula_understanding_flow,
};
```

- [ ] **Step 3: `review-content-map.ts`의 `formula_understanding` 오답 choice에 `remedialFlowStartNodeId` 부여**

각 ThinkingStep의 오답 Choice 객체에 추가:

```ts
{
  text: '... 오답 텍스트 ...',
  correct: false,
  feedback: '...',
  remedialFlowStartNodeId: 'fu_step1_A_explain',   // 신규
},
```

step1, step2, step3 각각의 오답에 대해 해당 분기 시작점 매핑.

- [ ] **Step 4: 무결성 테스트 실행**

Run: `npm test -- data/review-remedial-flows.test.ts data/review-content-map.test.ts`
Expected: 모두 PASS (nextNodeId 참조 무결, exit 존재, formula_understanding 오답 remedialFlowStartNodeId 채움)

- [ ] **Step 5: 시뮬레이터 빌드 및 수동 검증 (필수)**

```bash
npx expo prebuild --clean
npx expo run:ios
```

`__mock__` 태스크로 진입(`taskId='__mock__'`)해서 다음 시나리오 수동 확인:
- step1에서 정답(B) 선택 → 보완 안 들어가고 바로 step2로
- step1에서 오답(A) 선택 → 보완 진입 → ExplainNode → "다음으로" → CheckNode → 정답 → 전환 카드 → step2
- 같은 경로에서 CheckNode 오답 → remedy → check 재진입
- 같은 경로에서 "모르겠어요" 첫 클릭 → AI 입력 카드 → 질문 → 응답 → "다시 풀어볼게요" → CheckNode
- 같은 경로에서 "모르겠어요" 두 번째 클릭 → AI 안 뜨고 fallback 노드로

- [ ] **Step 6: 커밋**

```bash
git add data/remedial-flows/formula_understanding.ts data/review-remedial-flows.ts data/review-content-map.ts
git commit -m "feat(review): add formula_understanding remedial flow content"
```

---

## Task 15: 메인 챗 deprecation 표시 + 회귀 검증

**Files:**
- Modify: `features/quiz/components/review-session/chat-section.tsx` (top comment)
- Modify: `features/quiz/hooks/use-review-session-screen.ts` (top comment)

- [ ] **Step 1: chat-section.tsx 상단에 deprecation 주석 추가**

```tsx
/**
 * @deprecated 본 컴포넌트는 2026-05-09-review-session-remedial-step-design에 따라
 * 보완 흐름(`remedial-flow.tsx`)으로 대체되었습니다. 모든 약점의 보완 콘텐츠가
 * 완성되면 별도 cleanup PR에서 제거 예정입니다.
 */
```

- [ ] **Step 2: 훅의 메인 챗 핸들러 그룹에 deprecation 주석 추가**

`onSendChatMessage`, `onChangeChatText`, `chatMessages` 등 메인 챗 관련 코드 위:

```ts
// @deprecated 메인 챗 진입 경로가 제거됨. 보완 흐름 (remedial-flow.tsx)으로 대체.
// 별도 cleanup PR에서 제거 예정.
```

- [ ] **Step 3: 회귀 시나리오 수동 검증**

`__mock__` 태스크에서:
- 모든 step 정답 → 끝까지 정상 진행
- `firstAttemptCorrectRef` 및 `firstAttemptChoiceIndexRef` 콘솔 로그로 확인
- 세션 완료 시 `recordAttempt`가 `selectedIndex`, `usedAiHelp`, `wrongAttempts` 필드 정상 채우는지 확인

- [ ] **Step 4: 전체 테스트 + 타입 체크 + 린트**

```bash
npm run typecheck && npm run lint && npm test
```
Expected: 모두 PASS

- [ ] **Step 5: 최종 커밋**

```bash
git add features/quiz/components/review-session/chat-section.tsx features/quiz/hooks/use-review-session-screen.ts
git commit -m "chore(review): mark main chat handlers/components as deprecated"
```

---

## 검증 체크리스트 (구현 완료 후)

- [ ] 정답만으로 종주 — 보완 진입 없이 완료
- [ ] A 오답 → 보완 → CheckNode 정답 → 다음 step
- [ ] A 오답 → 보완 → CheckNode 오답 → remedy → 정답 → 다음 step
- [ ] A 오답 → 보완 → "모르겠어요" 첫 클릭 → AI 응답 → "다시 풀어볼게요" → CheckNode → 통과
- [ ] A 오답 → 보완 → "모르겠어요" 첫 클릭 → AI 응답 → "여전히 모르겠어요" → fallback 노드 → 통과
- [ ] AI 1회 사용 후 또 "모르겠어요" → AI 안 뜨고 fallback 즉시 진행
- [ ] C 오답 → A와 다른 분기 콘텐츠가 보임 (선택지별 분기 검증)
- [ ] ExitNode 도달 시 짧은 전환 안내 → 다음 step 자동 진행
- [ ] 새 step 시작 시 보완 상태 (aiHelpUsed, entries) 모두 리셋됨
- [ ] `recordAttempt`의 `firstSelectedIndex`, `usedAiHelp`, `wrongAttempts`가 실제 값으로 채워짐
- [ ] `chat-section.tsx`는 dead code로 보존, 동작 흐름에서 진입 안 됨
- [ ] `npm run typecheck && npm run lint && npm test` 통과
- [ ] iOS 시뮬레이터 빌드 (`npx expo prebuild --clean && npx expo run:ios`) 검정화면 없음

---

## 미해결 / 후속 작업 (Non-blocking)

- step2/step3의 보완 콘텐츠 작성 (formula_understanding 외 약점 6개)
- 메인 챗 코드 완전 제거 cleanup PR
- ExitNode 전환 카드 카피와 타이밍 시연 후 확정
- 자동 스크롤과 키보드 표시 인터랙션 미세 조정
- `wrongAttempts` 값이 분석 화면에서 어떻게 표시될지 (필요시 통계 UI 보강)

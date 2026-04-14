# 진단 플로우 최종 카드 자동 완료 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "이 약점으로 정리하기" 버튼을 제거하고, 최종 카드 등장 시 자동 저장 후 1.5초 뒤 다음 문제로 이동한다.

**Architecture:** `use-exam-diagnosis.ts`에서 `onFinalConfirm` 콜백을 제거하고 `useEffect`로 대체해 draft가 final 노드를 가리킬 때 자동 저장한다. `diagnosis-flow-card.tsx`에서 `onFinalConfirm` prop을 optional로 변경하고, prop이 없으면 버튼 대신 "✓ 이 약점으로 정리되었습니다" 텍스트를 보여준다. `exam-diagnosis-screen.tsx`에서 prop 전달을 제거한다.

**Tech Stack:** TypeScript, React Native (Expo), `npx tsc --noEmit`

---

## 파일 구조

| 파일 | 변경 내용 |
|------|---------|
| `features/quiz/exam/hooks/use-exam-diagnosis.ts` | `onFinalConfirm` 제거 → `useEffect` 자동 저장 추가 |
| `features/quiz/components/diagnosis-flow-card.tsx` | `onFinalConfirm` optional화, 버튼→상태 텍스트, `isFinalReady` 제거 |
| `features/quiz/exam/screens/exam-diagnosis-screen.tsx` | `onFinalConfirm={hook.onFinalConfirm}` 제거 |

---

## Task 1: `use-exam-diagnosis.ts` — 자동 저장 useEffect 추가

**Files:**
- Modify: `features/quiz/exam/hooks/use-exam-diagnosis.ts`

---

- [ ] **Step 1: `UseExamDiagnosisResult` 타입에서 `onFinalConfirm` 제거**

`features/quiz/exam/hooks/use-exam-diagnosis.ts` 58번 줄:

```typescript
// Before
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

// After — onFinalConfirm 줄 제거
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
};
```

---

- [ ] **Step 2: `onFinalConfirm` useCallback 전체를 `useEffect` 자동 저장으로 교체**

파일의 `onFinalConfirm` useCallback (line 268–311)을 삭제하고, 그 자리에 아래 `useEffect`를 삽입한다:

```typescript
// 최종 노드 자동 저장 — draft가 final을 가리키는 순간 즉시 저장, 1.5초 후 다음 문제 카드 등장
useEffect(() => {
  if (!draft || !session || !profile || isDone) return;
  const flow = getDiagnosisFlow(draft.methodId);
  const node = getNode(flow, draft.currentNodeId);
  if (node.kind !== 'final') return;

  const weaknessId: WeaknessId = node.weaknessId;
  const completedAt = new Date().toISOString();

  setIsDone(true);
  setIsSaving(true);

  Promise.all([
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
  ])
    .then(() => {
      if (!isMountedRef.current) return;
      setTimeout(() => {
        if (!isMountedRef.current) return;
        setEntries((prev) => [
          ...prev.map((e) => ('interactive' in e ? { ...e, interactive: false } : e)),
          { kind: 'next-problem', id: 'next-problem' },
        ]);
        onComplete();
      }, 1500);
    })
    .catch(() => {
      if (isMountedRef.current) setIsDone(false);
    })
    .finally(() => {
      if (isMountedRef.current) setIsSaving(false);
    });
}, [draft, isDone, session, profile, examId, problemNumber, problem, recordAttempt, onComplete]);
```

---

- [ ] **Step 3: return 값에서 `onFinalConfirm` 제거**

파일 하단 return 블록에서 `onFinalConfirm,` 줄을 삭제한다:

```typescript
// Before
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

// After
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
  };
```

---

- [ ] **Step 4: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 에러 없음 (0 errors). 에러가 나면 `onFinalConfirm`을 참조하는 파일을 확인해 수정한다.

---

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/exam/hooks/use-exam-diagnosis.ts
git commit -m "feat(diagnosis): onFinalConfirm 제거 — useEffect 자동 저장으로 교체"
```

---

## Task 2: `diagnosis-flow-card.tsx` — final 노드 UI 교체

**Files:**
- Modify: `features/quiz/components/diagnosis-flow-card.tsx`

---

- [ ] **Step 1: `onFinalConfirm` prop을 optional로 변경 + `isFinalReady` 제거**

```typescript
// Before — prop 타입
type DiagnosisFlowCardProps = {
  node: DiagnosisFlowNode;
  methodLabel: string;
  disabled?: boolean;
  variant?: 'explain' | 'check' | 'final' | 'choice';
  onChoicePress: (optionId: string) => void;
  onExplainContinue: () => void;
  onExplainDontKnow: () => void;
  onCheckPress: (optionId: string) => void;
  onCheckDontKnow: () => void;
  onFinalConfirm: () => void;
};

// After — onFinalConfirm? (optional)
type DiagnosisFlowCardProps = {
  node: DiagnosisFlowNode;
  methodLabel: string;
  disabled?: boolean;
  variant?: 'explain' | 'check' | 'final' | 'choice';
  onChoicePress: (optionId: string) => void;
  onExplainContinue: () => void;
  onExplainDontKnow: () => void;
  onCheckPress: (optionId: string) => void;
  onCheckDontKnow: () => void;
  onFinalConfirm?: () => void;
};
```

---

- [ ] **Step 2: `isFinalReady` state + useEffect 제거, `useEffect`/`useState` import 정리**

컴포넌트 본문에서 아래 블록을 삭제한다:

```typescript
// 삭제 대상
const [isFinalReady, setIsFinalReady] = useState(node.kind !== 'final');
useEffect(() => {
  if (node.kind !== 'final') return;
  const t = setTimeout(() => setIsFinalReady(true), 350);
  return () => clearTimeout(t);
}, [node.kind]);
```

`useState`, `useEffect` import도 더 이상 사용하지 않으므로 파일 상단에서 제거한다:

```typescript
// Before
import { useEffect, useState } from 'react';

// After — import 줄 전체 삭제 (react에서 아무것도 import 안 함)
```

---

- [ ] **Step 3: final 노드 렌더링 교체**

`{node.kind === 'final' && ( ... )}` 블록을 아래로 교체한다:

```tsx
{node.kind === 'final' && (
  onFinalConfirm ? (
    <View style={styles.actionGroup}>
      <Pressable
        style={[styles.primaryButton, disabled ? styles.buttonDisabled : null]}
        onPress={onFinalConfirm}
        accessibilityRole="button"
        accessibilityLabel={node.ctaLabel}
        disabled={disabled}>
        <Text style={styles.primaryButtonText}>
          {node.ctaLabel}
        </Text>
      </Pressable>
    </View>
  ) : (
    <View style={styles.finalStatusRow}>
      <Text style={styles.finalStatusText}>✓ 이 약점으로 정리되었습니다</Text>
    </View>
  )
)}
```

---

- [ ] **Step 4: 스타일 추가**

`StyleSheet.create` 블록 안에 아래 두 스타일을 추가한다:

```typescript
  finalStatusRow: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  finalStatusText: {
    fontSize: 14,
    fontWeight: '700',
    color: DiagnosisTheme.ink,
  },
```

---

- [ ] **Step 5: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 에러 없음.

---

- [ ] **Step 6: 커밋**

```bash
git add features/quiz/components/diagnosis-flow-card.tsx
git commit -m "feat(diagnosis): final 카드 버튼 제거 — 자동 저장 상태 텍스트로 교체"
```

---

## Task 3: `exam-diagnosis-screen.tsx` — onFinalConfirm prop 제거

**Files:**
- Modify: `features/quiz/exam/screens/exam-diagnosis-screen.tsx`

---

- [ ] **Step 1: DiagnosisFlowCard에서 `onFinalConfirm` prop 제거**

`EntryRenderer` 함수 내 `DiagnosisFlowCard` 호출에서 `onFinalConfirm={hook.onFinalConfirm}` 줄을 삭제한다:

```tsx
// Before
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

// After
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
      />
    );
```

---

- [ ] **Step 2: 최종 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 에러 없음 (0 errors).

---

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/exam/screens/exam-diagnosis-screen.tsx
git commit -m "fix(diagnosis): exam 화면에서 onFinalConfirm prop 제거"
```

---

## 주의사항

- `features/quiz/components/diagnosis-conversation-page.tsx`와 `features/quiz/hooks/use-diagnostic-screen.ts`는 **건드리지 않는다**. 이 파일들은 별도의 복습 진단 화면용이며 `onFinalConfirm`을 계속 사용한다.
- `diagnosis-flow-card.tsx`의 `onFinalConfirm?` optional 처리로 두 화면 모두 정상 동작한다.

# 진단 완료 후 자동 다음 문제 이동 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 진단 완료 후 사용자가 버튼을 누르지 않아도 1.5초 뒤 자동으로 다음 문제 화면으로 슬라이드 이동한다.

**Architecture:** `use-exam-diagnosis.ts`의 useEffect에서 `next-problem` 항목 추가를 제거하고 `onComplete()`만 호출한다. `exam-diagnosis-session-screen.tsx`의 `onComplete` 콜백에서 `session.onScrollToNext()` 또는 `session.onBackToResult()`를 자동 호출한다. `exam-diagnosis-screen.tsx`에서 `NextProblemCard` 관련 코드를 전부 제거한다.

**Tech Stack:** TypeScript, React Native (Expo), `npx tsc --noEmit`

---

## 파일 구조

| 파일 | 변경 내용 |
|------|---------|
| `features/quiz/exam/hooks/use-exam-diagnosis.ts` | `next-problem` 항목 추가 제거, `ExamDiagEntry` 타입 정리 |
| `features/quiz/exam/screens/exam-diagnosis-screen.tsx` | `NextProblemCard` import/렌더링/props 제거 |
| `features/quiz/exam/screens/exam-diagnosis-session-screen.tsx` | `onComplete`에 자동 이동 추가, 불필요 props 제거 |

---

## Task 1: `use-exam-diagnosis.ts` — next-problem 항목 제거

**Files:**
- Modify: `features/quiz/exam/hooks/use-exam-diagnosis.ts`

---

- [ ] **Step 1: `ExamDiagEntry` 타입에서 `next-problem` 유니온 멤버 삭제**

파일 29–34번 줄:

```typescript
// Before
export type ExamDiagEntry =
  | { kind: 'bubble'; id: string; role: 'assistant' | 'user'; text: string }
  | { kind: 'problem-card'; id: string; imageKey: string; userAnswer: number; correctAnswer: number; problemType: 'multiple_choice' | 'short_answer' }
  | { kind: 'method-selector'; id: string; interactive: boolean }
  | { kind: 'flow-node'; id: string; flow: DetailedDiagnosisFlow; draft: DiagnosisFlowDraft; interactive: boolean }
  | { kind: 'next-problem'; id: string };

// After — 마지막 줄 삭제
export type ExamDiagEntry =
  | { kind: 'bubble'; id: string; role: 'assistant' | 'user'; text: string }
  | { kind: 'problem-card'; id: string; imageKey: string; userAnswer: number; correctAnswer: number; problemType: 'multiple_choice' | 'short_answer' }
  | { kind: 'method-selector'; id: string; interactive: boolean }
  | { kind: 'flow-node'; id: string; flow: DetailedDiagnosisFlow; draft: DiagnosisFlowDraft; interactive: boolean };
```

---

- [ ] **Step 2: useEffect `.then()` 블록에서 `setEntries` next-problem 추가 코드 제거**

파일 296–305번 줄:

```typescript
// Before
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

// After — setEntries 호출 제거, onComplete만 유지
      .then(() => {
        if (!isMountedRef.current) return;
        setTimeout(() => {
          if (!isMountedRef.current) return;
          onComplete();
        }, 1500);
      })
```

---

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | head -30
```

`exam-diagnosis-screen.tsx`에서 `next-problem` 관련 에러가 나올 수 있음 — Task 2에서 처리하므로 허용. `use-exam-diagnosis.ts` 내부 에러만 없으면 됨.

---

- [ ] **Step 4: 커밋**

```bash
git add features/quiz/exam/hooks/use-exam-diagnosis.ts
git commit -m "feat(diagnosis): next-problem 항목 제거 — onComplete 자동 호출로 대체"
```

---

## Task 2: `exam-diagnosis-screen.tsx` — NextProblemCard 제거

**Files:**
- Modify: `features/quiz/exam/screens/exam-diagnosis-screen.tsx`

---

- [ ] **Step 1: `NextProblemCard` import 삭제**

파일 22번 줄:

```typescript
// Before
import { NextProblemCard } from '../components/next-problem-card';

// After — 이 줄 전체 삭제
```

---

- [ ] **Step 2: `ExamDiagnosisPageProps`에서 불필요 props 제거**

파일 29–39번 줄:

```typescript
// Before
type ExamDiagnosisPageProps = {
  examId: string;
  problemNumber: number;
  userAnswer: number;
  width: number;
  isActive: boolean;
  nextProblemNumber: number | null;
  onComplete: () => void;
  onNext: () => void;
  onBackToResult: () => void;
};

// After — nextProblemNumber, onNext, onBackToResult 제거
type ExamDiagnosisPageProps = {
  examId: string;
  problemNumber: number;
  userAnswer: number;
  width: number;
  isActive: boolean;
  onComplete: () => void;
};
```

---

- [ ] **Step 3: `ExamDiagnosisPage` 함수 시그니처에서 삭제된 props 제거**

파일 41–51번 줄:

```typescript
// Before
export function ExamDiagnosisPage({
  examId,
  problemNumber,
  userAnswer,
  width,
  isActive,
  nextProblemNumber,
  onComplete,
  onNext,
  onBackToResult,
}: ExamDiagnosisPageProps) {

// After
export function ExamDiagnosisPage({
  examId,
  problemNumber,
  userAnswer,
  width,
  isActive,
  onComplete,
}: ExamDiagnosisPageProps) {
```

---

- [ ] **Step 4: 태블릿 레이아웃 `EntryRenderer` 호출에서 불필요 props 제거**

파일 82–89번 줄 (태블릿 경로 `EntryRenderer` 호출):

```tsx
// Before
            <EntryRenderer
              entry={problemEntry}
              hook={hook}
              nextProblemNumber={nextProblemNumber}
              onNext={onNext}
              onBackToResult={onBackToResult}
            />

// After
            <EntryRenderer
              entry={problemEntry}
              hook={hook}
            />
```

파일 114–121번 줄 (태블릿 우측 패널 `EntryRenderer` 호출):

```tsx
// Before
                <EntryRenderer
                  entry={entry}
                  hook={hook}
                  nextProblemNumber={nextProblemNumber}
                  onNext={onNext}
                  onBackToResult={onBackToResult}
                />

// After
                <EntryRenderer
                  entry={entry}
                  hook={hook}
                />
```

---

- [ ] **Step 5: 모바일 레이아웃 `EntryRenderer` 호출에서 불필요 props 제거**

파일 151–158번 줄 (모바일 `EntryRenderer` 호출):

```tsx
// Before
            <EntryRenderer
              entry={entry}
              hook={hook}
              nextProblemNumber={nextProblemNumber}
              onNext={onNext}
              onBackToResult={onBackToResult}
            />

// After
            <EntryRenderer
              entry={entry}
              hook={hook}
            />
```

---

- [ ] **Step 6: Animated.View `entering` 속성 단순화**

`next-problem` 항목이 없어졌으므로 entering 애니메이션 조건 삭제. 두 곳 모두 적용.

태블릿 경로 (파일 104–113번 줄):

```tsx
// Before
              <Animated.View
                key={entry.id}
                entering={
                  entry.kind === 'next-problem'
                    ? undefined
                    : FadeInDown.duration(220).withInitialValues({
                        opacity: 0,
                        transform: [{ translateY: 8 }],
                      })
                }>

// After
              <Animated.View
                key={entry.id}
                entering={FadeInDown.duration(220).withInitialValues({
                  opacity: 0,
                  transform: [{ translateY: 8 }],
                })}>
```

모바일 경로 (파일 144–150번 줄):

```tsx
// Before
          <Animated.View
            key={entry.id}
            entering={
              entry.kind === 'next-problem'
                ? undefined
                : FadeInDown.duration(220).withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })
            }>

// After
          <Animated.View
            key={entry.id}
            entering={FadeInDown.duration(220).withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })}>
```

---

- [ ] **Step 7: `EntryRendererProps` 타입과 `EntryRenderer` 함수에서 불필요 props 제거**

파일 171–185번 줄:

```typescript
// Before
type EntryRendererProps = {
  entry: ExamDiagEntry;
  hook: UseExamDiagnosisResult;
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

// After
type EntryRendererProps = {
  entry: ExamDiagEntry;
  hook: UseExamDiagnosisResult;
};

function EntryRenderer({
  entry,
  hook,
}: EntryRendererProps) {
```

---

- [ ] **Step 8: `EntryRenderer` 내 `next-problem` 렌더링 블록 삭제**

파일 242–250번 줄:

```tsx
// Before — 이 블록 전체 삭제
  if (entry.kind === 'next-problem') {
    return (
      <NextProblemCard
        nextProblemNumber={nextProblemNumber}
        onNext={onNext}
        onBackToResult={onBackToResult}
      />
    );
  }
```

---

- [ ] **Step 9: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | head -30
```

`exam-diagnosis-session-screen.tsx`에서 `onNext`/`onBackToResult`/`nextProblemNumber` prop 관련 에러가 나올 수 있음 — Task 3에서 처리. `exam-diagnosis-screen.tsx` 내부 에러만 없으면 됨.

---

- [ ] **Step 10: 커밋**

```bash
git add features/quiz/exam/screens/exam-diagnosis-screen.tsx
git commit -m "feat(diagnosis): NextProblemCard 제거 — 자동 이동 전환"
```

---

## Task 3: `exam-diagnosis-session-screen.tsx` — onComplete 자동 이동 추가

**Files:**
- Modify: `features/quiz/exam/screens/exam-diagnosis-session-screen.tsx`

---

- [ ] **Step 1: 태블릿 경로 `ExamDiagnosisPage` props 업데이트**

파일 71–83번 줄:

```tsx
// Before
        {activeProblemNumber !== undefined && (
          <ExamDiagnosisPage
            key={activeProblemNumber}
            examId={examId}
            problemNumber={activeProblemNumber}
            userAnswer={session.getUserAnswer(activeProblemNumber)}
            width={pageWidth}
            isActive={true}
            nextProblemNumber={session.getNextProblemNumber(session.activeProblemIndex)}
            onComplete={() => session.onComplete(session.activeProblemIndex)}
            onNext={() => session.onScrollToNext(session.activeProblemIndex)}
            onBackToResult={session.onBackToResult}
          />
        )}

// After — nextProblemNumber/onNext/onBackToResult 제거, onComplete에 자동 이동 추가
        {activeProblemNumber !== undefined && (
          <ExamDiagnosisPage
            key={activeProblemNumber}
            examId={examId}
            problemNumber={activeProblemNumber}
            userAnswer={session.getUserAnswer(activeProblemNumber)}
            width={pageWidth}
            isActive={true}
            onComplete={() => {
              session.onComplete(session.activeProblemIndex);
              if (session.getNextProblemNumber(session.activeProblemIndex) !== null) {
                session.onScrollToNext(session.activeProblemIndex);
              } else {
                session.onBackToResult();
              }
            }}
          />
        )}
```

---

- [ ] **Step 2: FlatList renderItem `ExamDiagnosisPage` props 업데이트**

파일 117–129번 줄:

```tsx
// Before
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

// After
        renderItem={({ item: problemNumber, index }) => (
          <ExamDiagnosisPage
            examId={examId}
            problemNumber={problemNumber}
            userAnswer={session.getUserAnswer(problemNumber)}
            width={pageWidth}
            isActive={index === session.activeProblemIndex}
            onComplete={() => {
              session.onComplete(index);
              if (session.getNextProblemNumber(index) !== null) {
                session.onScrollToNext(index);
              } else {
                session.onBackToResult();
              }
            }}
          />
        )}
```

---

- [ ] **Step 3: 최종 타입 체크**

```bash
npx tsc --noEmit 2>&1
```

Expected: 에러 없음 (0 errors).

---

- [ ] **Step 4: 커밋**

```bash
git add features/quiz/exam/screens/exam-diagnosis-session-screen.tsx
git commit -m "feat(diagnosis): 진단 완료 후 자동 다음 문제 슬라이드 이동"
```

---

## 주의사항

- `features/quiz/exam/components/next-problem-card.tsx` 파일 자체는 **삭제하지 않는다** (다른 용도로 재사용 가능).
- 태블릿 경로에서는 FlatList가 없어 `onScrollToNext`가 의미 없지만, `onScrollToNext`는 내부적으로 `pagerRef.current?.scrollToIndex()`를 호출하므로 null ref이면 조용히 실패함 — 별도 처리 불필요.
- 마지막 문제 완료 시 `session.onBackToResult()`가 `router.back()`을 호출해 채점 결과 화면으로 이동한다.

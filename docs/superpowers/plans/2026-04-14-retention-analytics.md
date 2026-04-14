# Retention Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 진단 완료 시 Firestore에 `diagnosis_completed` 이벤트를 기록해 7일 리텐션 측정 기반을 만든다.

**Architecture:** `features/analytics/diagnosis-analytics.ts` 파일 하나에 `logDiagnosisCompleted` 함수를 만들고, 모의고사 진단(`use-exam-diagnosis.ts`)과 단원 진단(`use-diagnostic-screen.ts`) 두 곳에서 호출한다. fire-and-forget 방식으로 UI를 블록하지 않는다.

**Tech Stack:** Firebase Firestore (`firebase/firestore`), React Native / Expo

---

## 파일 구조

| 파일 | 역할 |
|------|------|
| `features/analytics/diagnosis-analytics.ts` | 신규. `logDiagnosisCompleted` 함수 단독 export |
| `features/quiz/exam/hooks/use-exam-diagnosis.ts` | 수정. `setIsDone(true)` 직후 호출 추가 |
| `features/quiz/hooks/use-diagnostic-screen.ts` | 수정. `useCurrentLearner` 추가 + `onFinalConfirm` 내 호출 추가 |

---

## Task 1: analytics 모듈 생성

**Files:**
- Create: `features/analytics/diagnosis-analytics.ts`

- [ ] **Step 1: 파일 생성**

`features/analytics/diagnosis-analytics.ts` 를 아래 내용으로 생성한다.

```ts
import { getApp } from 'firebase/app';
import { addDoc, collection, getFirestore, serverTimestamp } from 'firebase/firestore';

export type DiagnosisCompletedSource = 'exam' | 'unit';

interface LogDiagnosisCompletedParams {
  accountKey: string; // "user:{firebaseUid}" 형태
  source: DiagnosisCompletedSource;
  weaknessId: string;
  examId?: string;
  problemNumber?: number;
}

export function logDiagnosisCompleted(params: LogDiagnosisCompletedParams): void {
  const uid = params.accountKey.startsWith('user:')
    ? params.accountKey.slice(5)
    : params.accountKey;

  const db = getFirestore(getApp());

  addDoc(collection(db, 'users', uid, 'events'), {
    eventName: 'diagnosis_completed',
    source: params.source,
    weaknessId: params.weaknessId,
    examId: params.examId ?? null,
    problemNumber: params.problemNumber ?? null,
    completedAt: serverTimestamp(),
  }).catch(() => {
    // 리텐션 로깅 실패는 UX에 영향 없이 무시
  });
}
```

- [ ] **Step 2: TypeScript 타입 확인**

```bash
npx tsc --noEmit
```

에러 없이 통과해야 한다.

- [ ] **Step 3: 커밋**

```bash
git add features/analytics/diagnosis-analytics.ts
git commit -m "feat(analytics): diagnosis_completed Firestore 이벤트 로거 추가"
```

---

## Task 2: 모의고사 진단 완료 시 이벤트 호출

**Files:**
- Modify: `features/quiz/exam/hooks/use-exam-diagnosis.ts:1-10` (import 추가), `line 277` (호출 추가)

- [ ] **Step 1: import 추가**

`features/quiz/exam/hooks/use-exam-diagnosis.ts` 상단 import 블록 끝에 아래 한 줄을 추가한다.

```ts
import { logDiagnosisCompleted } from '@/features/analytics/diagnosis-analytics';
```

기존 import들 바로 아래에 붙인다. 파일 상단 `// features/quiz/exam/hooks/use-exam-diagnosis.ts` 주석 아래, 기존 import 블록 끝 위치다.

- [ ] **Step 2: setIsDone(true) 직후 호출 추가**

`use-exam-diagnosis.ts` line 277 `setIsDone(true);` 바로 아래에 다음을 추가한다.

변경 전:
```ts
    setIsDone(true);
    setIsSaving(true);
```

변경 후:
```ts
    setIsDone(true);
    logDiagnosisCompleted({
      accountKey: profile.accountKey,
      source: 'exam',
      weaknessId,
      examId,
      problemNumber,
    });
    setIsSaving(true);
```

`profile`은 이 `useEffect` 진입 조건 `if (!draft || !session || !profile || isDone) return;` 에서 이미 null 가드가 되어 있으므로 추가 가드 불필요.

- [ ] **Step 3: TypeScript 타입 확인**

```bash
npx tsc --noEmit
```

에러 없이 통과해야 한다.

- [ ] **Step 4: 커밋**

```bash
git add features/quiz/exam/hooks/use-exam-diagnosis.ts
git commit -m "feat(analytics): 모의고사 문제 진단 완료 시 diagnosis_completed 이벤트 로깅"
```

---

## Task 3: 단원 진단 완료 시 이벤트 호출

**Files:**
- Modify: `features/quiz/hooks/use-diagnostic-screen.ts` (import 2개 추가, `onFinalConfirm` 내 호출 추가)

- [ ] **Step 1: import 2개 추가**

`features/quiz/hooks/use-diagnostic-screen.ts` 상단 import 블록에 두 줄을 추가한다.

기존 파일에 이미 있는 import:
```ts
import { useQuizSession } from '@/features/quiz/session';
```

그 아래에 추가:
```ts
import { logDiagnosisCompleted } from '@/features/analytics/diagnosis-analytics';
import { useCurrentLearner } from '@/features/learner/provider';
```

- [ ] **Step 2: useCurrentLearner 훅 호출 추가**

`use-diagnostic-screen.ts` 내부, `useQuizSession()` 호출 근처에 아래를 추가한다.

기존 코드 (line ~108):
```ts
  const {
    goToPreviousQuestion,
    submitAnswer,
    confirmDiagnosisMethod,
    submitDiagnosisWeakness,
    finishDiagnosis,
  } = useQuizSession();
```

그 바로 아래에 추가:
```ts
  const { profile } = useCurrentLearner();
```

- [ ] **Step 3: onFinalConfirm 내 호출 추가**

`onFinalConfirm` 함수 내 `updateWorkspace(...)` 호출 블록 바로 뒤에 추가한다.

변경 전 (`updateWorkspace` 블록 끝 ~ `if (nextPageIndex !== null)` 사이):
```ts
    updateWorkspace(answerIndex, (current) => ({
      ...current,
      aiHelpState: null,
      chatEntries: [
        ...freezeConversationEntries(current.chatEntries),
        createBubbleEntry(answerIndex, 'user', activeNode.ctaLabel),
        createBubbleEntry(answerIndex, 'assistant', '이 문제는 분석을 마쳤어요.', 'positive'),
      ],
      status: 'completed',
    }));

    if (nextPageIndex !== null) {
```

변경 후:
```ts
    updateWorkspace(answerIndex, (current) => ({
      ...current,
      aiHelpState: null,
      chatEntries: [
        ...freezeConversationEntries(current.chatEntries),
        createBubbleEntry(answerIndex, 'user', activeNode.ctaLabel),
        createBubbleEntry(answerIndex, 'assistant', '이 문제는 분석을 마쳤어요.', 'positive'),
      ],
      status: 'completed',
    }));

    if (profile) {
      logDiagnosisCompleted({
        accountKey: profile.accountKey,
        source: 'unit',
        weaknessId: activeNode.weaknessId,
      });
    }

    if (nextPageIndex !== null) {
```

- [ ] **Step 4: TypeScript 타입 확인**

```bash
npx tsc --noEmit
```

에러 없이 통과해야 한다.

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/hooks/use-diagnostic-screen.ts
git commit -m "feat(analytics): 단원 진단 완료 시 diagnosis_completed 이벤트 로깅"
```

---

## Task 4: 수동 검증

앱을 실행해서 Firestore에 이벤트가 실제로 기록되는지 확인한다.

- [ ] **Step 1: 앱 실행**

```bash
npx expo run:ios
```

- [ ] **Step 2: 모의고사 진단 흐름 완료**

앱에서 모의고사 오답 진단을 하나 끝까지 완료한다.

- [ ] **Step 3: Firebase 콘솔 확인**

Firebase 콘솔 → Firestore → `users` → 로그인한 유저 uid → `events` 컬렉션
아래 필드를 가진 문서가 생성되어 있어야 한다:

```
eventName: "diagnosis_completed"
source: "exam"
weaknessId: (진단된 약점 id)
examId: (모의고사 id)
problemNumber: (문제 번호)
completedAt: (Timestamp)
```

- [ ] **Step 4: 단원 진단 흐름 완료**

앱에서 단원 진단을 하나 끝까지 완료한다.

- [ ] **Step 5: Firebase 콘솔 재확인**

같은 uid의 `events` 컬렉션에 두 번째 문서가 생겼는지 확인:

```
eventName: "diagnosis_completed"
source: "unit"
weaknessId: (진단된 약점 id)
examId: null
problemNumber: null
completedAt: (Timestamp)
```

- [ ] **Step 6: 에러 없음 확인**

Metro 콘솔에 analytics 관련 에러 없음을 확인한다.

- [ ] **Step 7: 최종 커밋 푸시**

```bash
git push origin main
npm run notify:done -- "retention analytics: diagnosis_completed 이벤트 Firestore 로깅 구현 완료"
```

# Remove CollectedNotesList Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈 화면에서 "📚 모은 노트" 섹션(`CollectedNotesList`)을 제거한다.

**Architecture:** 분석 진행중 캐러셀이 이미 진행 상황(N/Y 노트)을 표시하므로 중복이고, 현재 `items[0]`만 사용하여 다중 진행 시 불완전한 정보를 보여준다. 컴포넌트 + 사용처 + 관련 prop을 모두 제거한다.

**Tech Stack:** React Native, TypeScript, Expo

---

## File Structure

**Modify:**
- `features/quiz/components/quiz-hub-screen-view.tsx` — `CollectedNotesList` 렌더링/import/`resolveLabel`/`diagnosisMap` import/`showCollectedNotes` prop 제거
- `features/quiz/hooks/use-quiz-hub-screen.ts` — `showCollectedNotes` 타입/계산식/반환 제거

**Delete:**
- `features/quiz/exam/components/collected-notes-list.tsx` — 컴포넌트 파일

---

### Task 1: `quiz-hub-screen-view.tsx` 정리

**Files:**
- Modify: `features/quiz/components/quiz-hub-screen-view.tsx`

- [ ] **Step 1: `CollectedNotesList` 렌더링 블록 제거 (236-241행)**

다음 블록을 제거:
```tsx
{showCollectedNotes && analysisState.isInProgress ? (
  <CollectedNotesList
    notes={analysisState.items[0]?.diagnosedNotes ?? []}
    resolveLabel={resolveLabel}
  />
) : null}
```

- [ ] **Step 2: `showCollectedNotes` props 구조분해 제거 (107행)**

`QuizHubScreenView` 함수의 props 구조분해에서 `showCollectedNotes,` 라인 삭제.

- [ ] **Step 3: `CollectedNotesList` import 제거 (21행)**

다음 import 라인 삭제:
```tsx
import { CollectedNotesList } from '@/features/quiz/exam/components/collected-notes-list';
```

- [ ] **Step 4: `diagnosisMap` import 및 `resolveLabel` 함수 제거 (22-26행)**

다른 사용처가 없음을 확인 후, 다음 라인 삭제:
```tsx
import { diagnosisMap } from '@/data/diagnosisMap';
```
그리고 다음 함수도 삭제:
```tsx
function resolveLabel(id: string): string {
  return diagnosisMap[id as keyof typeof diagnosisMap]?.labelKo ?? id;
}
```

확인 명령:
```bash
grep -n "resolveLabel\|diagnosisMap" features/quiz/components/quiz-hub-screen-view.tsx
```
Expected: 매치 없음

- [ ] **Step 5: TypeScript 검증**

Run: `npx tsc --noEmit`
Expected: PASS (관련 에러 없음)

---

### Task 2: `use-quiz-hub-screen.ts` 정리

**Files:**
- Modify: `features/quiz/hooks/use-quiz-hub-screen.ts`

- [ ] **Step 1: `UseQuizHubScreenResult` 타입에서 `showCollectedNotes` 제거 (48행)**

다음 라인 삭제:
```ts
showCollectedNotes: boolean;
```

- [ ] **Step 2: `showCollectedNotes` 계산식 제거 (300행)**

다음 라인 삭제:
```ts
const showCollectedNotes = isAnalysisInProgress;
```

- [ ] **Step 3: 반환 객체에서 `showCollectedNotes` 제거 (326행 부근)**

return 객체에서 `showCollectedNotes,` 라인 삭제.

- [ ] **Step 4: TypeScript 검증**

Run: `npx tsc --noEmit`
Expected: PASS

---

### Task 3: `collected-notes-list.tsx` 파일 삭제

**Files:**
- Delete: `features/quiz/exam/components/collected-notes-list.tsx`

- [ ] **Step 1: 다른 참조 없음 확인**

Run:
```bash
grep -rn "CollectedNotesList\|collected-notes-list" features/ app/ --include="*.ts" --include="*.tsx"
```
Expected: 매치 없음 (이전 task에서 모든 참조 제거됨)

- [ ] **Step 2: 파일 삭제**

Run: `rm features/quiz/exam/components/collected-notes-list.tsx`

- [ ] **Step 3: TypeScript 검증**

Run: `npx tsc --noEmit`
Expected: PASS

---

### Task 4: 검증 및 커밋

- [ ] **Step 1: 전체 typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 2: 테스트 실행**

Run: `npm test -- --testPathPattern="quiz/(components|hooks)"`
Expected: 모든 관련 테스트 PASS

- [ ] **Step 3: 홈 화면 동작 확인 (수동)**

Expo Fast Refresh로 확인:
- 분석 진행 1개일 때: 캐러셀만 표시, "모은 노트" 섹션 없음
- 분석 진행 2개일 때: 캐러셀(페이지네이션) + 하단 정상 표시
- 분석 없을 때: 정상 홈 화면

- [ ] **Step 4: 커밋**

```bash
git add features/quiz/components/quiz-hub-screen-view.tsx \
        features/quiz/hooks/use-quiz-hub-screen.ts \
        features/quiz/exam/components/collected-notes-list.tsx \
        docs/superpowers/plans/2026-05-06-remove-collected-notes-list.md
git commit -m "refactor(quiz-hub): remove redundant collected-notes-list section

분석 진행중 캐러셀이 이미 진행 상황(N/Y)을 표시하므로 중복이며,
items[0]만 사용해 다중 진행 시 불완전한 정보를 보여주는 문제가 있었음."
```

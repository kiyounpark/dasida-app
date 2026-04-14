# Spec: 진단 완료 후 자동 다음 문제 이동

**작성일**: 2026-04-14
**범위**: `use-exam-diagnosis.ts`, `exam-diagnosis-session-screen.tsx`
**목표**: 진단 완료 후 사용자가 버튼을 누르지 않아도 자동으로 다음 문제로 슬라이드 이동

---

## 배경

현재 흐름:
1. 확인 문제 답 선택 → ✓ 이 약점으로 정리되었습니다 (자동 저장)
2. 1.5초 후 "다음 문제 분석하기 · N번 →" 버튼 카드 등장
3. **사용자가 버튼을 눌러야** 다음 문제로 이동

문제: 분석을 마친 사용자가 버튼을 누르지 않고 멈출 가능성이 높음. 다음 문제 시작을 앱이 주도적으로 도와줘야 함.

---

## 새 흐름

```
확인 문제 답 선택 (또는 dont_know)
→ ✓ 이 약점으로 정리되었습니다 (카드에 표시, 자동 저장 중)
→ 1.5초 후
  → [일반 문제] FlatList 슬라이드 애니메이션으로 다음 문제 화면으로 자동 이동
  → [마지막 문제] 결과 화면(router.back())으로 자동 이동
```

버튼 카드(`NextProblemCard`) 없음. 사용자 액션 불필요.

---

## 기술 변경

### `use-exam-diagnosis.ts`

`onComplete` 콜백이 호출된 뒤 `next-problem` 항목을 entries에 추가하는 코드를 삭제한다.

```typescript
// Before (삭제 대상)
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

// After
.then(() => {
  if (!isMountedRef.current) return;
  setTimeout(() => {
    if (!isMountedRef.current) return;
    onComplete();
  }, 1500);
})
```

`ExamDiagEntry` 타입에서 `{ kind: 'next-problem'; id: string }` 유니온 멤버도 삭제한다.

### `exam-diagnosis-session-screen.tsx`

`onComplete` 콜백에서 `session.onComplete()` 호출 뒤 자동 이동 로직을 추가한다.

```tsx
// Before
onComplete={() => session.onComplete(session.activeProblemIndex)}
onComplete={() => session.onComplete(index)}

// After
onComplete={() => {
  session.onComplete(session.activeProblemIndex);
  if (session.getNextProblemNumber(session.activeProblemIndex) !== null) {
    session.onScrollToNext(session.activeProblemIndex);
  } else {
    session.onBackToResult();
  }
}}
```

두 곳 모두 (line 79, line 125) 동일하게 변경.

### `exam-diagnosis-screen.tsx`

`NextProblemCard` import와 렌더링 분기를 제거한다. 파일 자체(`next-problem-card.tsx`)는 삭제하지 않는다.

```tsx
// 삭제 대상 — import
import { NextProblemCard } from '../components/next-problem-card';

// 삭제 대상 — EntryRenderer 내 next-problem 분기
if (entry.kind === 'next-problem') {
  return <NextProblemCard ... />;
}
```

`ExamDiagEntry` 타입의 `kind: 'next-problem'` 유니온 멤버도 `use-exam-diagnosis.ts`에서 삭제한다(위 훅 변경에 포함).

---

## 태블릿 예외

태블릿은 FlatList 없이 현재 문제 하나만 렌더링한다. `onScrollToNext`가 FlatList ref에 의존하므로 태블릿 경로에서는 동작하지 않을 수 있다. 이번 스펙 범위에서는 태블릿 자동 이동을 구현하지 않는다 — 태블릿에서는 기존처럼 수동 이동으로 유지.

---

## 검증 기준

- `npx tsc --noEmit` 에러 없음
- 확인 문제 답 선택 후 1.5초 뒤 자동으로 다음 문제 화면으로 슬라이드
- 마지막 문제 완료 후 1.5초 뒤 결과 화면으로 자동 이동
- "다음 문제 분석하기" 버튼 카드 미표시
- `next-problem` 항목이 entries에 추가되지 않음

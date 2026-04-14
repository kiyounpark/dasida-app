# Spec: 진단 플로우 — 최종 카드 자동 완료

**작성일**: 2026-04-14
**범위**: `use-exam-diagnosis.ts`, `diagnosis-flow-card.tsx`
**목표**: "이 약점으로 정리하기" 버튼 제거 → 최종 카드 등장 시 자동 저장 + 1.5초 후 다음 문제

---

## 배경

현재 문제:
1. 확인 문제 답 선택 → 최종 카드 등장 → "이 약점으로 정리하기" 버튼을 **또** 눌러야 함
2. 최종 카드가 등장하는 순간 버튼이 자동으로 눌리는 오작동 발생

근본 해결: 버튼 자체를 없애고, 최종 카드 등장 시 자동 저장

---

## 새 흐름

```
확인 문제 답 선택 (또는 설명 카드 확인)
→ 최종 카드 자동 등장
→ 자동 저장 시작
→ 카드에 "✓ 이 약점으로 정리되었습니다" 표시
→ 1.5초 후 → 다음 문제 카드 등장
```

모든 경로 동일 적용:
- `explain → (check 없음) → final`
- `check 정답 → final`
- `check 오답 → remedial → retry_check → final`
- `dont_know → fallback_final`

---

## 최종 카드 UI 변경

### Before
```
[약점 제목]
[약점 desc + tip 본문]
[이 약점으로 정리하기 버튼]
```

### After
```
[약점 제목]
✓ 이 약점으로 정리되었습니다
(1.5초 후 자동으로 다음 문제 이동)
```

변경:
- `body` 제거 (desc + tip 텍스트 숨김)
- CTA 버튼 제거
- "✓ 이 약점으로 정리되었습니다" 확인 텍스트 추가
- 저장 중 스피너는 카드 내부에 작게 유지

---

## 기술 변경

### `use-exam-diagnosis.ts`

`onFinalConfirm` 콜백 제거 → `useEffect`로 대체

```typescript
// draft가 final 노드를 가리킬 때 자동 저장
useEffect(() => {
  if (!draft || !session || !profile || isDone) return;
  const flow = getDiagnosisFlow(draft.methodId);
  const node = getNode(flow, draft.currentNodeId);
  if (node.kind !== 'final') return;

  setIsDone(true);
  setIsSaving(true);

  const completedAt = new Date().toISOString();
  const weaknessId = node.weaknessId;

  Promise.all([
    markProblemDiagnosed(examId, problemNumber, weaknessId),
    recordAttempt(buildExamDiagnosisAttemptInput({ ... })),
  ])
    .then(() => {
      if (!isMountedRef.current) return;
      // 1.5초 후 next-problem 카드 추가
      setTimeout(() => {
        if (!isMountedRef.current) return;
        setEntries((prev) => [
          ...prev,
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
}, [draft, isDone, session, profile]);
```

`onFinalConfirm`은 `UseExamDiagnosisResult` 타입과 반환값에서 제거한다.

### `diagnosis-flow-card.tsx`

- `onFinalConfirm` prop 제거
- `isFinalReady` state + useEffect 제거 (350ms 지연 코드)
- final 노드 렌더링 변경:

```tsx
{node.kind === 'final' && (
  <View style={styles.finalStatusRow}>
    <Text style={styles.finalStatusText}>✓ 이 약점으로 정리되었습니다</Text>
  </View>
)}
```

---

## 에러 처리

저장 실패 시:
- `isDone` → `false` 롤백 (재시도 가능하도록 useEffect 재실행)
- `isSaving` → `false`
- 현재와 동일하게 조용히 실패 (사용자에게 에러 표시 없음 — 기존 동작 유지)

---

## 검증 기준

- `npx tsc --noEmit` 에러 없음
- 확인 문제 정답 선택 후 "이 약점으로 정리하기" 버튼 미노출
- 1.5초 후 자동으로 다음 문제 카드 등장
- 오작동(자동 버튼 눌림) 현상 없음
- 저장 실패 시 재시도 가능

# 보충 흐름 종료 마무리 한마디 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 복습 세션에서 보충(remedial) 흐름이 끝날 때 done-cta 버튼 직전에 따뜻한 고정 마무리 한마디(ai-bubble)를 항상 보여준다.

**Architecture:** 모든 보충 흐름 종료는 `advanceRemedialToNode`의 "다음 노드가 exit이거나 없음" 분기 한 곳으로 수렴한다. 그 분기에서 기존 `createDoneCtaEntry` 직전에 고정 문구 `ai-bubble` entry를 1개 append한다. 새 컴포넌트·네비게이션 변경 없음(`ai-bubble`은 entry-renderer가 이미 렌더). 순수 JS 변경이라 prebuild 불필요.

**Tech Stack:** Expo / React Native, TypeScript, Jest + @testing-library/react-native

---

## File Structure

- `features/quiz/hooks/use-review-session-screen.ts` — 마무리 문구 상수 export 추가 + `advanceRemedialToNode` 종료 분기에서 ai-bubble append
- `features/quiz/hooks/use-review-session-screen.test.ts` — 확인문제 정답 → exit → done-cta 앞 ai-bubble 검증 1케이스 (기존 `describe('entries-based flow')` 블록 내부)

기존 상수(`ROUTING_BUBBLE_TEXT`, `COACH_PROMPT_FOR_DETAIL`)는 모듈 비공개지만, 테스트가 문구 문자열을 중복 정의하지 않도록 새 상수는 **export**한다.

---

## Task 1: 보충 종료 시 고정 마무리 ai-bubble 추가

**Files:**
- Modify: `features/quiz/hooks/use-review-session-screen.ts` (상수: `:31-38` 근처, 로직: `advanceRemedialToNode` `:421-436`)
- Test: `features/quiz/hooks/use-review-session-screen.test.ts` (기존 `describe('entries-based flow', ...)` 내부, `:219` "정답 선택 시..." 테스트 뒤)

### 참고: 대상 경로 (테스트가 재현할 흐름)

`formula_understanding` 흐름(`data/remedial-flows/formula_understanding.ts`)에서:
- `onSelectChoice(0)` → 오답 → remedial 진입(`fu_step1_A_explain`)
- `onRemedialExplainPrimary('fu_step1_A_explain')` → `fu_step1_A_check` 도달
- `onRemedialCheckOption('fu_step1_A_check', 'correct')` → 옵션 `correct`의 `nextNodeId: 'fu_step1_exit'`
- `advanceRemedialToNode('fu_step1_exit')` → `fu_step1_exit`은 `kind: 'exit'` → 종료 분기 진입

현재 동작: 종료 분기에서 `createDoneCtaEntry`만 append → ai-bubble 없음.
변경 후: `createAiBubbleEntry(REMEDIAL_CLOSING_MESSAGE)` → `createDoneCtaEntry` 순서로 append.

- [ ] **Step 1: 실패하는 테스트 작성**

`features/quiz/hooks/use-review-session-screen.test.ts` 상단 import에 상수 추가. 3번 라인을 아래로 교체:

```ts
import { useReviewSessionScreen, REMEDIAL_CLOSING_MESSAGE } from './use-review-session-screen';
```

기존 `describe('entries-based flow', () => { ... })` 블록 내부, "정답 선택 시 choice-bubble + feedback-banner + done-cta 추가" 테스트(`it(...)`) 바로 뒤에 다음 테스트를 추가:

```ts
  it('확인문제 정답 → 보충 종료 시 done-cta 직전에 마무리 ai-bubble이 온다', async () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));

    // 오답 → remedial 진입 → explain primary → check 노드 → 정답 → exit
    await act(async () => {
      result.current.onSelectChoice(0);
    });
    act(() => {
      result.current.onRemedialExplainPrimary('fu_step1_A_explain');
    });
    act(() => {
      result.current.onRemedialCheckOption('fu_step1_A_check', 'correct');
    });

    const entries = result.current.entries;
    const doneIdx = entries.findIndex((e) => e.kind === 'done-cta');
    expect(doneIdx).toBeGreaterThan(0);

    const prev = entries[doneIdx - 1];
    expect(prev).toMatchObject({
      kind: 'ai-bubble',
      text: REMEDIAL_CLOSING_MESSAGE,
    });
  });
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx jest features/quiz/hooks/use-review-session-screen.test.ts -t "마무리 ai-bubble" 2>&1 | tail -20`
Expected: FAIL — `REMEDIAL_CLOSING_MESSAGE`가 export되지 않아 `undefined`이거나, `done-cta` 직전 entry가 `ai-bubble`이 아니어서 매처 실패.

- [ ] **Step 3: 마무리 문구 상수 추가 (export)**

`features/quiz/hooks/use-review-session-screen.ts`의 `:38` `const DONT_KNOW_AI_CHAT_THRESHOLD = 2;` 바로 아래에 추가:

```ts

// 보충(remedial) 흐름이 끝날 때 done-cta 직전에 보여주는 고정 마무리 한마디.
// 모든 보충 종료가 advanceRemedialToNode의 exit 분기로 수렴하므로, 약점별
// SummaryNode 유무와 무관하게 일관된 부드러운 마무리를 보장한다.
export const REMEDIAL_CLOSING_MESSAGE =
  '잘 따라오셨어요. 이 부분은 이제 한결 편하게 느껴질 거예요.';
```

- [ ] **Step 4: 종료 분기에 ai-bubble append**

`features/quiz/hooks/use-review-session-screen.ts`의 `advanceRemedialToNode` 종료 분기를 수정한다. 현재 코드(`:424-431` 부근):

```ts
    const next = getRemedialNode(task.weaknessId, nextNodeId);
    if (!next || next.kind === 'exit') {
      const isLast = currentStepIndex === steps.length - 1;
      reviewEntries.appendEntries([
        createDoneCtaEntry(isLast ? '이해했어요, 완료' : '이해했어요, 다음으로'),
      ]);
      return;
    }
```

를 다음으로 교체:

```ts
    const next = getRemedialNode(task.weaknessId, nextNodeId);
    if (!next || next.kind === 'exit') {
      const isLast = currentStepIndex === steps.length - 1;
      reviewEntries.appendEntries([
        createAiBubbleEntry(REMEDIAL_CLOSING_MESSAGE),
        createDoneCtaEntry(isLast ? '이해했어요, 완료' : '이해했어요, 다음으로'),
      ]);
      return;
    }
```

(`createAiBubbleEntry`는 이미 `:25`에서 import됨 — 추가 import 불필요.)

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx jest features/quiz/hooks/use-review-session-screen.test.ts -t "마무리 ai-bubble" 2>&1 | tail -20`
Expected: PASS (1 passed)

- [ ] **Step 6: 전체 review-session 테스트 회귀 확인**

Run: `npx jest features/quiz/hooks/use-review-session-screen.test.ts 2>&1 | tail -20`
Expected: 모든 테스트 PASS. 특히 "정답 선택 시 choice-bubble + feedback-banner + done-cta 추가"는 일반 스텝 정답 경로(`onSelectChoice` 정답)라 ai-bubble이 끼지 않으므로 그대로 통과해야 한다. 실패 시 변경이 의도치 않게 일반 정답 경로에 영향을 준 것 → Step 4 위치 재확인.

- [ ] **Step 7: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep -i "use-review-session-screen" | tail -10`
Expected: 출력 없음 (해당 파일 관련 타입 에러 없음)

- [ ] **Step 8: 커밋**

```bash
git add features/quiz/hooks/use-review-session-screen.ts features/quiz/hooks/use-review-session-screen.test.ts
git commit -m "$(cat <<'EOF'
feat(review): 보충 흐름 종료 시 부드러운 마무리 한마디 추가

advanceRemedialToNode의 exit 분기에서 done-cta 직전 고정 ai-bubble
(REMEDIAL_CLOSING_MESSAGE) append. 확인문제 정답 포함 모든 보충 종료에
일관 적용. 일반 스텝 정답·AI 챗 2턴 마무리는 미변경.

Spec: docs/superpowers/specs/2026-05-16-remedial-closing-message-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**1. Spec coverage:**
- "advanceRemedialToNode 종료 분기에 ai-bubble append" → Task 1 Step 4 ✅
- "고정 1줄 문구를 상수로 분리" → Task 1 Step 3 (`REMEDIAL_CLOSING_MESSAGE`) ✅
- "확인문제 정답 → exit → done-cta 앞 ai-bubble 테스트" → Task 1 Step 1 ✅
- "일반 스텝 정답 미변경" → Task 1 Step 6 회귀 검증으로 보장 ✅
- "AI 챗 2턴 마무리 미변경" → 변경이 `advanceRemedialToNode` 내부에 한정되어 `runFallbackChat` 경로 미접촉 ✅
- "SummaryNode 중복 허용(dedupe 없음)" → 추가 분기·dedupe 로직 없음, 설계대로 ✅
- "prebuild 불필요(순수 JS)" → 데이터/네이티브 변경 없음 ✅

**2. Placeholder scan:** TBD/TODO/"적절히 처리" 없음. 모든 코드 블록은 실제 적용 가능한 완성 코드. ✅

**3. Type consistency:** `REMEDIAL_CLOSING_MESSAGE`(string) — Step 3 정의, Step 1 테스트 import, Step 4 사용 일치. `createAiBubbleEntry(text: string)` 시그니처는 기존 `ROUTING_BUBBLE_TEXT`/`COACH_PROMPT_FOR_DETAIL` 사용처(`:334`, `:457`)와 동일 패턴. `entries` / `kind: 'ai-bubble'` / `text` 필드는 `review-entries.ts:9` 정의와 일치. ✅

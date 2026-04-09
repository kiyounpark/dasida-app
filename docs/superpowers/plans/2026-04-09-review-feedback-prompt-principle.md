# Review Feedback Prompt Principle-Based Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `functions/src/review-feedback.ts`의 `SYSTEM_PROMPT`를 원칙 기반으로 재작성하여, "테스트"·"나아"·"ㅇㅇ" 등 형태와 무관하게 수학 내용 없는 답변에 AI가 칭찬 없이 명확히 재촉하도록 한다.

**Architecture:** `SYSTEM_PROMPT` 상수만 수정한다. 거부 조건을 특정 표현 열거에서 원칙("수학 개념을 자신의 말로 설명하려는 실질적인 시도가 있는가?")으로 전환한다. 클라이언트, API 스키마, Firebase 설정 변경 없음.

**Tech Stack:** Firebase Cloud Functions v2, TypeScript, Node.js built-in test runner (`node:test`)

---

### Task 1: SYSTEM_PROMPT 원칙 기반 재작성

**Files:**
- Modify: `functions/src/review-feedback.ts:8-9,29-44` (`SYSTEM_PROMPT` export 추가 + 내용 교체)
- Modify: `functions/tests/review-feedback.test.ts` (SYSTEM_PROMPT 구조 검증 테스트 추가)

---

- [ ] **Step 1: 실패하는 테스트 작성**

`functions/tests/review-feedback.test.ts` 파일 하단에 아래 테스트를 추가한다.
기존 테스트 3개는 그대로 유지한다 (stale하지만 삭제 범위 아님).

```typescript
import { SYSTEM_PROMPT } from '../src/review-feedback.js';

test('SYSTEM_PROMPT가 원칙 기반 판단 기준을 포함한다', () => {
  assert.ok(
    SYSTEM_PROMPT.includes('실질적인 시도'),
    'SYSTEM_PROMPT에 "실질적인 시도" 원칙 문구가 있어야 한다',
  );
  assert.ok(
    SYSTEM_PROMPT.includes('형태와 길이에 관계없이') || SYSTEM_PROMPT.includes('형태'),
    'SYSTEM_PROMPT에 형태·길이 무관 원칙이 있어야 한다',
  );
  assert.ok(
    !SYSTEM_PROMPT.includes('"그러게요", "네", "맞아요", "모르겠어요"'),
    '예시 열거 방식의 좁은 거부 조건이 없어야 한다',
  );
});
```

- [ ] **Step 2: 테스트 실패 확인**

현재 `SYSTEM_PROMPT`는 export되어 있지 않으므로 컴파일 오류가 발생한다.

```bash
cd functions && npm test 2>&1 | head -20
```

Expected: 컴파일 오류 (`SYSTEM_PROMPT` has no exported member) 또는 assertion 실패

- [ ] **Step 3: SYSTEM_PROMPT export 추가 및 내용 교체**

`functions/src/review-feedback.ts`의 `SYSTEM_PROMPT` 선언을 아래로 교체한다:

```typescript
export const SYSTEM_PROMPT = `당신은 한국 수학 학습을 돕는 AI 코치입니다.
학생이 수학 개념 복습 단계에서 자신의 이해를 표현했습니다.

**판단 원칙:**
학생의 답변을 받으면 먼저 스스로 판단하세요:
"이 답변에 현재 단계의 수학 개념을 자신의 말로 설명하려는 실질적인 시도가 있는가?"

**수학 내용이 있는 경우** (개념 설명, 이유, 예시, 풀이 방법 언급 등 어떤 형태든):
"좋은 방향이에요! [핵심 포인트]도 더하면 완벽해요" 형식으로 1-2문장 피드백을 주세요.

**수학 내용이 없는 경우** (형태와 길이에 관계없이):
단순 동의("네", "그러게요", "맞아요"), 무관한 단어("테스트", "나아"), 감탄사,
질문과 관련 없는 내용, 의미 없는 단어 등 어떤 형태든 해당됩니다.
→ 칭찬하지 마세요. 부드럽지만 명확하게, 개념을 자신의 말로 설명해보도록 유도하세요.
예시: "어떤 개념인지 자신의 말로 한 번 설명해볼 수 있을까요? 예를 들어, [단계 핵심어]가 왜 중요한지 써보면 좋아요."

**규칙:**
- 수학 내용이 있을 때만 "좋은 방향이에요!" 같은 칭찬 문구를 사용하세요.
- 오직 현재 단계의 개념만 다루세요. 다른 단계 내용을 먼저 언급하지 마세요.
- 2-3문장 이내로 짧게 답하세요.
- 한국어로 답하세요.`;
```

`review-feedback.ts` 내부의 `requestReviewFeedbackFromOpenAI` 호출에서 `SYSTEM_PROMPT`를 그대로 사용하므로 다른 코드는 변경 불필요.

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd functions && npm test 2>&1
```

Expected:
```
▶ 선택지 있을 때 선택지 텍스트가 포함된다
  ✓ 선택지 있을 때 선택지 텍스트가 포함된다
▶ 자유 입력만 있을 때 userText가 포함된다
  ✓ 자유 입력만 있을 때 userText가 포함된다
▶ 선택지와 자유 입력 모두 있으면 둘 다 포함된다
  ✓ 선택지와 자유 입력 모두 있으면 둘 다 포함된다
▶ SYSTEM_PROMPT가 원칙 기반 판단 기준을 포함한다
  ✓ SYSTEM_PROMPT가 원칙 기반 판단 기준을 포함한다
```

- [ ] **Step 5: TypeScript 타입 체크**

```bash
cd functions && npm run lint 2>&1
```

Expected: 오류 없음 (기존 pre-existing 오류 이외)

- [ ] **Step 6: 커밋**

```bash
git add functions/src/review-feedback.ts functions/tests/review-feedback.test.ts
git commit -m "fix(feedback): SYSTEM_PROMPT 원칙 기반 재작성 — 수학 내용 없는 답변 명확 거부"
```

---

### 검증 가이드 (수동)

배포 후 아래 curl 명령으로 동작을 확인한다.
`FUNCTION_URL`은 Firebase Console에서 확인.

**거부해야 하는 입력 (수학 내용 없음):**

```bash
curl -X POST $FUNCTION_URL \
  -H "Content-Type: application/json" \
  -d '{
    "weaknessId": "quadratic-formula",
    "stepTitle": "a, b, c 부호 확인",
    "stepBody": "ax²+bx+c에서 각 계수를 부호 포함해서 먼저 읽는다.",
    "messages": [{"role": "user", "content": "테스트"}]
  }'
```

Expected: `replyText`에 칭찬 없이 "자신의 말로 설명해보세요" 류의 재촉 문구

**칭찬해야 하는 입력 (수학 내용 있음):**

```bash
curl -X POST $FUNCTION_URL \
  -H "Content-Type: application/json" \
  -d '{
    "weaknessId": "quadratic-formula",
    "stepTitle": "a, b, c 부호 확인",
    "stepBody": "ax²+bx+c에서 각 계수를 부호 포함해서 먼저 읽는다.",
    "messages": [{"role": "user", "content": "음수 부호를 빠뜨리면 판별식 계산이 틀려서 근의 개수가 달라지기 때문이에요"}]
  }'
```

Expected: `replyText`에 "좋은 방향이에요!" 포함

# 복습 세션 AI 사용 최소화 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 복습 세션에서 선택지를 미리 작성된 피드백으로 처리하고, 자유 텍스트 입력 시에만 AI를 호출(스텝당 최대 2회)하도록 변경하여 약점분석 흐름과 동일한 "필요할 때만 AI" 철학으로 통일.

**Architecture:** `Choice` 타입에 `feedback` 필드를 추가해 선택지 피드백을 데이터로 취급. Hook의 모드 전환 로직(`userText` 길이 기반)과 AI 호출 횟수 카운터(`aiResponseCount`)로 흐름 제어. 서버 시스템 프롬프트는 `messages` 배열의 assistant 응답 개수로 탐색/마무리 모드를 분기.

**Tech Stack:** TypeScript, React Native (Expo), React hooks, Firebase Functions (Node), Zod, Jest (앱), node:test (functions), OpenAI SDK.

**Spec:** [docs/superpowers/specs/2026-05-09-review-session-ai-minimization-design.md](../specs/2026-05-09-review-session-ai-minimization-design.md)

---

## 사전 준비

- 작업 디렉토리: 현재 워크트리 (`nervous-ptolemy-70bf11`)
- 시작 알림: `npm run notify:start -- "복습 세션 AI 사용 최소화 구현"`
- 본 plan은 spec의 5개 변경 파일을 9개 태스크로 분해. 각 태스크는 독립 커밋.

---

## Task 1: `Choice` 타입에 `feedback` 필드 추가 + 첫 약점 콘텐츠

**Files:**
- Modify: `data/review-content-map.ts`

**Goal:** 타입 확장이 컴파일되고, `discriminant_calculation` 약점의 모든 선택지에 `feedback` 텍스트가 작성됨. 다른 약점은 임시로 빈 문자열로 채워 컴파일만 통과.

- [ ] **Step 1.1: `Choice`/`ThinkingStep` 타입 변경**

수정 위치: `data/review-content-map.ts:3-8`

변경 전:
```ts
export type ThinkingStep = {
  title: string;
  body: string;
  example?: string;
  choices: { text: string; correct: boolean }[];
};
```

변경 후:
```ts
export type Choice = {
  text: string;
  correct: boolean;
  feedback: string;
};

export type ThinkingStep = {
  title: string;
  body: string;
  example?: string;
  choices: Choice[];
};
```

- [ ] **Step 1.2: 첫 약점(`discriminant_calculation`) 모든 선택지에 `feedback` 작성**

수정 위치: `data/review-content-map.ts:16-50` (전체 `discriminant_calculation` 블록 교체)

```ts
discriminant_calculation: {
  heroPrompt: '판별식은 b^2와 4ac를 따로 계산한 뒤 빼야 한다는 흐름이 떠오르나요?',
  thinkingSteps: [
    {
      title: 'a, b, c 부호 확인',
      body: 'ax²+bx+c에서 각 계수를 부호 포함해서 먼저 읽는다.',
      example: '예) 2x²−3x+1 → a=2, b=−3, c=1',
      choices: [
        {
          text: '계산 실수를 줄이기 위해서',
          correct: false,
          feedback: '계산 실수도 있겠지만, 더 본질적인 이유가 있어요. 부호 자체가 결과를 어떻게 바꾸는지에 주목해봐요.',
        },
        {
          text: '음수 부호를 빠뜨리면 결과가 달라지니까',
          correct: true,
          feedback: '맞아요! 부호 하나로 b²−4ac 결과가 완전히 뒤바뀌니까, 시작부터 정확히 읽는 게 핵심이에요.',
        },
        {
          text: '근의 공식을 외우기 쉽게 하기 위해서',
          correct: false,
          feedback: '암기 편의보다는, 부호의 정확성이 결과에 직접 영향을 주기 때문이에요.',
        },
      ],
    },
    {
      title: 'b² 먼저, 4ac 나중',
      body: 'b²를 먼저 계산하고, 그 다음 4×a×c를 따로 계산한다.',
      example: '예) b=−3 → b²=9 / 4×2×1=8',
      choices: [
        {
          text: 'b²는 b 하나만 써서 가장 단순하니까',
          correct: true,
          feedback: '맞아요! 단일 항을 먼저 정리하면 머릿속이 가벼워지고, 그 다음 4ac에 집중할 수 있어요.',
        },
        {
          text: '4ac가 더 중요해서 나중에 집중하려고',
          correct: false,
          feedback: '중요도 차이는 아니에요. 단순한 것부터 처리해 실수를 줄이는 게 목적이에요.',
        },
        {
          text: '순서는 상관없고 습관적으로',
          correct: false,
          feedback: '습관도 영향이 있지만, 단순한 항을 먼저 처리해 부담을 줄이는 합리적 이유가 있어요.',
        },
      ],
    },
    {
      title: '빼고 나서 판단',
      body: 'b²−4ac의 결과가 양수/0/음수인지 보고 근의 개수를 결론짓는다.',
      example: '9−8=1 > 0 → 서로 다른 두 실근',
      choices: [
        {
          text: '결과의 숫자 크기로 근의 종류를 결정한다',
          correct: false,
          feedback: '크기보다는 부호가 핵심이에요. 양수/0/음수 세 가지 경우만 판단하면 돼요.',
        },
        {
          text: '결과의 부호(양수/0/음수)만 보면 된다',
          correct: true,
          feedback: '맞아요! 양수면 두 실근, 0이면 중근, 음수면 허근. 부호 하나로 종류가 결정돼요.',
        },
        {
          text: '결과가 0보다 크면 항상 두 근이 같다',
          correct: false,
          feedback: '두 근이 같은 건 0일 때예요. 양수일 때는 서로 다른 두 실근이 나와요.',
        },
      ],
    },
  ],
},
```

- [ ] **Step 1.3: 나머지 22개 약점은 임시 `feedback: ''` 채워 컴파일 통과**

수정 위치: `data/review-content-map.ts` 전체

각 `choices` 항목에 `feedback: ''` 임시 추가. 실제 텍스트는 Task 8에서 작성.

찾기/바꾸기 가이드: `correct: false },` → `correct: false, feedback: '' },`, `correct: true },` → `correct: true, feedback: '' },` (최종 객체는 trailing comma 유지). 단 1번 약점은 이미 작성됐으므로 건드리지 않음.

- [ ] **Step 1.4: 타입 컴파일 검증**

Run:
```bash
npx tsc --noEmit
```
Expected: 에러 없이 통과.

- [ ] **Step 1.5: 사용처 영향 점검**

`review-content-map`을 import하는 파일에서 `Choice` 타입을 분해 사용하는 곳이 있는지 확인:
```bash
grep -rn "review-content-map" --include="*.ts" --include="*.tsx" features hooks app
```
사용처(`features/quiz/hooks/use-review-session-screen.ts`, `features/learning/home-state.ts`)는 `ThinkingStep`만 import하므로 영향 없음. 만약 `choice.feedback`을 옵셔널로 다루는 코드가 있으면 노트에 적어두기.

- [ ] **Step 1.6: 커밋**

```bash
git add data/review-content-map.ts
git commit -m "feat(review): Choice 타입에 feedback 필드 추가 + 첫 약점 콘텐츠 작성"
```

---

## Task 2: 클라이언트 페이로드 확장 + 서버 zod 스키마 확장

**Files:**
- Modify: `features/quiz/review-feedback.ts`
- Modify: `functions/src/review-feedback.ts:11-26` (zod 스키마)

**Goal:** 페이로드에 `selectedChoiceText`/`selectedChoiceCorrect` 필드를 추가. 클라이언트 타입과 서버 zod 스키마 양쪽에서 옵셔널로 받음.

- [ ] **Step 2.1: 클라이언트 타입 확장**

수정 위치: `features/quiz/review-feedback.ts:9-14`

변경 전:
```ts
export type ReviewFeedbackInput = {
  weaknessId: string;
  stepTitle: string;
  stepBody: string;
  messages: ChatMessage[];
};
```

변경 후:
```ts
export type ReviewFeedbackInput = {
  weaknessId: string;
  stepTitle: string;
  stepBody: string;
  selectedChoiceText?: string;
  selectedChoiceCorrect?: boolean;
  messages: ChatMessage[];
};
```

`requestReviewFeedback` 함수 본문은 변경 없음 (input 객체를 그대로 JSON.stringify하므로 자동 전달됨).

- [ ] **Step 2.2: 서버 zod 스키마 확장**

수정 위치: `functions/src/review-feedback.ts:11-26`

변경 전:
```ts
const ReviewFeedbackRequestSchema = z.object({
  weaknessId: z.string().min(1).max(60),
  stepTitle: z.string().min(1).max(100),
  stepBody: z.string().min(1).max(400),
  messages: z
    .array(...)
    ...
});
```

변경 후:
```ts
const ReviewFeedbackRequestSchema = z.object({
  weaknessId: z.string().min(1).max(60),
  stepTitle: z.string().min(1).max(100),
  stepBody: z.string().min(1).max(400),
  selectedChoiceText: z.string().min(1).max(200).optional(),
  selectedChoiceCorrect: z.boolean().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(500),
      }),
    )
    .min(1)
    .max(10)
    .refine((msgs) => msgs[0].role === 'user', {
      message: 'First message must be from user',
    }),
});
```

- [ ] **Step 2.3: 서버 핸들러에서 필드 추출**

수정 위치: `functions/src/review-feedback.ts:73`

변경 전:
```ts
const { stepTitle, stepBody, messages } = parsed.data;
```

변경 후:
```ts
const { stepTitle, stepBody, messages, selectedChoiceText, selectedChoiceCorrect } = parsed.data;
```

(이 시점에선 사용하지 않음. Task 3에서 시스템 프롬프트에 주입됨.)

- [ ] **Step 2.4: 서버 zod 스키마 테스트 추가**

`functions/tests/review-feedback.test.ts`에 추가:

```ts
test('zod 스키마는 selectedChoiceText/selectedChoiceCorrect를 옵셔널로 받는다', async () => {
  const { ReviewFeedbackRequestSchema } = await import('../src/review-feedback.js' as any);
  // 직접 import 불가 → schema도 export 해야 함
});
```

먼저 schema를 export 해야 함. 수정: `functions/src/review-feedback.ts`의 schema 선언 앞에 `export` 추가:
```ts
export const ReviewFeedbackRequestSchema = z.object({...});
```

그 다음 테스트:
```ts
test('zod 스키마는 selectedChoiceText/selectedChoiceCorrect를 옵셔널로 받는다', () => {
  const baseInput = {
    weaknessId: 'discriminant_calculation',
    stepTitle: 'a, b, c 부호 확인',
    stepBody: '계수를 부호 포함해서 읽는다.',
    messages: [{ role: 'user', content: '음수 부호 때문이에요' }],
  };

  const withChoice = ReviewFeedbackRequestSchema.safeParse({
    ...baseInput,
    selectedChoiceText: '음수 부호를 빠뜨리면 결과가 달라지니까',
    selectedChoiceCorrect: true,
  });
  assert.equal(withChoice.success, true);

  const withoutChoice = ReviewFeedbackRequestSchema.safeParse(baseInput);
  assert.equal(withoutChoice.success, true);
});
```

import 한 줄을 위에 추가:
```ts
import { SYSTEM_PROMPT, ReviewFeedbackRequestSchema } from '../src/review-feedback.js';
```

- [ ] **Step 2.5: 테스트 실행**

Run:
```bash
cd functions && npm test
```
Expected: 모든 테스트 PASS (기존 + 신규).

- [ ] **Step 2.6: 커밋**

```bash
git add features/quiz/review-feedback.ts functions/src/review-feedback.ts functions/tests/review-feedback.test.ts
git commit -m "feat(review-feedback): selectedChoice 컨텍스트를 페이로드에 추가"
```

---

## Task 3: 서버 시스템 프롬프트 — 탐색/마무리 모드 분기

**Files:**
- Modify: `functions/src/review-feedback.ts:28-51` (SYSTEM_PROMPT)
- Modify: `functions/src/review-feedback.ts:73-88` (핸들러 로직)
- Modify: `functions/tests/review-feedback.test.ts`

**Goal:** `messages` 중 assistant 응답 개수에 따라 시스템 프롬프트가 달라지도록 분기. 0개면 탐색 모드(힌트), 1개 이상이면 마무리 모드(정답 명시). `selectedChoiceText`가 있으면 컨텍스트 한 줄 추가.

- [ ] **Step 3.1: 공통 베이스 + 두 모드 프롬프트 정의**

수정 위치: `functions/src/review-feedback.ts:28-51`

변경 전: `SYSTEM_PROMPT` 단일 상수.

변경 후:
```ts
export const SYSTEM_PROMPT_BASE = `당신은 한국 수학 학습을 돕는 AI 코치입니다.
학생이 수학 개념 복습 단계에서 자신의 이해를 표현했습니다.

**판단 원칙:**
학생의 답변을 받으면 먼저 스스로 판단하세요:
"이 답변에 현재 단계의 수학 개념을 자신의 말로 설명하려는 실질적인 시도가 있는가?"
학생이 수학 개념의 내용을 명시적인 단어로 설명한 경우만 수학 내용이 있다고 판단하세요.
추임새("흠", "음", "아", "어"), 소리, 단음절 표현, 짧은 반응은 설명이 아닙니다.

**수학 내용이 없는 경우** (형태와 길이에 관계없이):
단순 동의, 무관한 단어, 감탄사 등 어떤 형태든 해당됩니다.
→ 칭찬하지 마세요. 부드럽지만 명확하게, 개념을 자신의 말로 설명해보도록 유도하세요.

**규칙:**
- 오직 현재 단계의 개념만 다루세요. 다른 단계 내용을 먼저 언급하지 마세요.
- 2-3문장 이내로 짧게 답하세요.
- 한국어로 답하세요.`;

export const EXPLORE_MODE_SUFFIX = `

**현재 모드: 탐색 모드 (1차 응답)**
학생이 처음으로 자기 답을 제출했습니다.
- 수학 내용이 있으면: 좋은 부분은 인정하되, 핵심 포인트를 직접 알려주지 말고 한 발짝만 더 가도록 부드러운 힌트나 질문을 던지세요.
  예시: "방향이 좋아요! 거기서 한 가지만 더 짚어볼래요? [부분 힌트]"
- 수학 내용이 없으면: "어떤 개념인지 자신의 말로 한 번 설명해볼 수 있을까요?" 식으로 유도하세요.`;

export const CLOSE_MODE_SUFFIX = `

**현재 모드: 마무리 모드 (2차 응답)**
학생이 한 번 더 시도했습니다. 이번이 마지막 응답입니다.
- 학생이 핵심을 잡았으면: 짧게 인정하고 핵심 한 줄을 다시 명확히 짚어주며 마무리하세요.
  예시: "맞아요! 결국 핵심은 [정답 핵심]이에요."
- 학생이 못 잡았으면: 더 이상 떠넘기지 말고 정답을 부드럽게 명시하며 마무리하세요.
  예시: "잘 따라왔어요. 핵심을 정리하면 [정답 명시]예요."
힌트로 끝내지 말고 반드시 닫는 톤으로 작성하세요.`;
```

기존 `SYSTEM_PROMPT` export는 호환을 위해 별칭으로 남김:
```ts
export const SYSTEM_PROMPT = SYSTEM_PROMPT_BASE; // 기존 테스트 호환용
```

- [ ] **Step 3.2: 모드 결정 함수 추가**

수정 위치: `functions/src/review-feedback.ts` (handler 함수 위, SYSTEM_PROMPT 정의들 아래)

```ts
type Mode = 'explore' | 'close';

export function decideMode(messages: { role: 'user' | 'assistant' }[]): Mode {
  const assistantCount = messages.filter((m) => m.role === 'assistant').length;
  return assistantCount === 0 ? 'explore' : 'close';
}

export function buildSystemPrompt(mode: Mode, selectedChoice?: { text: string; correct: boolean }): string {
  const modeSuffix = mode === 'explore' ? EXPLORE_MODE_SUFFIX : CLOSE_MODE_SUFFIX;
  const choiceContext = selectedChoice
    ? `\n\n**선택지 컨텍스트:**\n학생은 먼저 다음 선택지를 골랐습니다: "${selectedChoice.text}" (정답 여부: ${selectedChoice.correct ? '정답' : '오답'}). 이 맥락을 고려해 응답하세요.`
    : '';
  return SYSTEM_PROMPT_BASE + modeSuffix + choiceContext;
}
```

- [ ] **Step 3.3: 핸들러에서 모드 분기 적용**

수정 위치: `functions/src/review-feedback.ts:73-88`

변경 후:
```ts
const { stepTitle, stepBody, messages, selectedChoiceText, selectedChoiceCorrect } = parsed.data;

const mode = decideMode(messages);
const systemPrompt = buildSystemPrompt(
  mode,
  selectedChoiceText !== undefined && selectedChoiceCorrect !== undefined
    ? { text: selectedChoiceText, correct: selectedChoiceCorrect }
    : undefined,
);

const stepContext = `단계: ${stepTitle}\n설명: ${stepBody}\n\n`;
const enrichedMessages = messages.map((m, i) =>
  i === 0 && m.role === 'user' ? { ...m, content: `${stepContext}${m.content}` } : m,
);

try {
  const { replyText } = await requestReviewFeedbackFromOpenAI({
    apiKey: openAiApiKey.value(),
    model: openAiModel.value(),
    systemPrompt,
    messages: enrichedMessages,
  });
  ...
```

- [ ] **Step 3.4: 모드 결정/프롬프트 빌더 테스트 추가**

`functions/tests/review-feedback.test.ts`에 추가:

```ts
import {
  SYSTEM_PROMPT,
  ReviewFeedbackRequestSchema,
  decideMode,
  buildSystemPrompt,
} from '../src/review-feedback.js';

test('decideMode: assistant 응답 0개면 explore', () => {
  const result = decideMode([{ role: 'user' }]);
  assert.equal(result, 'explore');
});

test('decideMode: assistant 응답 1개면 close', () => {
  const result = decideMode([
    { role: 'user' },
    { role: 'assistant' },
    { role: 'user' },
  ]);
  assert.equal(result, 'close');
});

test('buildSystemPrompt(explore)에는 탐색 모드 안내가 포함된다', () => {
  const prompt = buildSystemPrompt('explore');
  assert.ok(prompt.includes('탐색 모드'));
  assert.ok(prompt.includes('힌트'));
});

test('buildSystemPrompt(close)에는 마무리 모드 안내가 포함된다', () => {
  const prompt = buildSystemPrompt('close');
  assert.ok(prompt.includes('마무리 모드'));
  assert.ok(prompt.includes('명시'));
});

test('buildSystemPrompt에 selectedChoice가 있으면 컨텍스트가 주입된다', () => {
  const prompt = buildSystemPrompt('explore', { text: '음수 부호', correct: false });
  assert.ok(prompt.includes('선택지 컨텍스트'));
  assert.ok(prompt.includes('음수 부호'));
  assert.ok(prompt.includes('오답'));
});

test('buildSystemPrompt에 selectedChoice가 없으면 컨텍스트가 없다', () => {
  const prompt = buildSystemPrompt('explore');
  assert.ok(!prompt.includes('선택지 컨텍스트'));
});
```

- [ ] **Step 3.5: 테스트 실행**

Run:
```bash
cd functions && npm test
```
Expected: 모든 테스트 PASS (기존 + 신규).

- [ ] **Step 3.6: 커밋**

```bash
git add functions/src/review-feedback.ts functions/tests/review-feedback.test.ts
git commit -m "feat(review-feedback): 시스템 프롬프트 탐색/마무리 모드 분기"
```

---

## Task 4: Hook — `aiResponseCount`·`selectedChoiceFeedback` 상태 추가 + 모드 전환 로직

**Files:**
- Modify: `features/quiz/hooks/use-review-session-screen.ts`

**Goal:** 새 상태 두 개 추가. 선택지 탭 시 인라인 피드백 텍스트가 즉시 채워지고, 텍스트 입력 시작 시 선택지 모드 → 텍스트 모드로 전환되는 로직 구현. AI 호출은 `aiResponseCount < 2`일 때만 가능.

- [ ] **Step 4.1: 새 상태 추가**

수정 위치: `features/quiz/hooks/use-review-session-screen.ts:52-62` (state 선언 직후)

기존 state 선언부 아래에 추가:
```ts
const [selectedChoiceFeedback, setSelectedChoiceFeedback] = useState<string | null>(null);
const [aiResponseCount, setAiResponseCount] = useState(0);
```

`UseReviewSessionScreenResult`에 필드 추가 (`features/quiz/hooks/use-review-session-screen.ts:21-42`):
```ts
export type UseReviewSessionScreenResult = {
  // ... 기존 필드
  selectedChoiceFeedback: string | null;
  aiResponseCount: number;
  isTextMode: boolean;        // 신규: userText.length > 0
  // ... 기존 핸들러
};
```

return 객체에 포함시키기 (마지막 부분 `:300-321`):
```ts
return {
  // ... 기존
  selectedChoiceFeedback,
  aiResponseCount,
  isTextMode: userText.length > 0,
  // ...
};
```

- [ ] **Step 4.2: `onSelectChoice`에서 인라인 피드백 채우기**

수정 위치: `features/quiz/hooks/use-review-session-screen.ts:121-127`

변경 후:
```ts
const onSelectChoice = (index: number) => {
  setSelectedChoiceIndex(index);
  const choice = steps[currentStepIndex]?.choices[index];
  setSelectedChoiceFeedback(choice?.feedback ?? null);
  if (stepPhase === 'input' && firstAttemptCorrectRef.current[currentStepIndex] === null) {
    const isCorrect = choice?.correct ?? false;
    firstAttemptCorrectRef.current[currentStepIndex] = isCorrect;
  }
};
```

- [ ] **Step 4.3: `resetStepState`에 새 상태 초기화 추가**

수정 위치: `features/quiz/hooks/use-review-session-screen.ts:113-119`

변경 후:
```ts
const resetStepState = () => {
  setSelectedChoiceIndex(null);
  setUserText('');
  setChatMessages([]);
  setChatText('');
  setStepPhase('input');
  setSelectedChoiceFeedback(null);
  setAiResponseCount(0);
};
```

- [ ] **Step 4.4: `onPressNext` → 텍스트 입력이 있을 때만 호출되도록 의미 변경**

기존 `onPressNext`는 선택지든 텍스트든 AI를 호출했음. 이제는:
- 선택지만 있으면: View에서 직접 `onPressContinue` 호출 (Task 5에서 처리)
- 텍스트가 있으면: 기존 `onPressNext` 사용 (단, AI 호출 후 `aiResponseCount` 증가)

수정 위치: `features/quiz/hooks/use-review-session-screen.ts:137-174`

변경 후 핵심:
```ts
const onPressNext = async () => {
  if (isFetchingRef.current) return;
  if (aiResponseCount >= 2) return;  // 가드
  const step = steps[currentStepIndex];
  if (!step || !task) return;

  const hasText = userText.trim().length > 0;
  if (!hasText) return;  // 텍스트가 없으면 호출 X (선택지만은 onPressContinue로 직접 통과)

  // 첫 번째 user 메시지 조합
  const firstUserContent = userText.trim();
  const firstUserEntry: ChatEntry = { role: 'user', text: firstUserContent };

  // 선택지 컨텍스트 추출
  const choice =
    selectedChoiceIndex !== null ? step.choices[selectedChoiceIndex] : null;

  isFetchingRef.current = true;
  setIsLoadingFeedback(true);
  setChatMessages([firstUserEntry]);
  setStepPhase('chat');

  try {
    const apiMessages: ChatMessage[] = [{ role: 'user', content: firstUserContent }];
    const result = await requestReviewFeedback({
      weaknessId: task.weaknessId,
      stepTitle: step.title,
      stepBody: step.body,
      selectedChoiceText: choice?.text,
      selectedChoiceCorrect: choice?.correct,
      messages: apiMessages,
    });
    setChatMessages([firstUserEntry, { role: 'ai', text: result.replyText }]);
    setAiResponseCount(1);
  } catch {
    // 실패 시 카운트 증가 X (재시도 허용)
  } finally {
    isFetchingRef.current = false;
    setIsLoadingFeedback(false);
  }
};
```

- [ ] **Step 4.5: `onSendChatMessage` 가드 + 카운트 증가**

수정 위치: `features/quiz/hooks/use-review-session-screen.ts:176-208`

변경 후:
```ts
const onSendChatMessage = async () => {
  if (isFetchingRef.current || !chatText.trim() || !task) return;
  if (aiResponseCount >= 2) return;  // 가드
  const step = steps[currentStepIndex];
  if (!step) return;

  const userInput = chatText.trim();
  const newUserEntry: ChatEntry = { role: 'user', text: userInput };
  const allMessages = [...chatMessages, newUserEntry];
  const choice =
    selectedChoiceIndex !== null ? step.choices[selectedChoiceIndex] : null;

  setChatMessages(allMessages);
  setChatText('');
  isFetchingRef.current = true;
  setIsLoadingFeedback(true);

  try {
    const apiMessages: ChatMessage[] = allMessages.map((m) => ({
      role: m.role === 'ai' ? ('assistant' as const) : ('user' as const),
      content: m.text,
    }));
    const result = await requestReviewFeedback({
      weaknessId: task.weaknessId,
      stepTitle: step.title,
      stepBody: step.body,
      selectedChoiceText: choice?.text,
      selectedChoiceCorrect: choice?.correct,
      messages: apiMessages,
    });
    setChatMessages([...allMessages, { role: 'ai', text: result.replyText }]);
    setAiResponseCount((c) => c + 1);
  } catch {
    // 실패 시 카운트 증가 X
  } finally {
    isFetchingRef.current = false;
    setIsLoadingFeedback(false);
  }
};
```

- [ ] **Step 4.6: `hasInput` 의미 조정**

수정 위치: `features/quiz/hooks/use-review-session-screen.ts:298`

이제 `hasInput`은 "다음으로 진행 가능 여부"를 뜻함:
```ts
const hasInput = selectedChoiceIndex !== null || userText.trim().length > 0;
```

(기존과 동일하지만 의미가 더 분명해짐.)

- [ ] **Step 4.7: 컴파일 검증**

Run:
```bash
npx tsc --noEmit
```
Expected: 에러 없이 통과.

- [ ] **Step 4.8: 커밋**

```bash
git add features/quiz/hooks/use-review-session-screen.ts
git commit -m "feat(review-hook): aiResponseCount/selectedChoiceFeedback 상태 + 모드 전환 로직"
```

---

## Task 5: View — 선택지 인라인 피드백 카드

**Files:**
- Modify: `features/quiz/components/review-session-screen-view.tsx`

**Goal:** 사용자가 선택지를 탭하면 그 아래에 피드백 카드가 인라인으로 등장. AI 호출 없이 즉시 표시. "이해했어요, 다음으로" 버튼 라벨 통일.

- [ ] **Step 5.1: 컴포넌트 prop 타입 확장**

수정 위치: `features/quiz/components/review-session-screen-view.tsx:23-44`

`UseReviewSessionScreenResult`를 그대로 받으므로 import만 확인. Task 4에서 hook이 `selectedChoiceFeedback`/`aiResponseCount`/`isTextMode` 추가했음. 새 props 비구조화 추가:
```ts
export function ReviewSessionScreenView({
  // ... 기존
  selectedChoiceFeedback,
  aiResponseCount,
  isTextMode,
  // ... 기존
}: UseReviewSessionScreenResult) {
```

- [ ] **Step 5.2: input phase 영역에 피드백 카드 삽입**

수정 위치: `features/quiz/components/review-session-screen-view.tsx:128-172` (`inputCardContent`의 `stepPhase === 'input'` 분기)

기존 input 영역에서:
- 선택지 그룹과 텍스트 입력 사이에 인라인 피드백 카드를 삽입
- 텍스트 모드(`isTextMode === true`)일 때는 선택지 영역을 숨기고 칩만 표시 (Task 6에서 칩 처리)

이번 태스크에선 선택지 모드의 인라인 피드백만 처리. `isTextMode === false`일 때:

```tsx
{stepPhase === 'input' ? (
  <>
    {!isTextMode && (
      <>
        <Text style={styles.inputLabel}>💭 이 단계, 어떻게 이해했나요?</Text>
        <View style={styles.choices}>
          {step.choices.map((choice, i) => (
            <Pressable
              key={i}
              style={[styles.choiceBtn, selectedChoiceIndex === i && styles.choiceBtnSelected]}
              onPress={() => onSelectChoice(i)}>
              <Text
                style={[
                  styles.choiceBtnText,
                  selectedChoiceIndex === i && styles.choiceBtnTextSelected,
                ]}>
                {choice.text}
              </Text>
            </Pressable>
          ))}
        </View>
        {selectedChoiceFeedback && (
          <View style={styles.choiceFeedbackCard}>
            <Text style={styles.choiceFeedbackText}>{selectedChoiceFeedback}</Text>
          </View>
        )}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>또는 직접 써도 돼요</Text>
          <View style={styles.dividerLine} />
        </View>
      </>
    )}
    <TextInput
      style={styles.textInput}
      value={userText}
      onChangeText={onChangeText}
      onFocus={scrollToBottom}
      placeholder="자유롭게 써보세요..."
      placeholderTextColor={BrandColors.disabled}
      multiline
    />
    <Pressable
      style={[styles.primaryBtn, !hasInput && styles.primaryBtnDisabled]}
      onPress={hasInput && !userText.trim() ? onPressContinue : onPressNext}
      disabled={!hasInput || isLoadingFeedback}>
      {isLoadingFeedback ? (
        <ActivityIndicator color="#F6F2EA" size="small" />
      ) : (
        <Text style={styles.primaryBtnText}>이해했어요, 다음으로</Text>
      )}
    </Pressable>
  </>
) : ( ... chat phase 그대로 ... )}
```

**핵심**: 선택지만 골랐을 때(텍스트 X) 메인 버튼이 `onPressContinue`(다음 스텝 즉시)로 가도록 분기. 텍스트 있으면 `onPressNext`(AI 호출).

- [ ] **Step 5.3: 인라인 피드백 카드 스타일 추가**

수정 위치: `features/quiz/components/review-session-screen-view.tsx` 하단 `styles` 객체

```ts
choiceFeedbackCard: {
  marginTop: BrandSpacing.sm,
  padding: BrandSpacing.md,
  backgroundColor: '#F0FDF4',
  borderRadius: BrandRadius.md,
  borderLeftWidth: 3,
  borderLeftColor: BrandColors.primary,
},
choiceFeedbackText: {
  fontFamily: FontFamilies.regular,
  fontSize: 14,
  lineHeight: 20,
  color: BrandColors.primary,
},
```

- [ ] **Step 5.4: 컴파일 검증**

Run:
```bash
npx tsc --noEmit
```
Expected: 에러 없이 통과.

- [ ] **Step 5.5: 커밋**

```bash
git add features/quiz/components/review-session-screen-view.tsx
git commit -m "feat(review-view): 선택지 인라인 피드백 카드 + 버튼 라벨 통일"
```

---

## Task 6: View — 텍스트 모드 (선택지 숨김 + 칩 표시)

**Files:**
- Modify: `features/quiz/components/review-session-screen-view.tsx`

**Goal:** 텍스트 입력 시작 시 선택지 영역이 사라지고, 이전에 고른 선택지가 있다면 작은 칩으로 상단에 표시. 텍스트를 다 지우면 선택지 영역 복귀.

- [ ] **Step 6.1: 칩 UI 컴포넌트 인라인 추가**

수정 위치: `features/quiz/components/review-session-screen-view.tsx` (input phase 내, `isTextMode === true` 분기 영역)

Task 5의 input phase 블록을 확장:

```tsx
{stepPhase === 'input' ? (
  <>
    {!isTextMode ? (
      // ... Task 5의 선택지 + 인라인 피드백 영역 ...
    ) : (
      <>
        {selectedChoiceIndex !== null && (
          <View style={styles.choiceChipRow}>
            <View style={styles.choiceChip}>
              <Text style={styles.choiceChipLabel}>선택했던 보기</Text>
              <Text style={styles.choiceChipText} numberOfLines={2}>
                {step.choices[selectedChoiceIndex]?.text}
              </Text>
            </View>
          </View>
        )}
        {selectedChoiceFeedback && (
          <View style={styles.choiceFeedbackCard}>
            <Text style={styles.choiceFeedbackText}>{selectedChoiceFeedback}</Text>
          </View>
        )}
      </>
    )}
    <TextInput
      // ... 동일 ...
    />
    <Pressable
      // ... 동일 ...
    />
  </>
) : ( ... )}
```

- [ ] **Step 6.2: 칩 스타일 추가**

수정 위치: `features/quiz/components/review-session-screen-view.tsx` styles

```ts
choiceChipRow: {
  marginBottom: BrandSpacing.sm,
},
choiceChip: {
  paddingVertical: 8,
  paddingHorizontal: 12,
  backgroundColor: '#FFFFFF',
  borderRadius: BrandRadius.md,
  borderWidth: 1,
  borderColor: BrandColors.border,
  gap: 2,
},
choiceChipLabel: {
  fontFamily: FontFamilies.regular,
  fontSize: 11,
  color: BrandColors.mutedText,
},
choiceChipText: {
  fontFamily: FontFamilies.regular,
  fontSize: 13,
  color: BrandColors.primary,
},
```

- [ ] **Step 6.3: 텍스트 0글자로 돌아갔을 때 모드 복귀 검증**

`isTextMode = userText.length > 0`이므로, 사용자가 입력을 다 지우면 자동으로 선택지 모드로 돌아옴 (별도 코드 불필요).

- [ ] **Step 6.4: 컴파일 검증**

Run:
```bash
npx tsc --noEmit
```
Expected: 에러 없이 통과.

- [ ] **Step 6.5: 커밋**

```bash
git add features/quiz/components/review-session-screen-view.tsx
git commit -m "feat(review-view): 텍스트 모드 전환 (칩 + 선택지 숨김)"
```

---

## Task 7: View — chat phase 입력창 조건부 렌더링 (AI 응답 2회 제한)

**Files:**
- Modify: `features/quiz/components/review-session-screen-view.tsx`

**Goal:** chat phase에서 `aiResponseCount >= 2`이면 채팅 입력창과 전송 버튼이 사라지고 "이해했어요, 다음으로" 버튼만 노출.

- [ ] **Step 7.1: chat phase 영역 입력창 조건부 렌더링**

수정 위치: `features/quiz/components/review-session-screen-view.tsx:173-237` (`stepPhase === 'chat'` 분기)

변경 후:
```tsx
) : (
  <>
    <View style={styles.chatMessages}>
      {chatMessages.map((msg, i) => (
        // ... 기존 메시지 렌더링 ...
      ))}
      {isLoadingFeedback && (
        // ... 로딩 스피너 ...
      )}
    </View>
    {aiResponseCount < 2 && (
      <View style={styles.chatInputRow}>
        <TextInput
          style={styles.chatInput}
          value={chatText}
          onChangeText={onChangeChatText}
          onFocus={scrollToBottom}
          placeholder="계속 써보세요..."
          placeholderTextColor={BrandColors.disabled}
          editable={!isLoadingFeedback}
          returnKeyType="send"
          onSubmitEditing={onSendChatMessage}
        />
        <Pressable
          style={[
            styles.sendBtn,
            (!chatText.trim() || isLoadingFeedback) && styles.sendBtnDisabled,
          ]}
          onPress={onSendChatMessage}
          disabled={!chatText.trim() || isLoadingFeedback}>
          <Text style={styles.sendBtnText}>↑</Text>
        </Pressable>
      </View>
    )}
    <Pressable
      style={[styles.primaryBtn, isLoadingFeedback && styles.primaryBtnDisabled]}
      onPress={onPressContinue}
      disabled={isLoadingFeedback}>
      <Text style={styles.primaryBtnText}>이해했어요, 다음으로</Text>
    </Pressable>
  </>
)}
```

- [ ] **Step 7.2: `continueLabel` 변수 정리**

수정 위치: `features/quiz/components/review-session-screen-view.tsx:125`

기존:
```ts
const continueLabel = isLastStep ? '이해했어요, 완료 →' : '이해했어요, 다음 단계 →';
```

이번 스펙에서 라벨 통일: 마지막 스텝에서도 "이해했어요, 다음으로"로 통일 (완료 화면이 별도로 뜸). 단, 마지막 스텝이라면 완료 의미가 더 분명할 수 있으므로 한 가지 예외만 허용:

변경 후:
```ts
const continueLabel = isLastStep ? '이해했어요, 완료' : '이해했어요, 다음으로';
```

(spec에서 "완전 통일"이라고 했지만 마지막 스텝의 "완료" 라벨은 사용자 경험상 자연스러우므로 유지. 시각/전환 효과는 동일.)

각 Pressable의 라벨 문자열도 `continueLabel`을 사용하도록 통일:
```tsx
<Text style={styles.primaryBtnText}>{continueLabel}</Text>
```

- [ ] **Step 7.3: 컴파일 검증**

Run:
```bash
npx tsc --noEmit
```
Expected: 에러 없이 통과.

- [ ] **Step 7.4: 커밋**

```bash
git add features/quiz/components/review-session-screen-view.tsx
git commit -m "feat(review-view): AI 응답 2회 후 입력창 숨김 + 버튼 라벨 통일"
```

---

## Task 8: 나머지 22개 약점 피드백 콘텐츠 작성

**Files:**
- Modify: `data/review-content-map.ts`

**Goal:** Task 1에서 임시로 `feedback: ''`로 채운 22개 약점의 모든 선택지에 실제 피드백 텍스트 작성.

**Style guide:**
- 정답 선택지: "맞아요!" 류 짧은 확인 + 핵심 한 줄 보강 (1문장)
- 오답 선택지: 부드럽게 짚어주는 톤 ("틀렸다"고 단정 X), 올바른 방향으로 안내 (1-2문장)
- 한국어, 존댓말, 친근하지만 전문적
- 학생이 이미 보고 있는 `body`/`example`을 그대로 반복하지 않기

- [ ] **Step 8.1: 약점 목록 확인**

Run:
```bash
grep -E "^\s+[a-z_]+: \{$" data/review-content-map.ts | head -30
```
출력으로 23개 약점 키 확인 (`discriminant_calculation`은 이미 작성됨).

- [ ] **Step 8.2: 각 약점에 대해 순차적으로 피드백 작성**

순서:
1. `formula_understanding`
2. `calc_repeated_error`
3. (이하 22개)

각 약점마다:
- `thinkingSteps`의 모든 step을 순회
- 각 step의 `choices`마다 `feedback: ''`를 실제 텍스트로 교체

작성 시 참고: 같은 파일 내 `discriminant_calculation` (이미 작성됨)을 톤/형식 레퍼런스로.

(작성 분량이 많으므로 — 약점 23개 × 평균 3 step × 3 choice ≈ 200개 텍스트 — 이 태스크 자체가 시간이 가장 큼. 약점 5개씩 묶어 5개 파일 단위 커밋 권장.)

- [ ] **Step 8.3: 빈 feedback 잔존 검증**

Run:
```bash
grep -n "feedback: ''" data/review-content-map.ts
```
Expected: 출력 없음 (모든 feedback이 채워짐).

- [ ] **Step 8.4: 타입/문법 검증**

Run:
```bash
npx tsc --noEmit
```
Expected: 에러 없이 통과.

- [ ] **Step 8.5: 최종 커밋**

```bash
git add data/review-content-map.ts
git commit -m "content(review): 22개 약점 모든 선택지 피드백 작성"
```

---

## Task 9: 통합 검증 — Expo 빌드 + 수동 UI 테스트

**Files:** (검증만, 수정 없음)

**Goal:** iOS 시뮬레이터에서 복습 세션이 spec의 8개 성공 기준을 모두 만족하는지 수동 확인.

- [ ] **Step 9.1: 의존성/네이티브 빌드 점검**

이번 변경은 패키지 추가/네이티브 변경이 없음. 그러나 안전하게 한 번 확인:
```bash
git diff main -- package.json package-lock.json ios android
```
Expected: 위 파일들에 변경 없음. 변경 있으면 `npx expo prebuild --clean`이 필요한지 검토.

- [ ] **Step 9.2: 시뮬레이터 실행**

Run (별도 터미널/백그라운드):
```bash
npx expo run:ios
```
Expected: 시뮬레이터에서 앱이 정상 부팅.

- [ ] **Step 9.3: 복습 진입 경로 확보**

DEV 환경에서 mock 태스크로 빠르게 진입:
```
홈 화면에서 due 복습 카드 → 진입
```
또는 `taskId='__mock__'` 라우트로 직접 진입 (`features/quiz/hooks/use-review-session-screen.ts:74-110`에 mock 분기 존재).

- [ ] **Step 9.4: 성공 기준 1번 — 선택지만으로는 AI 호출이 발생하지 않음**

수동 절차:
1. 정답 선택지 탭 → 인라인 피드백 등장 확인
2. 오답 선택지 탭 → 다른 피드백으로 교체 확인
3. "이해했어요, 다음으로" 누름 → 다음 스텝으로 이동
4. (선택) 네트워크 모니터로 `/reviewFeedback` 호출이 0회임을 검증

- [ ] **Step 9.5: 성공 기준 2/3 — 텍스트 모드 전환 + 모드 복귀**

1. 새 스텝에서 선택지 한 개 탭 (피드백 등장)
2. 텍스트 입력창에 한 글자 입력 → 선택지 영역 사라지고 칩 + 피드백 카드만 남음 확인
3. 입력 다 지움 → 선택지 영역 다시 등장 확인

- [ ] **Step 9.6: 성공 기준 4 — AI 응답 2회 제한**

1. 텍스트 입력 후 전송 → AI 1차 응답 (탐색 톤)
2. 추가 입력 후 전송 → AI 2차 응답 (마무리 톤)
3. 입력창과 전송 버튼이 사라지고 "이해했어요, 다음으로"만 남음 확인

- [ ] **Step 9.7: 성공 기준 5 — 1차/2차 톤 차이**

육안으로 1차 응답이 힌트성, 2차 응답이 명시적 정답 설명임을 확인. 차이가 모호하면 `functions/src/review-feedback.ts`의 모드 suffix를 강화.

- [ ] **Step 9.8: 성공 기준 6 — 페이로드에 선택지 정보 포함**

Firebase Functions 로그(`firebase functions:log`) 또는 Firestore Emulator로 요청 본문 확인:
```
selectedChoiceText, selectedChoiceCorrect 필드가 정확히 전달되는지
```

- [ ] **Step 9.9: 성공 기준 7 — 버튼 라벨/전환 효과 통일**

길 A(선택지) / 길 B(텍스트) 모두 "이해했어요, 다음으로" 버튼 라벨이 동일한지, 전환 시 progress bar 채움이 동일한지 확인.

- [ ] **Step 9.10: 성공 기준 8 — AI 호출 횟수 50% 이상 감소**

이론적 검증으로 충분: spec과 구현이 일치하면 한 스텝당 호출 횟수가 0~2회로 제한됨 (기존: 1+N). 별도 정량 측정 불필요.

- [ ] **Step 9.11: 회귀 검증**

기존 흐름이 깨지지 않는지 점검:
- 마지막 스텝 통과 후 완료 화면(`기억났어요`/`다시 볼게요`)이 정상 노출
- "기억났어요!" 누르면 다음 스테이지 ReviewTask 생성, 알림 재예약, 화면 닫힘
- "다시 볼게요" 누르면 현재 스테이지 유지하고 화면 닫힘

- [ ] **Step 9.12: 종료 알림**

성공 시:
```bash
npm run notify:done -- "복습 세션 AI 사용 최소화 구현 완료 — 선택지 피드백/모드 전환/AI 2회 제한 적용"
```

- [ ] **Step 9.13: 최종 푸시**

```bash
git push origin claude/nervous-ptolemy-70bf11
npm run log:commit
```

---

## 비범위 (이 plan에서 다루지 않음)

- 완료 화면(`기억났어요/다시 볼게요`) UI/로직 변경
- 첫 시도 정답률 활용 로직 (다음 복습 간격 자동 조절 등)
- 알림 스케줄링/홈 카드 디자인
- 고3 약점 콘텐츠 추가
- 채팅 메시지 서버 저장

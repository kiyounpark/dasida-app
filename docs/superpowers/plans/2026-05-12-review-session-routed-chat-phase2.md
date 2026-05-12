# Review Session Routed Chat — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 복습 세션의 자유 입력을 AI 라우터로 분기시켜, 매칭 성공 시 적절한 remedial 노드로 점프하고 실패 시 기존 폴백 챗으로 떨어뜨린다. 동시에 remedial 도중 "모르겠어요"는 라우터를 거치지 않고 정적 다음 노드로 이동하도록 단순화한다.

**Architecture:** 진단(`diagnoseMethod` + `diagnosis-router.ts` + `diagnosis-router-mock.ts`) 3-층 패턴을 그대로 미러링한다 — Cloud Function `reviewRouter` (백엔드), `review-router.ts` (클라이언트 래퍼), `review-router-mock.ts` (오프라인/실패 대체). 호출 진입점은 `use-review-session-screen.ts`의 자유 입력 핸들러 한 곳이며, 결과의 `predictedNodeId` + `confidence`에 따라 (1) 매칭 노드 entries push, (2) 기존 review-feedback 폴백 챗으로 분기한다.

**Tech Stack:** TypeScript, Firebase Cloud Functions v2 (`onRequest`), OpenAI Chat Completions (structured outputs), Zod (입력 검증), Jest (테스트), expo-router.

**Spec:** [`docs/superpowers/specs/2026-05-12-review-session-routed-chat-design.md`](../specs/2026-05-12-review-session-routed-chat-design.md) §5, §6, §10.

---

## File Structure

### Create
- `functions/src/review-router.ts` — Cloud Function `reviewRouter` (onRequest 핸들러, Zod 스키마)
- `features/quiz/review-router.ts` — 클라이언트 라우터 (실 Cloud Function 호출 + mock 폴백 래퍼)
- `features/quiz/review-router-mock.ts` — 키워드 휴리스틱 mock
- `features/quiz/components/review-session/build-review-router-candidates.ts` — `RemedialFlow`에서 후보 노드 배열 추출 헬퍼
- `features/quiz/review-router.test.ts`
- `features/quiz/review-router-mock.test.ts`
- `features/quiz/components/review-session/build-review-router-candidates.test.ts`

### Modify
- `functions/src/openai-client.ts` — review-router용 시스템 프롬프트 + `requestReviewRouterFromOpenAI` 함수 추가
- `functions/src/types.ts` (또는 review-router.ts 내부 타입) — `ReviewRouterRequest`, `OpenAIReviewRouterResult` 타입
- `functions/src/index.ts` — `reviewRouter` export 추가 (Firebase가 onRequest를 인식하도록)
- `constants/env.ts` — `EXPO_PUBLIC_REVIEW_ROUTER_URL` + `reviewRouterTimeoutMs` 추가
- `app.config.js` — 새 EXPO_PUBLIC 환경변수 export 목록에 추가 (env: export 줄)
- `features/quiz/hooks/use-review-session-screen.ts` — `onSubmitFreeText`에 라우터 분기 추가; `onRemedialExplainSecondary` + `onRemedialCheckDontKnow`를 정적 이동으로 교체
- `features/quiz/hooks/use-review-session-screen.test.ts` — 신규 분기 테스트 추가
- `features/analytics/event-types.ts` — `review_router_called`, `review_router_succeeded`, `review_router_fallback`, `review_fallback_chat_completed` 이벤트 추가

### Delete
- (Phase 2 종료 시점 후속 PR로) Phase 1의 `createFallbackInputEntry(1)` 사용 경로가 모두 제거되면 `fallback-input-card`의 turn=1 분기가 죽은 코드가 됨. 본 plan 범위에서는 죽은 코드 제거하지 않음 — Task 13 자가 검증에서만 사용 여부 확인.

---

## Task 1: 환경변수 + 타임아웃 상수 추가

**Files:**
- Modify: `constants/env.ts`
- Modify: `app.config.js`

이 task는 라우터의 백엔드/클라이언트가 같은 URL 키로 통신하도록 우선 환경변수 시그니처를 잡는다. 이후 Task 2~7 모두 이 상수를 참조한다.

- [ ] **Step 1: 환경변수 + 타임아웃 상수 추가**

`constants/env.ts` 끝에 추가:

```typescript
export const reviewRouterUrl = (process.env.EXPO_PUBLIC_REVIEW_ROUTER_URL ?? '').trim();
export const reviewRouterTimeoutMs = 8000;
```

- [ ] **Step 2: app.config.js의 env.export 목록에 추가**

`app.config.js`의 EAS `env.export` 라인에 `EXPO_PUBLIC_REVIEW_ROUTER_URL`를 추가한다 (`EXPO_PUBLIC_DIAGNOSIS_ROUTER_URL` 옆).

현재:
```js
env: export EXPO_PUBLIC_FIREBASE_API_KEY ... EXPO_PUBLIC_DIAGNOSIS_ROUTER_URL ...
```

변경 후 (관련 줄 한 곳에만 추가):
```js
env: export EXPO_PUBLIC_FIREBASE_API_KEY ... EXPO_PUBLIC_DIAGNOSIS_ROUTER_URL EXPO_PUBLIC_REVIEW_ROUTER_URL ...
```

(주의: `app.config.js`에는 실제 `env: export` 라인이 없을 수도 있다. 만약 없으면 이 step은 스킵하고 `.env.local` / EAS secret 추가 안내만 commit 메시지에 남긴다.)

- [ ] **Step 3: typecheck 통과 확인**

Run: `npx tsc --noEmit`
Expected: PASS (`reviewRouterUrl` 가 export 됐고 아직 사용처 없으므로 unused 경고도 없다 — Cloud Function URL 상수는 다른 곳도 export-only로 운영 중)

- [ ] **Step 4: 커밋**

```bash
git add constants/env.ts app.config.js
git commit -m "feat(review): add reviewRouterUrl env wiring for Phase 2"
```

---

## Task 2: 백엔드 — review-router 요청/응답 Zod 스키마

**Files:**
- Create: `functions/src/review-router.ts` (스키마 + onRequest 골격)

이 task에서는 입출력 검증 스키마만 잡고 다음 task에서 OpenAI 호출 로직을 채운다.

- [ ] **Step 1: 빈 onRequest 골격 + Zod 스키마 작성**

```typescript
// functions/src/review-router.ts
import * as logger from 'firebase-functions/logger';
import { defineSecret, defineString } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';

const openAiApiKey = defineSecret('OPENAI_API_KEY');
const openAiModel = defineString('OPENAI_MODEL', { default: 'gpt-4.1' });

const ReviewRouterCandidateSchema = z.object({
  id: z.string().min(1).max(80),
  summary: z.string().min(1).max(300),
  triggers: z.array(z.string().min(1).max(120)).min(1).max(8),
});

export const ReviewRouterRequestSchema = z.object({
  weaknessId: z.string().min(1).max(64),
  stepTitle: z.string().min(1).max(160),
  stepBody: z.string().min(1).max(2000),
  selectedChoiceText: z.string().min(1).max(500).optional(),
  selectedChoiceCorrect: z.boolean().optional(),
  userText: z.string().trim().min(1).max(500),
  candidateNodes: z.array(ReviewRouterCandidateSchema).min(1).max(12),
});

export type ReviewRouterRequest = z.infer<typeof ReviewRouterRequestSchema>;

export const OpenAIReviewRouterResultSchema = z.object({
  predictedNodeId: z.string().min(1),
  confidence: z.number().min(0).max(1),
  candidateNodeIds: z.array(z.string().min(1)).min(1).max(6),
  reason: z.string().min(1).max(160),
});

export type OpenAIReviewRouterResult = z.infer<typeof OpenAIReviewRouterResultSchema>;

export const reviewRouter = onRequest(
  {
    region: 'asia-northeast3',
    timeoutSeconds: 30,
    cors: true,
    invoker: 'public',
    secrets: [openAiApiKey],
  },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const parsed = ReviewRouterRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
      return;
    }

    // Task 4에서 OpenAI 호출 + sanitize 로직 채움.
    logger.info('reviewRouter request received', {
      weaknessId: parsed.data.weaknessId,
      candidateCount: parsed.data.candidateNodes.length,
    });
    response.status(501).json({ error: 'Not implemented yet' });
  }
);
```

- [ ] **Step 2: 백엔드 워크스페이스 타입 체크**

Run: `cd functions && npm run build` (또는 `npx tsc --noEmit`)
Expected: PASS — 컴파일만 통과하면 됨.

- [ ] **Step 3: 커밋**

```bash
git add functions/src/review-router.ts
git commit -m "feat(functions): scaffold reviewRouter with Zod schemas"
```

---

## Task 3: 백엔드 — OpenAI 클라이언트 확장 (시스템 프롬프트 + 호출 함수)

**Files:**
- Modify: `functions/src/openai-client.ts`

`diagnoseMethod`의 패턴(`requestDiagnosisMethodFromOpenAI`)을 그대로 복사해서 review-router용 시스템 프롬프트와 user prompt builder, OpenAI 호출 함수를 추가한다.

- [ ] **Step 1: 시스템 프롬프트 + 응답 스키마 + 호출 함수 추가**

`functions/src/openai-client.ts` 안의 기존 `SYSTEM_PROMPT` 옆에 추가 (파일 상단의 다른 SCHEMA/PROMPT 정의 사이):

```typescript
const REVIEW_ROUTER_RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    predictedNodeId: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    candidateNodeIds: {
      type: 'array',
      minItems: 1,
      maxItems: 6,
      items: { type: 'string' },
    },
    reason: { type: 'string', minLength: 1, maxLength: 160 },
  },
  required: ['predictedNodeId', 'confidence', 'candidateNodeIds', 'reason'],
} as const;

const REVIEW_ROUTER_SYSTEM_PROMPT = [
  '당신은 한국어 수학 복습 라우터입니다.',
  '학생의 자유 입력을 읽고 학생이 어느 보충 학습 노드를 봐야 하는지 분류하세요.',
  '복습 중인 약점과 현재 단계 맥락을 참고하여 학생이 어디서 막혔는지 판단하세요.',
  '반드시 후보 노드 id 중 하나를 predictedNodeId로 반환하세요.',
  '매칭이 명확하지 않으면 predictedNodeId 를 "fallback" 으로 반환하세요.',
  'candidateNodeIds 는 가능성이 높은 순서대로 1~6개만 반환하세요. 후보 중 fallback 은 포함하지 마세요.',
  '정답이나 풀이를 직접 알려주지 마세요. reason 은 내부 디버그용으로 짧고 건조하게 작성하세요.',
].join('\n');

function buildReviewRouterCandidateContext(
  candidates: { id: string; summary: string; triggers: string[] }[],
) {
  return candidates
    .map((node) => {
      const exampleLines = node.triggers
        .slice(0, 5)
        .map((utterance) => `    · ${utterance}`)
        .join('\n');

      return [
        `- id: ${node.id}`,
        `  요지: ${node.summary}`,
        '  유도 발화:',
        exampleLines || '    · (없음)',
      ].join('\n');
    })
    .join('\n');
}

function buildReviewRouterUserPrompt(body: {
  weaknessId: string;
  stepTitle: string;
  stepBody: string;
  selectedChoiceText?: string;
  selectedChoiceCorrect?: boolean;
  userText: string;
  candidateNodes: { id: string; summary: string; triggers: string[] }[];
}) {
  const lines = [
    `약점 id: ${body.weaknessId}`,
    `현재 단계 제목: ${body.stepTitle}`,
    `현재 단계 본문: ${body.stepBody}`,
  ];

  if (body.selectedChoiceText) {
    lines.push(`학생이 고른 선택지: ${body.selectedChoiceText} (정답: ${body.selectedChoiceCorrect ? '예' : '아니오'})`);
  } else {
    lines.push('학생이 고른 선택지: (없음)');
  }

  lines.push(`학생 자유 입력: ${body.userText}`);
  lines.push('');
  lines.push('후보 노드 설명:');
  lines.push(buildReviewRouterCandidateContext(body.candidateNodes));

  return lines.join('\n');
}

export async function requestReviewRouterFromOpenAI({
  apiKey,
  model,
  body,
}: {
  apiKey: string;
  model: string;
  body: {
    weaknessId: string;
    stepTitle: string;
    stepBody: string;
    selectedChoiceText?: string;
    selectedChoiceCorrect?: boolean;
    userText: string;
    candidateNodes: { id: string; summary: string; triggers: string[] }[];
  };
}): Promise<{ result: unknown; model: string; responseId: string }> {
  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: REVIEW_ROUTER_SYSTEM_PROMPT },
      { role: 'user', content: buildReviewRouterUserPrompt(body) },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'review_router_result',
        schema: REVIEW_ROUTER_RESULT_SCHEMA,
        strict: true,
      },
    },
    temperature: 0,
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('OpenAI review-router response did not include content');
  }

  return {
    result: JSON.parse(content),
    model: completion.model,
    responseId: completion.id,
  };
}
```

> 참고: 기존 `requestDiagnosisMethodFromOpenAI`와 동일한 `OpenAI` import / 호출 패턴을 사용한다. `import OpenAI from 'openai';`이 파일 최상단에 이미 있으니 별도 import 추가 불필요.

- [ ] **Step 2: 백엔드 빌드 통과**

Run: `cd functions && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add functions/src/openai-client.ts
git commit -m "feat(functions): add review-router system prompt + OpenAI request"
```

---

## Task 4: 백엔드 — onRequest 핸들러에 OpenAI 호출 + sanitize 연결

**Files:**
- Modify: `functions/src/review-router.ts`
- Modify: `functions/src/index.ts` (export)

Task 2의 501 응답 자리에 실제 라우팅 로직을 채운다. `diagnoseMethod` 핸들러와 같은 sanitize/log 패턴.

- [ ] **Step 1: 핸들러 본문 작성**

`functions/src/review-router.ts`에서 기존 `// Task 4에서 OpenAI 호출 + sanitize 로직 채움.` 블록을 다음으로 교체 (logger.info 한 줄 + 501 response 제거하고):

```typescript
    try {
      const model = openAiModel.value();
      const openAiResponse = await requestReviewRouterFromOpenAI({
        apiKey: openAiApiKey.value(),
        model,
        body: parsed.data,
      });

      const parsedResult = OpenAIReviewRouterResultSchema.parse(openAiResponse.result);
      const allowedIds = parsed.data.candidateNodes.map((node) => node.id);

      const predictedNodeId =
        allowedIds.includes(parsedResult.predictedNodeId) ||
        parsedResult.predictedNodeId === 'fallback'
          ? parsedResult.predictedNodeId
          : 'fallback';

      const candidateNodeIds = Array.from(
        new Set(
          parsedResult.candidateNodeIds.filter((nodeId) => allowedIds.includes(nodeId)),
        ),
      );

      logger.info('reviewRouter result', {
        weaknessId: parsed.data.weaknessId,
        predictedNodeId,
        confidence: parsedResult.confidence,
      });

      response.status(200).json({
        predictedNodeId,
        confidence: parsedResult.confidence,
        reason: parsedResult.reason,
        candidateNodeIds,
        source: 'openai-router',
      });
    } catch (error) {
      logger.error('reviewRouter failed', error);
      response.status(500).json({ error: 'Failed to route review request' });
    }
```

그리고 파일 상단 import에 `requestReviewRouterFromOpenAI` 추가:

```typescript
import { requestReviewRouterFromOpenAI } from './openai-client';
```

- [ ] **Step 2: Firebase index에 export 추가**

`functions/src/index.ts` 끝에 추가 (또는 기존 `export { ... } from './diagnosis-method';` 라인 옆):

```typescript
export { reviewRouter } from './review-router';
```

> 만약 index.ts가 한 줄 `export *` 패턴이면 그 패턴을 따른다.

- [ ] **Step 3: 빌드 + 로컬 emulator로 핸들러 등록 확인**

Run: `cd functions && npm run build`
Expected: PASS, dist/index.js에 reviewRouter 포함.

(선택) Run: `cd functions && npm run serve` — emulator UI에서 `reviewRouter` 함수가 리스팅되는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add functions/src/review-router.ts functions/src/index.ts
git commit -m "feat(functions): wire reviewRouter handler to OpenAI"
```

---

## Task 5: 클라이언트 — review-router-mock (키워드 휴리스틱)

**Files:**
- Create: `features/quiz/review-router-mock.ts`
- Create: `features/quiz/review-router-mock.test.ts`

mock은 인터넷 없을 때 / 라우터 실패 시 / `__DEV__` 동작 검증 용. 후보 노드의 `triggers`에 학생 텍스트의 토큰이 얼마나 매칭되는지 단순 점수화.

- [ ] **Step 1: 테스트 작성**

```typescript
// features/quiz/review-router-mock.test.ts
import { analyzeReviewMethodWithMock } from './review-router-mock';

const baseCandidates = [
  {
    id: 'fu_step1_A_explain',
    summary: '왜 절반',
    triggers: ['왜 절반인지', 'b를 그대로 쓰면'],
  },
  {
    id: 'fu_step2_A_explain',
    summary: '제곱이 핵심',
    triggers: ['왜 제곱하는지', '왜 한 번 더 제곱'],
  },
];

const baseInput = {
  weaknessId: 'formula_understanding',
  stepTitle: '완전제곱식',
  stepBody: 'x² + bx + c = (x + b/2)² + (c − (b/2)²)',
  userText: '',
  candidateNodes: baseCandidates,
};

describe('analyzeReviewMethodWithMock', () => {
  it('빈 입력은 fallback', async () => {
    const result = await analyzeReviewMethodWithMock({ ...baseInput, userText: '' });
    expect(result.predictedNodeId).toBe('fallback');
    expect(result.confidence).toBe(0);
    expect(result.source).toBe('mock-router');
  });

  it('트리거 키워드 매칭 시 해당 노드 반환', async () => {
    const result = await analyzeReviewMethodWithMock({
      ...baseInput,
      userText: '왜 절반인지 모르겠어요',
    });
    expect(result.predictedNodeId).toBe('fu_step1_A_explain');
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('매칭되는 트리거가 없으면 fallback', async () => {
    const result = await analyzeReviewMethodWithMock({
      ...baseInput,
      userText: '오늘 점심 뭐 먹지',
    });
    expect(result.predictedNodeId).toBe('fallback');
  });

  it('동률일 때는 confidence 가 낮게 잡힘', async () => {
    const result = await analyzeReviewMethodWithMock({
      ...baseInput,
      userText: '왜 절반 왜 제곱',
    });
    expect(result.confidence).toBeLessThan(0.65);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx jest features/quiz/review-router-mock.test.ts`
Expected: FAIL (`analyze-review-method-with-mock not found`).

- [ ] **Step 3: 구현 작성**

```typescript
// features/quiz/review-router-mock.ts
export type ReviewRouterMockInput = {
  weaknessId: string;
  stepTitle: string;
  stepBody: string;
  selectedChoiceText?: string;
  selectedChoiceCorrect?: boolean;
  userText: string;
  candidateNodes: ReadonlyArray<{
    id: string;
    summary: string;
    triggers: ReadonlyArray<string>;
  }>;
};

export type ReviewRouterMockResult = {
  predictedNodeId: string;
  confidence: number;
  reason: string;
  candidateNodeIds: string[];
  source: 'mock-router';
};

function normalize(text: string) {
  return text.replace(/\s+/g, '').toLowerCase();
}

export async function analyzeReviewMethodWithMock(
  input: ReviewRouterMockInput,
): Promise<ReviewRouterMockResult> {
  const normalizedUser = normalize(input.userText);
  if (!normalizedUser) {
    return {
      predictedNodeId: 'fallback',
      confidence: 0,
      reason: 'Empty input',
      candidateNodeIds: [],
      source: 'mock-router',
    };
  }

  const scored = input.candidateNodes.map((node) => {
    const score = node.triggers.reduce((total, trigger) => {
      return normalizedUser.includes(normalize(trigger)) ? total + 1 : total;
    }, 0);
    return { id: node.id, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const top = scored[0];
  const second = scored[1];

  if (!top || top.score === 0) {
    return {
      predictedNodeId: 'fallback',
      confidence: 0,
      reason: 'No trigger match',
      candidateNodeIds: [],
      source: 'mock-router',
    };
  }

  const gap = top.score - (second?.score ?? 0);
  let confidence = 0.4;
  if (gap >= 2) {
    confidence = 0.8;
  } else if (gap === 1) {
    confidence = 0.65;
  }

  return {
    predictedNodeId: top.id,
    confidence,
    reason: `top=${top.id}(${top.score}), gap=${gap}`,
    candidateNodeIds: scored.filter((entry) => entry.score > 0).map((entry) => entry.id),
    source: 'mock-router',
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx jest features/quiz/review-router-mock.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/review-router-mock.ts features/quiz/review-router-mock.test.ts
git commit -m "feat(review): add review-router mock with trigger keyword scoring"
```

---

## Task 6: 클라이언트 — review-router (실 호출 + mock 폴백 래퍼)

**Files:**
- Create: `features/quiz/review-router.ts`
- Create: `features/quiz/review-router.test.ts`

진단 라우터(`features/quiz/diagnosis-router.ts`)의 `requestOpenAiDiagnosis` + `analyzeDiagnosisMethod` 구조를 미러링. 차이: `predictedMethodId === 'unknown'` 대신 `predictedNodeId === 'fallback'` 사용, `HIGH_CONFIDENCE_THRESHOLD = 0.65` (spec §5.1).

- [ ] **Step 1: 테스트 작성**

```typescript
// features/quiz/review-router.test.ts
import { analyzeReviewMethod, HIGH_CONFIDENCE_THRESHOLD } from './review-router';

const baseCandidates = [
  { id: 'fu_step1_A_explain', summary: '왜 절반', triggers: ['왜 절반인지'] },
  { id: 'fu_step2_A_explain', summary: '제곱이 핵심', triggers: ['왜 제곱하는지'] },
];

const baseInput = {
  weaknessId: 'formula_understanding',
  stepTitle: '완전제곱식',
  stepBody: 'x² + bx + c = ...',
  userText: '왜 절반인지 모르겠어요',
  candidateNodes: baseCandidates,
};

describe('analyzeReviewMethod', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('빈 입력은 fallback (라우터 호출 스킵)', async () => {
    global.fetch = jest.fn();
    const result = await analyzeReviewMethod({ ...baseInput, userText: '' });
    expect(result.predictedNodeId).toBe('fallback');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('원격 라우터가 high-confidence를 반환하면 그대로 사용', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        predictedNodeId: 'fu_step1_A_explain',
        confidence: 0.85,
        reason: 'matched 왜 절반',
        candidateNodeIds: ['fu_step1_A_explain', 'fu_step2_A_explain'],
        source: 'openai-router',
      }),
    });
    const result = await analyzeReviewMethod(baseInput);
    expect(result.predictedNodeId).toBe('fu_step1_A_explain');
    expect(result.source).toBe('openai-router');
    expect(result.confidence).toBeGreaterThanOrEqual(HIGH_CONFIDENCE_THRESHOLD);
  });

  it('원격 라우터 confidence가 낮으면 mock으로 폴백', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        predictedNodeId: 'fu_step2_A_explain',
        confidence: 0.4,
        reason: 'low',
        candidateNodeIds: ['fu_step2_A_explain'],
        source: 'openai-router',
      }),
    });
    const result = await analyzeReviewMethod(baseInput);
    // mock은 '왜 절반인지' 트리거를 잡아 fu_step1_A 를 반환할 것
    expect(result.source).toBe('mock-router');
    expect(result.predictedNodeId).toBe('fu_step1_A_explain');
  });

  it('네트워크 실패 시 mock으로 폴백', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network'));
    const result = await analyzeReviewMethod(baseInput);
    expect(result.source).toBe('mock-router');
  });

  it('mock 도 매칭 못 하면 fallback', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network'));
    const result = await analyzeReviewMethod({
      ...baseInput,
      userText: '오늘 점심 뭐 먹지',
    });
    expect(result.predictedNodeId).toBe('fallback');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest features/quiz/review-router.test.ts`
Expected: FAIL (`analyzeReviewMethod not exported`).

- [ ] **Step 3: 구현 작성**

```typescript
// features/quiz/review-router.ts
import { reviewRouterTimeoutMs, reviewRouterUrl } from '@/constants/env';

import { analyzeReviewMethodWithMock, type ReviewRouterMockInput } from './review-router-mock';

export type ReviewRouterCandidate = {
  id: string;
  summary: string;
  triggers: ReadonlyArray<string>;
};

export type ReviewRouterInput = {
  weaknessId: string;
  stepTitle: string;
  stepBody: string;
  selectedChoiceText?: string;
  selectedChoiceCorrect?: boolean;
  userText: string;
  candidateNodes: ReadonlyArray<ReviewRouterCandidate>;
};

export type ReviewRouterSource = 'openai-router' | 'mock-router' | 'skipped';

export type ReviewRouterResult = {
  predictedNodeId: string; // 노드 id 또는 'fallback'
  confidence: number;
  reason: string;
  candidateNodeIds: string[];
  source: ReviewRouterSource;
};

export const HIGH_CONFIDENCE_THRESHOLD = 0.65;

type RemoteResponse = {
  predictedNodeId: unknown;
  confidence: unknown;
  reason: unknown;
  candidateNodeIds: unknown;
};

function sanitizeNodeId(candidate: unknown, allowedIds: string[]): string {
  if (typeof candidate !== 'string') return 'fallback';
  if (candidate === 'fallback') return 'fallback';
  return allowedIds.includes(candidate) ? candidate : 'fallback';
}

function sanitizeCandidateIds(candidates: unknown, allowedIds: string[]): string[] {
  if (!Array.isArray(candidates)) return [];
  const next = new Set<string>();
  candidates.forEach((value) => {
    if (typeof value === 'string' && allowedIds.includes(value)) {
      next.add(value);
    }
  });
  return Array.from(next);
}

function parseRemote(payload: unknown, allowedIds: string[]): ReviewRouterResult | null {
  if (!payload || typeof payload !== 'object') return null;
  const response = payload as Partial<RemoteResponse>;
  const predictedNodeId = sanitizeNodeId(response.predictedNodeId, allowedIds);
  const confidence =
    typeof response.confidence === 'number' && Number.isFinite(response.confidence)
      ? Math.max(0, Math.min(1, response.confidence))
      : 0;
  const reason =
    typeof response.reason === 'string' && response.reason.trim()
      ? response.reason.trim()
      : 'remote router response';
  const candidateNodeIds = sanitizeCandidateIds(response.candidateNodeIds, allowedIds);

  return {
    predictedNodeId,
    confidence,
    reason,
    candidateNodeIds,
    source: 'openai-router',
  };
}

async function requestRemote(input: ReviewRouterInput): Promise<ReviewRouterResult | null> {
  if (!reviewRouterUrl) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), reviewRouterTimeoutMs);

  try {
    const response = await fetch(reviewRouterUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const payload = await response.json();
    const allowedIds = input.candidateNodes.map((node) => node.id);
    return parseRemote(payload, allowedIds);
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function isHighConfidence(result: ReviewRouterResult): boolean {
  return result.predictedNodeId !== 'fallback' && result.confidence >= HIGH_CONFIDENCE_THRESHOLD;
}

function toMockInput(input: ReviewRouterInput): ReviewRouterMockInput {
  return {
    weaknessId: input.weaknessId,
    stepTitle: input.stepTitle,
    stepBody: input.stepBody,
    selectedChoiceText: input.selectedChoiceText,
    selectedChoiceCorrect: input.selectedChoiceCorrect,
    userText: input.userText,
    candidateNodes: input.candidateNodes,
  };
}

export async function analyzeReviewMethod(input: ReviewRouterInput): Promise<ReviewRouterResult> {
  if (!input.userText.trim()) {
    return {
      predictedNodeId: 'fallback',
      confidence: 0,
      reason: 'empty input',
      candidateNodeIds: [],
      source: 'skipped',
    };
  }

  const remote = await requestRemote(input);
  if (remote && isHighConfidence(remote)) {
    return remote;
  }

  const mock = await analyzeReviewMethodWithMock(toMockInput(input));
  if (isHighConfidence(mock as ReviewRouterResult)) {
    return mock as ReviewRouterResult;
  }

  // remote / mock 모두 못 잡았으면 fallback. remote 가 있으면 reason 만 차용.
  return {
    predictedNodeId: 'fallback',
    confidence: Math.max(remote?.confidence ?? 0, mock.confidence),
    reason: remote?.reason ?? mock.reason,
    candidateNodeIds: [],
    source: remote ? 'openai-router' : 'mock-router',
  };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest features/quiz/review-router.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/review-router.ts features/quiz/review-router.test.ts
git commit -m "feat(review): add client review-router with remote + mock fallback"
```

---

## Task 7: 헬퍼 — RemedialFlow에서 후보 노드 배열 만들기

**Files:**
- Create: `features/quiz/components/review-session/build-review-router-candidates.ts`
- Create: `features/quiz/components/review-session/build-review-router-candidates.test.ts`

`use-review-session-screen.ts`가 라우터 호출 직전에 후보를 만들도록 분리. `summary`/`triggers`가 모두 채워진 explain 노드만 후보.

- [ ] **Step 1: 테스트 작성**

```typescript
// features/quiz/components/review-session/build-review-router-candidates.test.ts
import { buildReviewRouterCandidates } from './build-review-router-candidates';
import type { RemedialFlow } from '@/data/review-remedial-flows';

const flow: RemedialFlow = {
  nodes: {
    a: {
      id: 'a',
      kind: 'explain',
      title: 't',
      body: 'b',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'b',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'b',
      summary: 'A 요지',
      triggers: ['트리거 A1'],
    },
    b: {
      id: 'b',
      kind: 'explain',
      title: 't',
      body: 'b',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'c',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'c',
      // summary/triggers 없음
    },
    c: { id: 'c', kind: 'exit' },
    d: {
      id: 'd',
      kind: 'check',
      title: 't',
      prompt: 'p',
      options: [],
      dontKnowNextNodeId: 'c',
    },
  },
};

describe('buildReviewRouterCandidates', () => {
  it('summary/triggers 채워진 explain 노드만 후보로 추림', () => {
    const candidates = buildReviewRouterCandidates(flow);
    expect(candidates).toEqual([
      { id: 'a', summary: 'A 요지', triggers: ['트리거 A1'] },
    ]);
  });

  it('flow 가 없으면 빈 배열', () => {
    expect(buildReviewRouterCandidates(undefined)).toEqual([]);
  });

  it('triggers 가 빈 배열이면 제외', () => {
    const partial: RemedialFlow = {
      nodes: {
        x: {
          id: 'x',
          kind: 'explain',
          title: 't',
          body: 'b',
          primaryLabel: '다음으로',
          primaryNextNodeId: 'y',
          secondaryLabel: '모르겠어요',
          secondaryNextNodeId: 'y',
          summary: 'X',
          triggers: [],
        },
        y: { id: 'y', kind: 'exit' },
      },
    };
    expect(buildReviewRouterCandidates(partial)).toEqual([]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest features/quiz/components/review-session/build-review-router-candidates.test.ts`
Expected: FAIL.

- [ ] **Step 3: 구현 작성**

```typescript
// features/quiz/components/review-session/build-review-router-candidates.ts
import type { RemedialFlow } from '@/data/review-remedial-flows';
import type { ReviewRouterCandidate } from '@/features/quiz/review-router';

export function buildReviewRouterCandidates(
  flow: RemedialFlow | undefined,
): ReviewRouterCandidate[] {
  if (!flow) return [];

  return Object.values(flow.nodes)
    .filter((node) => node.kind === 'explain')
    .filter((node) => Boolean(node.summary) && (node.triggers?.length ?? 0) > 0)
    .map((node) => ({
      id: node.id,
      summary: node.summary as string,
      triggers: node.triggers as ReadonlyArray<string>,
    }));
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest features/quiz/components/review-session/build-review-router-candidates.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/components/review-session/build-review-router-candidates.ts features/quiz/components/review-session/build-review-router-candidates.test.ts
git commit -m "feat(review): add buildReviewRouterCandidates helper"
```

---

## Task 8: Analytics 이벤트 타입 추가

**Files:**
- Modify: `features/analytics/event-types.ts`

라우터 호출/성공/폴백/폴백 챗 종료 이벤트를 타입에 등록. 실제 발화는 Task 9, 10에서.

- [ ] **Step 1: EventName 유니온에 추가**

기존 `EventName` 유니온 끝에:

```typescript
  | 'review_router_called'
  | 'review_router_succeeded'
  | 'review_router_fallback'
  | 'review_fallback_chat_completed';
```

- [ ] **Step 2: EventParams 매핑에 추가**

```typescript
  review_router_called: {
    weakness_id: string;
    step_index: number;
    candidate_count: number;
  };
  review_router_succeeded: {
    weakness_id: string;
    step_index: number;
    predicted_node_id: string;
    confidence: number;
    source: 'openai-router' | 'mock-router';
  };
  review_router_fallback: {
    weakness_id: string;
    step_index: number;
    reason: 'low_confidence' | 'no_candidates' | 'empty_input' | 'network_error';
  };
  review_fallback_chat_completed: {
    weakness_id: string;
    step_index: number;
    turn_count: 1 | 2;
  };
```

- [ ] **Step 3: typecheck 통과**

Run: `npx tsc --noEmit`
Expected: PASS. 이벤트 추가가 다른 로그 호출처를 깨지 않음 (기존 호출은 unchanged).

- [ ] **Step 4: 커밋**

```bash
git add features/analytics/event-types.ts
git commit -m "feat(analytics): add review-router event names + params"
```

---

## Task 9: 통합 — 자유 입력에 라우터 분기 추가

**Files:**
- Modify: `features/quiz/hooks/use-review-session-screen.ts`
- Modify: `features/quiz/hooks/use-review-session-screen.test.ts`

기존 `onSubmitFreeText`는 곧장 `requestReviewFeedback`을 부른다. Phase 2에서는 그 앞에 라우터 호출을 끼우고, 결과에 따라 분기한다:
- `predictedNodeId !== 'fallback'`: remedial 노드 entries push (정답 선택 경로와 동일한 모양: user-bubble + remedial-node)
- `'fallback'`: 기존 review-feedback 챗 경로 그대로 (Phase 1 동작 보존)

- [ ] **Step 1: 테스트 작성 (기존 test 파일에 describe 블록 추가)**

```typescript
// features/quiz/hooks/use-review-session-screen.test.ts 안의 새 describe 블록
describe('자유 입력 → 라우터 분기 (Phase 2)', () => {
  // 다른 test의 setup 패턴 따라 task='__mock__' 경로 또는 store mock 사용.
  // 예시 (실제 파일의 기존 헬퍼 명칭에 맞춰 조정):
  it('라우터 성공 시 remedial 노드 entries로 진입', async () => {
    jest.spyOn(reviewRouterModule, 'analyzeReviewMethod').mockResolvedValue({
      predictedNodeId: 'fu_step1_A_explain',
      confidence: 0.82,
      reason: 'matched',
      candidateNodeIds: ['fu_step1_A_explain'],
      source: 'openai-router',
    });

    const { result } = renderHook(() => useReviewSessionScreen(), { wrapper });
    act(() => result.current.onChangeFreeText('왜 절반인지'));
    await act(async () => {
      await result.current.onSubmitFreeText();
    });

    const kinds = result.current.entries.map((e) => e.kind);
    expect(kinds).toContain('user-bubble');
    expect(kinds).toContain('remedial-node');
    expect(kinds).not.toContain('ai-typing');  // 폴백 챗 typing은 없음
  });

  it('라우터 fallback 시 기존 폴백 챗 경로 사용', async () => {
    jest.spyOn(reviewRouterModule, 'analyzeReviewMethod').mockResolvedValue({
      predictedNodeId: 'fallback',
      confidence: 0.2,
      reason: 'no match',
      candidateNodeIds: [],
      source: 'mock-router',
    });
    jest.spyOn(reviewFeedbackModule, 'requestReviewFeedback').mockResolvedValue({
      replyText: '예시 풀이…',
    });

    const { result } = renderHook(() => useReviewSessionScreen(), { wrapper });
    act(() => result.current.onChangeFreeText('아무거나'));
    await act(async () => {
      await result.current.onSubmitFreeText();
    });

    const kinds = result.current.entries.map((e) => e.kind);
    expect(kinds).toContain('user-bubble');
    expect(kinds).toContain('ai-bubble');  // 폴백 챗 응답
    expect(kinds).toContain('fallback-input');  // 2턴 입력창
  });

  it('후보 노드가 0개면 라우터 호출 스킵하고 곧장 폴백 챗', async () => {
    const routerSpy = jest.spyOn(reviewRouterModule, 'analyzeReviewMethod');
    // weaknessId 가 flow 없는 약점인 경우 — 별도 fixture 필요 시 task helper로 mock.
    // (간단히는 buildReviewRouterCandidates spy 로 빈 배열 강제)
    jest
      .spyOn(buildCandidatesModule, 'buildReviewRouterCandidates')
      .mockReturnValue([]);
    jest.spyOn(reviewFeedbackModule, 'requestReviewFeedback').mockResolvedValue({
      replyText: '예시…',
    });

    const { result } = renderHook(() => useReviewSessionScreen(), { wrapper });
    act(() => result.current.onChangeFreeText('아무거나'));
    await act(async () => {
      await result.current.onSubmitFreeText();
    });

    expect(routerSpy).not.toHaveBeenCalled();
  });
});
```

> 위 테스트는 기존 test 파일의 `wrapper` / mock 인프라를 그대로 활용한다. 정확한 import 경로(`reviewRouterModule`, `buildCandidatesModule` 등)는 해당 파일의 컨벤션에 맞춰 조정한다.

- [ ] **Step 2: 실패 확인**

Run: `npx jest features/quiz/hooks/use-review-session-screen.test.ts -t "자유 입력 → 라우터 분기"`
Expected: FAIL — 라우터 호출 분기가 아직 없음.

- [ ] **Step 3: 구현 작성 — `onSubmitFreeText` 교체**

`use-review-session-screen.ts`에 import 추가:

```typescript
import { analyzeReviewMethod } from '@/features/quiz/review-router';
import { remedialFlows } from '@/data/review-remedial-flows';
import { buildReviewRouterCandidates } from '@/features/quiz/components/review-session/build-review-router-candidates';
```

기존 `onSubmitFreeText` 함수를 다음으로 교체:

```typescript
  const onSubmitFreeText = async () => {
    const text = freeText.trim();
    if (!text || !task) return;

    setFreeText('');
    reviewEntries.lockInputArea();
    reviewEntries.appendEntries([createReviewUserBubbleEntry(text)]);

    const flow = remedialFlows[task.weaknessId];
    const candidates = buildReviewRouterCandidates(flow);

    if (candidates.length === 0) {
      logEvent('review_router_fallback', {
        weakness_id: task.weaknessId,
        step_index: currentStepIndex,
        reason: 'no_candidates',
      });
      await runFallbackChat(text);
      return;
    }

    logEvent('review_router_called', {
      weakness_id: task.weaknessId,
      step_index: currentStepIndex,
      candidate_count: candidates.length,
    });

    reviewEntries.appendEntries([createAiTypingEntry()]);

    const selectedChoice =
      selectedChoiceIndex !== null
        ? steps[currentStepIndex]?.choices[selectedChoiceIndex]
        : undefined;

    const result = await analyzeReviewMethod({
      weaknessId: task.weaknessId,
      stepTitle: steps[currentStepIndex].title,
      stepBody: steps[currentStepIndex].body,
      selectedChoiceText: selectedChoice?.text,
      selectedChoiceCorrect: selectedChoice?.correct,
      userText: text,
      candidateNodes: candidates,
    });

    if (result.predictedNodeId !== 'fallback') {
      const node = getRemedialNode(task.weaknessId, result.predictedNodeId);
      if (node && node.kind !== 'exit') {
        reviewEntries.removeLastTyping();
        reviewEntries.appendEntries([createRemedialNodeEntry(node)]);
        aiHelpUsedPerStepRef.current[currentStepIndex] = true;
        logEvent('review_router_succeeded', {
          weakness_id: task.weaknessId,
          step_index: currentStepIndex,
          predicted_node_id: result.predictedNodeId,
          confidence: result.confidence,
          source: result.source === 'mock-router' ? 'mock-router' : 'openai-router',
        });
        return;
      }
    }

    // 폴백 챗 진입 — typing entry 는 챗 응답 도착 시 replaceTypingWithBubble 로 교체된다.
    logEvent('review_router_fallback', {
      weakness_id: task.weaknessId,
      step_index: currentStepIndex,
      reason: result.confidence === 0 ? 'network_error' : 'low_confidence',
    });
    await runFallbackChat(text, { typingAlreadyAppended: true });
  };
```

> `reason` 판정 규칙 (단순화):
> - `'empty_input'` / `'no_candidates'`는 라우터 호출 *전*에 분기되므로 이 폴백 자리에는 도달하지 않는다. 위 분기에선 `'low_confidence'` / `'network_error'` 두 가지만 발화한다.
> - `confidence === 0` 이면 remote / mock 둘 다 0점이라는 뜻이므로 사실상 network 또는 unrelated input. 단순히 `'network_error'`로 분류.
> - 그 외(부분 점수 있었으나 임계값 미달)는 `'low_confidence'`.

그리고 기존 try/catch 구조의 챗 호출 부분을 새 헬퍼 `runFallbackChat`로 추출:

```typescript
  const runFallbackChat = async (
    text: string,
    options: { typingAlreadyAppended?: boolean } = {},
  ) => {
    if (!options.typingAlreadyAppended) {
      reviewEntries.appendEntries([createAiTypingEntry()]);
    }

    chatHistoryRef.current = [{ role: 'user', content: text }];
    try {
      const result = await requestReviewFeedback({
        weaknessId: task!.weaknessId,
        stepTitle: steps[currentStepIndex].title,
        stepBody: steps[currentStepIndex].body,
        messages: chatHistoryRef.current,
      });
      chatHistoryRef.current.push({ role: 'assistant', content: result.replyText });
      reviewEntries.replaceTypingWithBubble(result.replyText);
      setFallbackTurnsUsed(1);
      aiHelpUsedPerStepRef.current[currentStepIndex] = true;
      reviewEntries.appendEntries([createFallbackInputEntry(2)]);
    } catch {
      reviewEntries.replaceTypingWithBubble('응답이 늦고 있어요. 잠시 후 다시 시도해주세요.');
      setFreeText(text);
      reviewEntries.unlockLatestInput();
    }
  };
```

- [ ] **Step 4: 테스트 통과**

Run: `npx jest features/quiz/hooks/use-review-session-screen.test.ts`
Expected: PASS (기존 + 신규 모두).

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/hooks/use-review-session-screen.ts features/quiz/hooks/use-review-session-screen.test.ts
git commit -m "feat(review): route free input through review-router before chat fallback"
```

---

## Task 10: 통합 — Remedial 도중 "모르겠어요"를 정적 이동으로 교체

**Files:**
- Modify: `features/quiz/hooks/use-review-session-screen.ts`
- Modify: `features/quiz/hooks/use-review-session-screen.test.ts`

Phase 1까지 `onRemedialExplainSecondary`와 `onRemedialCheckDontKnow`는 `createFallbackInputEntry(1)`을 entries에 push 해서 자유 입력으로 떨어뜨렸다. Phase 2에서는 spec §3 시나리오 E에 따라 **각각 `node.secondaryNextNodeId` / `node.dontKnowNextNodeId`로 정적 이동**한다.

- [ ] **Step 1: 테스트 작성**

```typescript
// 신규 describe 블록
describe('Remedial 도중 "모르겠어요" 정적 이동 (Phase 2)', () => {
  it('explain "모르겠어요" 시 secondaryNextNodeId 노드가 entries에 append', () => {
    // setup: 학생이 explain 노드 X 에 있는 상태로 entries 시드
    // X.secondaryNextNodeId = 'Y'
    // act: result.current.onRemedialExplainSecondary('X')
    // expect: entries 끝에 remedial-node entry (id='Y')
    // expect: entries 안에 fallback-input(turn=1) 가 없음
  });

  it('check "모르겠어요" 시 dontKnowNextNodeId 노드가 entries에 append', () => {
    // 위와 동일 패턴, check 노드의 dontKnowNextNodeId 사용
  });

  it('정적 이동 시 aiHelpUsedPerStepRef 는 변경되지 않는다 (AI 호출 없음)', () => {
    // aiHelpUsedPerStep[currentStepIndex] 가 false 였다면 여전히 false
  });
});
```

> 정확한 setup helper는 기존 test 파일에서 remedial 노드 진입 패턴을 그대로 차용한다 (오답 선택 후 remedial 진입 시뮬레이션).

- [ ] **Step 2: 실패 확인**

Run: `npx jest features/quiz/hooks/use-review-session-screen.test.ts -t "Remedial 도중 \"모르겠어요\""`
Expected: FAIL — 현재는 fallback-input(turn=1)이 push 됨.

- [ ] **Step 3: 두 핸들러 교체**

기존:

```typescript
  const onRemedialExplainSecondary = (nodeId: string) => {
    if (!task) return;
    const node = getRemedialNode(task.weaknessId, nodeId);
    if (!node || node.kind !== 'explain') return;
    reviewEntries.lockRemedialNodes();
    reviewEntries.appendEntries([createFallbackInputEntry(1)]);
    setFallbackTurnsUsed(0);
    aiHelpUsedPerStepRef.current[currentStepIndex] = true;
  };

  const onRemedialCheckDontKnow = (nodeId: string) => {
    if (!task) return;
    const node = getRemedialNode(task.weaknessId, nodeId);
    if (!node || node.kind !== 'check') return;
    reviewEntries.lockRemedialNodes();
    reviewEntries.appendEntries([createFallbackInputEntry(1)]);
    setFallbackTurnsUsed(0);
    aiHelpUsedPerStepRef.current[currentStepIndex] = true;
  };
```

교체:

```typescript
  const onRemedialExplainSecondary = (nodeId: string) => {
    if (!task) return;
    const node = getRemedialNode(task.weaknessId, nodeId);
    if (!node || node.kind !== 'explain') return;
    advanceRemedialToNode(node.secondaryNextNodeId);
  };

  const onRemedialCheckDontKnow = (nodeId: string) => {
    if (!task) return;
    const node = getRemedialNode(task.weaknessId, nodeId);
    if (!node || node.kind !== 'check') return;
    advanceRemedialToNode(node.dontKnowNextNodeId);
  };
```

> `advanceRemedialToNode` 헬퍼는 이미 파일 안에 정의되어 있다 (Phase 1 산출물). exit 노드면 done-cta를 append, 그 외엔 remedial-node entry append.

- [ ] **Step 4: 테스트 통과**

Run: `npx jest features/quiz/hooks/use-review-session-screen.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/hooks/use-review-session-screen.ts features/quiz/hooks/use-review-session-screen.test.ts
git commit -m "feat(review): wire remedial 모르겠어요 to static next node"
```

---

## Task 11: 폴백 챗 종료 시 analytics 발화

**Files:**
- Modify: `features/quiz/hooks/use-review-session-screen.ts`

`onSubmitFallback`의 2턴 완료 분기에서 `review_fallback_chat_completed` 이벤트를 추가.

- [ ] **Step 1: 이벤트 발화 1줄 추가**

기존 `onSubmitFallback`의 `if (turnBeforeResponse === 0)` ... `else { setFallbackTurnsUsed(turnBeforeResponse + 1); ... }` 분기 중 **else 안쪽 (2턴 마무리)** 에서 done-cta append 직전에:

```typescript
        logEvent('review_fallback_chat_completed', {
          weakness_id: task.weaknessId,
          step_index: currentStepIndex,
          turn_count: 2,
        });
```

그리고 `if (turnBeforeResponse === 0)` 안 (1턴 후 2턴 입력창 오픈 자리)에는 발화하지 않는다 — 1턴만으로 종료되는 경로는 현재 흐름에 없으므로.

- [ ] **Step 2: typecheck + 기존 테스트 통과 확인**

Run: `npx jest features/quiz/hooks/use-review-session-screen.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/hooks/use-review-session-screen.ts
git commit -m "feat(analytics): fire review_fallback_chat_completed on 2턴 close"
```

---

## Task 12: 통합 점검 — 시나리오 E2E (수동 QA)

**Files:** 없음 (수동 검증 + 보고 작성)

코드 변경 없이 모든 흐름이 한 step 안에서 끊김 없이 동작하는지 시뮬레이터에서 직접 시연. 발견되는 회귀는 Task 9~11로 돌아가서 수정.

- [ ] **Step 1: dev 서버 부팅 + 빌드 검증**

Run:
```bash
git checkout main   # 빌드는 main에서. 아니면 phase2-router-metadata 에서도 가능.
# (worktree에서 빌드한다면) cd ~/dev/dasida-app
npx expo prebuild --clean
npx expo run:ios
```

- [ ] **Step 2: 시나리오 A 검증 — 라우팅 성공**

`formula_understanding` 약점 task로 진입 → 1단계에서 자유 입력 `"왜 절반인지 모르겠어요"` 보냄 → ai-typing 잠깐 → remedial 노드 `fu_step1_A_explain`이 entries에 등장하는지 확인. analytics 콘솔(또는 GA4 debug view)에서 `review_router_called` + `review_router_succeeded` 발화 확인.

- [ ] **Step 3: 시나리오 B 검증 — 라우터 실패 → 폴백 챗**

자유 입력 `"오늘 점심 뭐 먹지"` → ai-typing → "응답…" 텍스트 → fallback-input(turn=2) 등장. 2턴 더 입력하면 done-cta 등장. analytics `review_router_fallback` + 2턴 완료 시 `review_fallback_chat_completed`.

- [ ] **Step 4: 시나리오 E 검증 — 모르겠어요 정적 이동**

오답 선택 → remedial 진입 → explain 노드에서 "모르겠어요" 누름 → AI 호출 없이 즉시 다음 정적 노드로 이동. fallback-input 카드가 등장하지 않음.

- [ ] **Step 5: 결과를 PR 본문 / docs/PROGRESS.md 에 기록**

QA 결과 요약을 PR 본문 Test plan 체크리스트에 반영. (PR 생성은 Task 13에서.)

- [ ] **Step 6: 검증 결과 커밋 (옵션)**

QA 메모를 plan 파일 끝 또는 PROGRESS에 남기고 싶으면:

```bash
git add docs/PROGRESS.md
git commit -m "chore(progress): Phase 2 manual QA notes"
```

---

## Task 13: PR 준비 — typecheck/test 전체 통과 + 커밋 메시지 정리

**Files:** 없음 (검증)

- [ ] **Step 1: 전체 타입 체크**

Run: `npx tsc --noEmit`
Expected: PASS, 새 코드의 모든 타입 호환.

- [ ] **Step 2: 전체 테스트**

Run: `npx jest`
Expected: PASS, Phase 1 기존 테스트도 전부 그린.

- [ ] **Step 3: 백엔드 빌드 + emulator quickcheck**

```bash
cd functions && npm run build
```
Expected: PASS, dist/index.js 에 reviewRouter 포함.

- [ ] **Step 4: 워킹트리 깨끗 + 푸시**

```bash
git status   # clean 이어야 함
git push origin claude/phase2-router-metadata
```

- [ ] **Step 5: PR 생성**

```bash
gh pr create --base main --title "feat(review): Phase 2 — AI router for free input + static 모르겠어요" --body "$(cat <<'EOF'
## Summary
- 자유 입력 → `review-router` Cloud Function 1회 호출 → 매칭 성공 시 remedial 노드 entries 진입, 실패 시 기존 review-feedback 폴백 챗 (2턴)
- Remedial 도중 "모르겠어요"는 라우터 미사용. `secondaryNextNodeId` / `dontKnowNextNodeId` 로 정적 이동 (진단과 동일)
- 진단 라우터 3-층 패턴 미러링: 백엔드 `reviewRouter` + 클라이언트 `analyzeReviewMethod` + mock `analyzeReviewMethodWithMock`
- 후보 노드 = remedial flow 중 `summary` + `triggers` 모두 채워진 explain 노드 (현재는 `formula_understanding` 6개)
- Analytics: `review_router_called` / `succeeded` / `fallback` / `review_fallback_chat_completed` 추가

## Spec / Plan
- Spec: `docs/superpowers/specs/2026-05-12-review-session-routed-chat-design.md` §5, §6, §10
- Plan: `docs/superpowers/plans/2026-05-12-review-session-routed-chat-phase2.md`

## Test plan
- [x] mock 단위 테스트 (triggers 매칭 / 빈 입력 / 동률 / 무관 입력)
- [x] 클라이언트 라우터 단위 테스트 (remote high/low conf, network 실패, mock 폴백)
- [x] `buildReviewRouterCandidates` 단위 테스트
- [x] `use-review-session-screen` 통합 테스트 (라우터 성공/폴백/no-candidates)
- [x] Remedial "모르겠어요" 정적 이동 테스트
- [x] iOS 시뮬레이터 수동 QA 시나리오 A / B / E

## Out of scope (Future work, spec §10)
- 다른 약점의 remedial flow 콘텐츠 작성 (별도 phase, 교육 콘텐츠 성격)
- 라우터 정확도 튜닝 (출시 후 로그 기반)
- "모르겠어요" 라우터 업그레이드 (조건부)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 6: 종료 알림**

```bash
npm run notify:done -- "Phase 2 review router PR opened"
```

---

## Summary

- 자유 입력 → `review-router` AI 라우터로 분기, 매칭 성공 시 remedial 노드 점프
- Remedial 도중 "모르겠어요"는 진단처럼 정적 이동으로 단순화 (시나리오 E)
- 진단 라우터(`diagnoseMethod` + `diagnosis-router*`) 3-층 패턴 그대로 미러링
- 후보 노드는 `summary` + `triggers` 채워진 explain 노드만 (현재 `formula_understanding` 6개)
- Analytics 4개 이벤트 추가

Phase 3+ (별도 plan/PR):
- 다른 약점의 remedial flow 콘텐츠 작성
- 라우터 정확도 튜닝 (출시 후 로그 기반)

---

## Test plan
- [ ] Mock / 클라이언트 라우터 / 후보 추출 헬퍼 — 단위 테스트
- [ ] 통합 훅 — 라우터 성공 / 폴백 / no-candidates / 정적 모르겠어요 시나리오
- [ ] iOS 시뮬레이터 — 시나리오 A (자유 입력 라우팅 성공) / B (자유 입력 폴백 챗) / E (모르겠어요 정적 이동)
- [ ] iPad 다크모드 / 키보드 시나리오 (Phase 1 회귀 없음 확인)
- [ ] Analytics 이벤트 발화 확인 (GA4 debug view 또는 콘솔)

---

## Self-Review

스펙 § 별 task 매핑:

- 스펙 §3 시나리오 A (라우팅 성공) — Task 9
- 스펙 §3 시나리오 B (폴백 챗) — Task 9 (runFallbackChat 분기)
- 스펙 §3 시나리오 C (정답) — 변경 없음 (Phase 1 그대로)
- 스펙 §3 시나리오 D (오답 → remedial) — 변경 없음 (Phase 1 그대로)
- 스펙 §3 시나리오 E (모르겠어요 정적) — Task 10
- 스펙 §5.1 API 형태 — Task 2 (백엔드 Zod), Task 6 (클라이언트 타입)
- 스펙 §5.2 백엔드 시스템 프롬프트 — Task 3
- 스펙 §5.3 비용 — 직접 코드 변경 없음. 시나리오 분기가 §5.3 가정대로 작동하는지 Task 12 수동 QA에서 확인.
- 스펙 §6.1 use-review-session-screen 상태 — Task 9, 10
- 스펙 §6.2 분석 이벤트 — Task 8, 9, 11
- 스펙 §10 Future work — Plan 본문 + PR 본문 Out-of-scope에 명시

타입 / 함수명 일관성:
- `ReviewRouterInput`, `ReviewRouterResult`, `ReviewRouterCandidate`, `ReviewRouterSource` — Task 6에서 정의, Task 9에서 import 사용
- `analyzeReviewMethod`, `analyzeReviewMethodWithMock` — Task 5, 6
- `buildReviewRouterCandidates` — Task 7
- `requestReviewRouterFromOpenAI` — Task 3
- `HIGH_CONFIDENCE_THRESHOLD = 0.65` — 스펙 §5.1 일치
- `reviewRouterUrl`, `reviewRouterTimeoutMs` — Task 1
- analytics 이벤트 4개 — Task 8 정의, Task 9 / 11 발화. `review_fallback_chat_completed.turn_count` 가 `1 | 2` 리터럴이므로 Task 11에서 `turn_count: 2` 만 발화 (1턴 종료 경로 없음).

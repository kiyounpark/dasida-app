# 사진 flow — 풀이 자동 인식 라우팅 (웹 프로토타입) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학생이 틀린 문제 사진을 올리면 AI가 답·풀이·풀이방식(methodId)을 한 번에 읽고, 질문 없이 기존 소크라테스식 진단 flow에 자동 입장하는 웹 프로토타입.

**Architecture:** 웹(web-proto, 순수 HTML/JS) → Firebase Function `analyzePhoto`(GPT-4.1 vision, 신설) → 웹에서 단언("풀이 보니 ~네") → 앱의 진단 flow 엔진+데이터를 esbuild로 번들해 웹에서 그대로 실행. 뒷단 게이트(0.74, 후보 카드)는 기존 `diagnoseMethod` 패턴 재사용.

**Tech Stack:** Firebase Functions v2 (Node 22, TypeScript, zod), OpenAI Responses API (gpt-4.1 vision, json_schema strict), esbuild 번들, 순수 HTML/CSS/JS (프레임워크 없음).

**Spec:** `docs/superpowers/specs/2026-07-22-photo-flow-auto-method-routing-design.md`

---

## 확정된 결정 (spec 미결 4개 정리)

1. 단언 뒤 "아니야" 탈출구 → **준다** (후보 카드로 이동)
2. 커트라인 → **0.74 재사용** (`needsManualSelection` 게이트 동일)
3. 풀이 전사 노출 → **단언 문장에 한 조각만** 인용
4. 풀이 흔적 없음 판정 → vision 출력에 **`hasSolvingWork: boolean` 별도 필드**
5. 웹 화면 끝 → **대화 flow + 최종 약점 카드까지** (기윤 결정 B)
6. 모델 → **GPT-4.1** (기존 OPENAI_API_KEY 재사용, 정확도 부족 시 Claude 승격은 데이터 보고 결정)

## 가정 (Karpathy #1 — 실행 중 어긋나면 멈추고 보고)

- `OPENAI_API_KEY` 시크릿은 기존 `diagnoseMethod` 배포에서 이미 등록돼 있다 (Task 6에서 확인)
- gpt-4.1은 vision 입력(input_image)을 지원한다
- 루트 `tsconfig.json`에 `@/* → ./*` paths가 있어 esbuild가 `--tsconfig`로 해석한다 (Task 8에서 확인, 실패 시 `--alias:@=.` 폴백)
- `hasSolvingWork=false`(풀이 흔적 없음) 폴백의 텍스트 라우팅은 **이미 배포된 `diagnoseMethod` 함수를 그대로 호출**한다 (새 코드 0줄)

## 품질 기준 (2026-07-22 기윤 확정)

- 백엔드 순수 로직(게이트·정리 함수) = 단위 테스트 O (돈 나가고 조용히 깨지는 곳)
- web-proto HTML/JS = 테스트 X (버리는 껍데기, 검증 후 앱 이식 시 TDD)

## 파일 지도

| 구분 | 파일 | 책임 |
|------|------|------|
| Create | `functions/src/method-catalog.ts` | 풀이법 카탈로그 사본 (원본: `data/diagnosis-method-routing.ts`) |
| Create | `functions/src/analyze-photo-core.ts` | 순수 로직: vision 결과 정리·게이트 (테스트 대상) |
| Create | `functions/src/analyze-photo.ts` | HTTP 함수 껍데기 (요청 검증 → OpenAI → 응답) |
| Create | `functions/tests/analyze-photo-core.test.ts` | 순수 로직 단위 테스트 |
| Create | `scripts/verify-photo-analysis.mjs` | 검증 A 도구 (사진 → 함수 호출 → 결과 표) |
| Create | `web-proto/flow-entry.ts` | esbuild 번들 진입점 (flow 엔진+데이터 re-export) |
| Create | `web-proto/flow-bundle.js` | 번들 산출물 (git 커밋함 — 빌드체인 없이 열리게) |
| Create | `web-proto/app.js` | 웹 화면 로직 (업로드→분석→단언→flow 러너) |
| Modify | `functions/src/openai-client.ts` | vision 요청 함수 1개 추가 (기존 함수 무수정) |
| Modify | `functions/src/index.ts` | `analyzePhoto` export 1줄 |
| Modify | `web-proto/index.html` | 화면 3개 구조 + 카피 수정("찍은 것=틀린 것") |
| 무수정 | 앱(RN) 전체, 기존 함수들 | — |

---

### Task 1: 백엔드 — method 카탈로그 사본

**Files:**
- Create: `functions/src/method-catalog.ts`

- [ ] **Step 1: 원본 복사**

```bash
cp data/diagnosis-method-routing.ts functions/src/method-catalog.ts
```

- [ ] **Step 2: 헤더 교체 (앱 의존 제거)**

`functions/src/method-catalog.ts` 최상단의

```ts
import type { SolveMethodId } from './diagnosisTree';
```

를 삭제하고 아래로 교체:

```ts
// 사본: data/diagnosis-method-routing.ts (2026-07-22)
// functions 패키지는 앱 코드를 import할 수 없어 사본을 둔다. 원본 변경 시 다시 복사.
export type SolveMethodId =
  | 'cps'
  | 'vertex'
  | 'diff'
  | 'unknown'
  | 'factoring'
  | 'quadratic'
  | 'radical'
  | 'polynomial'
  | 'complex_number'
  | 'remainder_theorem'
  | 'set'
  | 'proposition'
  | 'trig'
  | 'integral'
  | 'linear_eq'
  | 'counting'
  | 'sequence'
  | 'log_exp'
  | 'conic'
  | 'limit'
  | 'vector'
  | 'probability'
  | 'space_geometry'
  | 'function'
  | 'statistics'
  | 'geometry'
  | 'permutation'
  | 'sequence_limit'
  | 'integral_advanced'
  | 'diff_advanced'
  | 'trig_advanced';
```

- [ ] **Step 3: 타입 체크**

Run: `cd functions && npm run lint`
Expected: 에러 없음

---

### Task 2: 백엔드 — 순수 로직 (TDD: 테스트 먼저)

**Files:**
- Create: `functions/tests/analyze-photo-core.test.ts`
- Create: `functions/src/analyze-photo-core.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`functions/tests/analyze-photo-core.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPhotoRouterResult, buildMethodContextText } from '../src/analyze-photo-core';

test('확신 높은 결과는 needsManualSelection=false', () => {
  const result = buildPhotoRouterResult({
    hasSolvingWork: true,
    userAnswer: '3',
    transcription: '판별식 D>0 확인 후 근의 공식 대입',
    predictedMethodId: 'quadratic',
    confidence: 0.9,
    candidateMethodIds: ['quadratic'],
    reason: 'formula visible',
  });
  assert.equal(result.predictedMethodId, 'quadratic');
  assert.equal(result.needsManualSelection, false);
});

test('confidence 0.74 미만이면 needsManualSelection=true', () => {
  const result = buildPhotoRouterResult({
    hasSolvingWork: true,
    userAnswer: null,
    transcription: '식 몇 줄',
    predictedMethodId: 'quadratic',
    confidence: 0.5,
    candidateMethodIds: ['quadratic', 'factoring'],
    reason: 'ambiguous',
  });
  assert.equal(result.needsManualSelection, true);
  assert.deepEqual(result.candidateMethodIds, ['quadratic', 'factoring']);
});

test('허용 밖 methodId는 unknown으로 강등', () => {
  const result = buildPhotoRouterResult({
    hasSolvingWork: true,
    userAnswer: '2',
    transcription: '적당한 풀이',
    predictedMethodId: 'made_up_method',
    confidence: 0.95,
    candidateMethodIds: ['made_up_method', 'diff'],
    reason: 'x',
  });
  assert.equal(result.predictedMethodId, 'unknown');
  assert.equal(result.needsManualSelection, true);
  assert.deepEqual(result.candidateMethodIds, ['diff']);
});

test('풀이 흔적 없으면 confidence 높아도 needsManualSelection=true', () => {
  const result = buildPhotoRouterResult({
    hasSolvingWork: false,
    userAnswer: '5',
    transcription: '',
    predictedMethodId: 'diff',
    confidence: 0.9,
    candidateMethodIds: ['diff'],
    reason: 'no work shown',
  });
  assert.equal(result.needsManualSelection, true);
});

test('카탈로그 컨텍스트에 unknown은 빠지고 labelKo가 들어간다', () => {
  const text = buildMethodContextText();
  assert.ok(text.includes('근의 공식'));
  assert.ok(!text.includes('id: unknown'));
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd functions && npm test`
Expected: FAIL — `Cannot find module '../src/analyze-photo-core'`

- [ ] **Step 3: 최소 구현**

`functions/src/analyze-photo-core.ts`:

```ts
import { diagnosisMethodRoutingCatalog, type SolveMethodId } from './method-catalog';

export type VisionRawResult = {
  hasSolvingWork: boolean;
  userAnswer: string | null;
  transcription: string;
  predictedMethodId: string;
  confidence: number;
  candidateMethodIds: string[];
  reason: string;
};

export type PhotoRouterResult = {
  hasSolvingWork: boolean;
  userAnswer: string | null;
  transcription: string;
  predictedMethodId: SolveMethodId;
  confidence: number;
  candidateMethodIds: SolveMethodId[];
  reason: string;
  needsManualSelection: boolean;
  source: 'openai-vision';
};

const HIGH_CONFIDENCE_THRESHOLD = 0.74;

export const allowedMethodIds = (
  Object.keys(diagnosisMethodRoutingCatalog) as SolveMethodId[]
).filter((id) => id !== 'unknown');

export function buildPhotoRouterResult(raw: VisionRawResult): PhotoRouterResult {
  const predictedMethodId = allowedMethodIds.includes(raw.predictedMethodId as SolveMethodId)
    ? (raw.predictedMethodId as SolveMethodId)
    : 'unknown';

  const candidates = new Set<SolveMethodId>();
  if (predictedMethodId !== 'unknown') {
    candidates.add(predictedMethodId);
  }
  raw.candidateMethodIds.forEach((id) => {
    if (allowedMethodIds.includes(id as SolveMethodId)) {
      candidates.add(id as SolveMethodId);
    }
  });
  if (candidates.size === 0) {
    candidates.add('unknown');
  }

  const needsManualSelection =
    !raw.hasSolvingWork ||
    predictedMethodId === 'unknown' ||
    raw.confidence < HIGH_CONFIDENCE_THRESHOLD;

  return {
    hasSolvingWork: raw.hasSolvingWork,
    userAnswer: raw.userAnswer,
    transcription: raw.transcription,
    predictedMethodId,
    confidence: raw.confidence,
    candidateMethodIds: Array.from(candidates),
    reason: raw.reason,
    needsManualSelection,
    source: 'openai-vision',
  };
}

export function buildMethodContextText(): string {
  const lines = allowedMethodIds.map((id) => {
    const method = diagnosisMethodRoutingCatalog[id];
    const examples = method.exampleUtterances.slice(0, 2).join(' / ');
    return [
      `- id: ${method.id}`,
      `  이름: ${method.labelKo}`,
      `  설명: ${method.summary}`,
      `  예시: ${examples || '(없음)'}`,
    ].join('\n');
  });

  return ['허용된 풀이법 id: ' + allowedMethodIds.join(', '), '', '풀이법 설명:', ...lines].join('\n');
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd functions && npm test`
Expected: PASS (새 테스트 5개 포함 전체 green)

---

### Task 3: 백엔드 — vision 호출 + HTTP 함수

**Files:**
- Modify: `functions/src/openai-client.ts` (맨 아래에 추가)
- Create: `functions/src/analyze-photo.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: openai-client.ts 맨 아래에 vision 요청 함수 추가**

```ts
const PHOTO_ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    hasSolvingWork: { type: 'boolean' },
    userAnswer: { type: ['string', 'null'] },
    transcription: { type: 'string', maxLength: 600 },
    predictedMethodId: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    candidateMethodIds: {
      type: 'array',
      minItems: 1,
      maxItems: 4,
      items: { type: 'string' },
    },
    reason: { type: 'string', minLength: 1, maxLength: 120 },
  },
  required: [
    'hasSolvingWork',
    'userAnswer',
    'transcription',
    'predictedMethodId',
    'confidence',
    'candidateMethodIds',
    'reason',
  ],
} as const;

const PHOTO_ANALYSIS_SYSTEM_PROMPT = [
  '당신은 한국 수능 수학 오답 사진 분석기입니다.',
  '사진에는 학생이 틀린 문제 하나와 학생의 손글씨 풀이가 담겨 있습니다.',
  '할 일: ① 학생이 적은 최종 답 읽기 ② 손글씨 풀이를 짧게 전사 ③ 어떤 풀이 방법을 시도했는지 분류.',
  '문제를 직접 풀지 마세요. 해설하지 마세요. 학생이 실제로 쓴 것만 근거로 삼으세요.',
  '손글씨 풀이 과정이 사진에 없으면 hasSolvingWork를 false로 하고 transcription은 빈 문자열로 두세요.',
  'userAnswer는 학생이 적은 최종 답(예: "3", "27"). 안 보이면 null.',
  'transcription은 학생 풀이의 핵심 단계를 한국어 1~3문장으로 요약 전사하세요.',
  '반드시 허용된 풀이법 id 중 하나를 predictedMethodId로 반환하세요. 근거가 약하면 unknown.',
  'confidence는 정직하게: 풀이가 흐릿하거나 애매하면 낮게 매기세요.',
  'candidateMethodIds는 가능성 높은 순서로 1~4개. reason은 내부 디버그용으로 짧고 건조하게.',
].join('\n');

export async function requestPhotoAnalysisFromOpenAI({
  apiKey,
  model,
  imageDataUrl,
  methodContextText,
}: {
  apiKey: string;
  model: string;
  imageDataUrl: string;
  methodContextText: string;
}): Promise<{ result: unknown; responseId: string; model: string }> {
  const client = new OpenAI({ apiKey });

  const response = await client.responses.create({
    model,
    instructions: PHOTO_ANALYSIS_SYSTEM_PROMPT,
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: methodContextText },
          { type: 'input_image', image_url: imageDataUrl, detail: 'high' },
        ],
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'photo_analysis_result',
        schema: PHOTO_ANALYSIS_SCHEMA,
        strict: true,
      },
    },
  });

  const outputText = response.output_text?.trim();
  if (!outputText) {
    throw new Error('OpenAI photo analysis did not include output_text');
  }

  return {
    result: JSON.parse(outputText),
    responseId: response.id,
    model,
  };
}
```

- [ ] **Step 2: analyze-photo.ts 작성**

```ts
import * as logger from 'firebase-functions/logger';
import { defineSecret, defineString } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';

import {
  buildMethodContextText,
  buildPhotoRouterResult,
} from './analyze-photo-core';
import { requestPhotoAnalysisFromOpenAI } from './openai-client';

const openAiApiKey = defineSecret('OPENAI_API_KEY');
const openAiVisionModel = defineString('OPENAI_VISION_MODEL', { default: 'gpt-4.1' });

// base64 +33% 감안 원본 약 6MB 상한 — 요청 크기·비용 가드 (웹은 1568px로 축소해 보냄)
const MAX_IMAGE_DATA_URL_LENGTH = 8_000_000;

const AnalyzePhotoRequestSchema = z.object({
  imageDataUrl: z
    .string()
    .startsWith('data:image/')
    .max(MAX_IMAGE_DATA_URL_LENGTH),
});

const VisionRawResultSchema = z.object({
  hasSolvingWork: z.boolean(),
  userAnswer: z.string().nullable(),
  transcription: z.string(),
  predictedMethodId: z.string(),
  confidence: z.number().min(0).max(1),
  candidateMethodIds: z.array(z.string()).min(1).max(4),
  reason: z.string(),
});

export const analyzePhoto = onRequest(
  {
    region: 'asia-northeast3',
    timeoutSeconds: 60,
    cors: true,
    invoker: 'public',
    secrets: [openAiApiKey],
  },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const parsedRequest = AnalyzePhotoRequestSchema.safeParse(request.body);
    if (!parsedRequest.success) {
      response.status(400).json({
        error: 'Invalid request body',
        details: parsedRequest.error.flatten(),
      });
      return;
    }

    try {
      const openAiResponse = await requestPhotoAnalysisFromOpenAI({
        apiKey: openAiApiKey.value(),
        model: openAiVisionModel.value(),
        imageDataUrl: parsedRequest.data.imageDataUrl,
        methodContextText: buildMethodContextText(),
      });

      const raw = VisionRawResultSchema.parse(openAiResponse.result);
      const result = buildPhotoRouterResult(raw);

      logger.info('analyzePhoto done', {
        predictedMethodId: result.predictedMethodId,
        confidence: result.confidence,
        hasSolvingWork: result.hasSolvingWork,
        needsManualSelection: result.needsManualSelection,
        model: openAiResponse.model,
        responseId: openAiResponse.responseId,
      });

      response.status(200).json(result);
    } catch (error) {
      logger.error('analyzePhoto failed', error);
      response.status(500).json({ error: 'Failed to analyze photo' });
    }
  }
);
```

- [ ] **Step 3: index.ts에 export 추가**

`functions/src/index.ts`의 기존 export 목록에 한 줄:

```ts
export { analyzePhoto } from './analyze-photo';
```

- [ ] **Step 4: 검증**

Run: `cd functions && npm run lint && npm test`
Expected: 타입 에러 없음, 테스트 전체 PASS

- [ ] **Step 5: 커밋**

```bash
git add functions/src/method-catalog.ts functions/src/analyze-photo-core.ts functions/src/analyze-photo.ts functions/src/openai-client.ts functions/src/index.ts functions/tests/analyze-photo-core.test.ts
git commit -m "feat(functions): analyzePhoto — 사진 한 장에서 답·풀이 전사·풀이방식 vision 분석"
```

---

### Task 4: 배포 + 검증 A 도구

**Files:**
- Create: `scripts/verify-photo-analysis.mjs`

- [ ] **Step 1: 검증 스크립트 작성**

```js
#!/usr/bin/env node
// 검증 A 도구: 사진을 analyzePhoto 함수에 보내 분류 결과를 표로 출력한다.
// 사용: node scripts/verify-photo-analysis.mjs <사진1.jpg> [사진2.jpg ...]
// URL 재정의: ANALYZE_PHOTO_URL=... node scripts/verify-photo-analysis.mjs ...
import { readFile } from 'node:fs/promises';
import { extname, basename } from 'node:path';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? '<PROJECT_ID>'; // .firebaserc 값으로 채움
const url =
  process.env.ANALYZE_PHOTO_URL ??
  `https://asia-northeast3-${PROJECT_ID}.cloudfunctions.net/analyzePhoto`;

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('사용: node scripts/verify-photo-analysis.mjs <사진.jpg> [...]');
  process.exit(1);
}

const mimeByExt = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

for (const file of files) {
  const mime = mimeByExt[extname(file).toLowerCase()];
  if (!mime) {
    console.error(`건너뜀 (지원 안 함): ${file}`);
    continue;
  }
  const buffer = await readFile(file);
  const imageDataUrl = `data:${mime};base64,${buffer.toString('base64')}`;

  const started = Date.now();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageDataUrl }),
  });
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  if (!response.ok) {
    console.error(`✗ ${basename(file)} — HTTP ${response.status}: ${await response.text()}`);
    continue;
  }

  const r = await response.json();
  console.log(`\n=== ${basename(file)} (${elapsed}s) ===`);
  console.log(`  풀이흔적: ${r.hasSolvingWork}  답: ${r.userAnswer ?? '(못 읽음)'}`);
  console.log(`  방식: ${r.predictedMethodId}  confidence: ${r.confidence}  되물음: ${r.needsManualSelection}`);
  console.log(`  후보: ${r.candidateMethodIds.join(', ')}`);
  console.log(`  전사: ${r.transcription || '(없음)'}`);
  console.log(`  reason: ${r.reason}`);
}
```

- [ ] **Step 2: PROJECT_ID 채우기**

Run: `cat .firebaserc`
스크립트의 `<PROJECT_ID>`를 실제 값으로 교체.

- [ ] **Step 3: 함수 배포**

```bash
cd functions && npm run build && npx firebase deploy --only functions:analyzePhoto
```

Expected: `✔ Deploy complete!` + analyzePhoto URL 출력

- [ ] **Step 4: 스모크 테스트 (임의 수학 사진 1장)**

Run: `node scripts/verify-photo-analysis.mjs <아무 수학 풀이 사진>`
Expected: JSON 결과 표 출력 (methodId·confidence 등)

- [ ] **Step 5: 커밋**

```bash
git add scripts/verify-photo-analysis.mjs
git commit -m "feat(scripts): 검증 A 도구 — 사진 분석 정확도 손검증 스크립트"
```

---

### Task 5: 🚦 체크포인트 — 검증 A (기윤 게이트)

**여기서 멈추고 기윤에게 넘긴다. 이 게이트를 통과해야 웹 UI(Task 6~7)를 만든다.**

- [ ] **Step 1: 기윤이 문제 2~3개를 직접 풀어 사진 촬영** (틀린 문제 시나리오: 풀이 과정 손글씨 포함, 답 표기)
- [ ] **Step 2: 스크립트로 돌리고 결과를 기윤과 함께 판정**

Run: `node scripts/verify-photo-analysis.mjs 사진1.jpg 사진2.jpg 사진3.jpg`

판정 기준:
- methodId가 실제 푼 방법과 일치하는가 (착지 정확도)
- confidence가 정직한가 (애매한 풀이에 낮게 나오는가)
- 답·전사를 제대로 읽었는가 (읽기 정확도)

- [ ] **Step 3: 판정 결과 기록**
- 통과 → Task 6 진행
- 실패 → 멈추고 재논의 (프롬프트 조정 / 모델 승격 / 방향 수정) — **웹 작업 착수 금지**

---

### Task 6: 웹 — flow 엔진+데이터 번들

**Files:**
- Create: `web-proto/flow-entry.ts`
- Create: `web-proto/flow-bundle.js` (산출물, 커밋함)

- [ ] **Step 1: 번들 진입점 작성**

`web-proto/flow-entry.ts`:

```ts
// esbuild 번들 진입점 — 앱의 진단 flow 엔진과 데이터를 웹에서 그대로 쓴다.
// 빌드: npx esbuild web-proto/flow-entry.ts --bundle --format=iife --global-name=DasidaFlow --tsconfig=tsconfig.json --outfile=web-proto/flow-bundle.js
export { methodOptions } from '@/data/diagnosisTree';
export { diagnosisMethodRoutingCatalog } from '@/data/diagnosis-method-routing';
export {
  advanceFromCheck,
  advanceFromChoice,
  advanceFromExplain,
  createDiagnosisFlowDraft,
  getDiagnosisFlow,
  getNode,
} from '@/features/quiz/diagnosis-flow-engine';
```

- [ ] **Step 2: 번들 생성**

```bash
npx esbuild web-proto/flow-entry.ts --bundle --format=iife --global-name=DasidaFlow --tsconfig=tsconfig.json --outfile=web-proto/flow-bundle.js
```

Expected: `web-proto/flow-bundle.js` 생성 (수십 KB). `@` alias 해석 실패 시 `--alias:@=.` 추가.

- [ ] **Step 3: 동작 확인 (cjs로 재번들해 노드에서 걷기)**

```bash
npx esbuild web-proto/flow-entry.ts --bundle --format=cjs --tsconfig=tsconfig.json --outfile="$SCRATCH/flow-check.cjs" && node -e "
const f = require(process.env.SCRATCH + '/flow-check.cjs');
const d = f.createDiagnosisFlowDraft('quadratic');
const flow = f.getDiagnosisFlow('quadratic');
console.log('methods:', f.methodOptions.length, '| start:', d.currentNodeId, '| node kind:', f.getNode(flow, d.currentNodeId).kind);
"
```

Expected: `methods: 31` 근처 + start 노드 id + kind 출력, 에러 없음 (`$SCRATCH`는 세션 스크래치패드 경로)

- [ ] **Step 4: 커밋**

```bash
git add web-proto/flow-entry.ts web-proto/flow-bundle.js
git commit -m "feat(web-proto): 진단 flow 엔진+데이터 esbuild 번들"
```

---

### Task 7: 웹 — 업로드→분석→단언→flow 러너 화면

**Files:**
- Modify: `web-proto/index.html` (화면 구조 + 카피 수정)
- Create: `web-proto/app.js`

- [ ] **Step 1: index.html 재작성**

기존 인라인 `<script>` 제거, 화면 3개 구조로. 기존 스타일 유지 + 채팅 스타일 추가. 카피를 어제 결정("찍은 것 = 틀린 것")에 맞게:

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>다시다 — 틀린 문제, 왜 틀렸는지 알려줌</title>
<style>
  /* 기존 :root/body/.wrap/.brand/h1/.sub/.drop/.picked/.steps/.cta/.foot/.tag 스타일 그대로 유지 */
  /* --- 추가: 채팅 화면 --- */
  .screen[hidden] { display: none; }
  .thread { display: flex; flex-direction: column; gap: 10px; padding: 8px 0 24px; }
  .bubble { max-width: 88%; padding: 12px 14px; border-radius: 16px; font-size: 15px; line-height: 1.55; white-space: pre-wrap; }
  .bubble.coach { background: #fff; border: 1px solid var(--line); align-self: flex-start; border-top-left-radius: 4px; }
  .bubble.me { background: var(--green); color: #fff; align-self: flex-end; border-top-right-radius: 4px; }
  .card { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 16px; }
  .card .card-title { font-weight: 800; font-size: 15px; margin-bottom: 6px; }
  .card .card-body { font-size: 14px; line-height: 1.6; color: var(--ink); }
  .card.final { border-color: var(--green-soft); background: var(--cream-2); }
  .actions { display: flex; flex-direction: column; gap: 8px; padding: 6px 0 30px; }
  .actions button { border: 1.5px solid var(--green-soft); background: #fff; color: var(--green);
    border-radius: 12px; padding: 13px 14px; font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit; text-align: left; }
  .actions button.primary { background: var(--green); color: #fff; border-color: var(--green); }
  .actions button.ghost { border-color: var(--line); color: var(--muted); font-weight: 500; }
  .spinner { text-align: center; padding: 60px 0; color: var(--muted); font-size: 15px; }
  .fallback-input { width: 100%; border: 1.5px solid var(--line); border-radius: 12px; padding: 13px; font-size: 15px; font-family: inherit; }
</style>
</head>
<body>
  <main class="wrap">
    <div class="brand">다시다</div>

    <!-- 화면 1: 업로드 -->
    <section class="screen" id="screen-upload">
      <h1>틀린 문제만 찍어서 올려줘<br /><span class="hl">왜 틀렸는지</span> 알려줄게</h1>
      <p class="sub">채점은 이미 했잖아. 틀린 문제 하나, 풀이 흔적까지 나오게 찍으면 돼.</p>
      <div class="drop" id="drop">
        <div class="icon">📸</div>
        <div class="big">틀린 문제 사진 올리기</div>
        <div class="small">풀이 쓴 부분까지 한 장에 나오게</div>
        <div class="picked" id="picked"></div>
        <input type="file" id="file" accept="image/*" hidden />
      </div>
      <ol class="steps">
        <li><span class="n">1</span><span>틀린 문제 하나를 풀이까지 나오게 찍는다</span></li>
        <li><span class="n">2</span><span>AI가 풀이를 읽고 어디서 막혔는지 찾는다</span></li>
        <li><span class="n">3</span><span>질문 몇 개로 진짜 약점을 확정한다</span></li>
      </ol>
      <button class="cta" id="cta">분석 시작</button>
      <p class="foot"><span class="tag">지금 무료</span><br />설치·로그인 없음 · 사진은 분석에만 쓰고 원문은 안 남김</p>
    </section>

    <!-- 화면 2: 분석 중 -->
    <section class="screen" id="screen-analyzing" hidden>
      <div class="spinner">풀이 읽는 중… (10초 정도)</div>
    </section>

    <!-- 화면 3: 진단 대화 -->
    <section class="screen" id="screen-chat" hidden>
      <div class="thread" id="thread"></div>
      <div class="actions" id="actions"></div>
    </section>
  </main>
  <script src="./flow-bundle.js"></script>
  <script src="./app.js"></script>
</body>
</html>
```

- [ ] **Step 2: app.js 작성**

```js
(function () {
  // ── 설정 (Task 4에서 확정된 값으로 채움) ──
  const PROJECT_ID = '<PROJECT_ID>';
  const ANALYZE_URL = `https://asia-northeast3-${PROJECT_ID}.cloudfunctions.net/analyzePhoto`;
  const DIAGNOSE_METHOD_URL = `https://asia-northeast3-${PROJECT_ID}.cloudfunctions.net/diagnoseMethod`;

  const F = window.DasidaFlow;
  const catalog = F.diagnosisMethodRoutingCatalog;
  const selectableMethods = F.methodOptions.filter((m) => m.id !== 'unknown');

  // ── 화면 전환 ──
  const screens = {
    upload: document.getElementById('screen-upload'),
    analyzing: document.getElementById('screen-analyzing'),
    chat: document.getElementById('screen-chat'),
  };
  function show(name) {
    Object.entries(screens).forEach(([key, el]) => { el.hidden = key !== name; });
    window.scrollTo(0, 0);
  }

  // ── 채팅 프리미티브 ──
  const thread = document.getElementById('thread');
  const actionsBox = document.getElementById('actions');
  function coachSays(text) { bubble('coach', text); }
  function userSays(text) { bubble('me', text); }
  function bubble(who, text) {
    const el = document.createElement('div');
    el.className = 'bubble ' + who;
    el.textContent = text;
    thread.appendChild(el);
    el.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
  function cardEl(title, body, extraClass) {
    const el = document.createElement('div');
    el.className = 'card' + (extraClass ? ' ' + extraClass : '');
    el.innerHTML = '<div class="card-title"></div><div class="card-body"></div>';
    el.querySelector('.card-title').textContent = title;
    el.querySelector('.card-body').textContent = body || '';
    thread.appendChild(el);
    el.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
  function setActions(buttons) {
    actionsBox.innerHTML = '';
    buttons.forEach(({ label, kind, onPress }) => {
      const b = document.createElement('button');
      if (kind) b.className = kind;
      b.textContent = label;
      b.addEventListener('click', () => { actionsBox.innerHTML = ''; onPress(); });
      actionsBox.appendChild(b);
    });
  }

  // ── 화면 1: 업로드 ──
  const drop = document.getElementById('drop');
  const fileInput = document.getElementById('file');
  const picked = document.getElementById('picked');
  const cta = document.getElementById('cta');
  let selectedFile = null;

  drop.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => setFile(fileInput.files[0]));
  ['dragover', 'dragenter'].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (ev) => { const f = ev.dataTransfer.files[0]; if (f) setFile(f); });

  function setFile(f) {
    if (!f) return;
    selectedFile = f;
    picked.textContent = '✓ ' + f.name;
    picked.style.display = 'block';
    cta.classList.add('ready');
  }

  cta.addEventListener('click', async () => {
    if (!selectedFile) return;
    show('analyzing');
    try {
      const imageDataUrl = await downscaleToDataUrl(selectedFile, 1568, 0.82);
      const response = await fetch(ANALYZE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl }),
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const result = await response.json();
      show('chat');
      routeFromAnalysis(result);
    } catch (error) {
      show('upload');
      alert('분석에 실패했어요. 잠시 후 다시 시도해줘요. (' + error.message + ')');
    }
  });

  // 사진 축소 — 전송량·비용 절감 (긴 변 1568px, JPEG 0.82)
  async function downscaleToDataUrl(file, maxDim, quality) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  }

  // ── 분석 결과 → 3갈래 라우팅 ──
  function routeFromAnalysis(result) {
    if (!result.hasSolvingWork) {
      askMethodByText();  // 갈래 3: 풀이 흔적 없음 → 질문 폴백
      return;
    }
    if (result.needsManualSelection) {
      showCandidateCards(result.candidateMethodIds);  // 갈래 2: 애매 → 후보 카드
      return;
    }
    assertMethod(result);  // 갈래 1: 확신 → 단언
  }

  // 갈래 1: 단언 + 탈출구
  function assertMethod(result) {
    const label = catalog[result.predictedMethodId].labelKo;
    const snippet = firstSnippet(result.transcription);
    coachSays(`풀이 읽었어. ${snippet ? snippet + ' — ' : ''}${label}(으)로 접근했네.`);
    coachSays('그럼 여기서부터 같이 보자.');
    setActions([
      { label: '맞아, 시작하자', kind: 'primary', onPress: () => { userSays('맞아'); startFlow(result.predictedMethodId); } },
      { label: '아니야, 다른 방법으로 풀었어', kind: 'ghost', onPress: () => { userSays('아니야'); showCandidateCards([]); } },
    ]);
  }
  function firstSnippet(transcription) {
    if (!transcription) return '';
    const cut = transcription.split(/[.。\n]/)[0].trim();
    return cut.length > 40 ? cut.slice(0, 40) + '…' : cut;
  }

  // 갈래 2: 후보 카드 (후보 없으면 전체 목록)
  function showCandidateCards(candidateIds) {
    const candidates = candidateIds.filter((id) => id !== 'unknown');
    coachSays(candidates.length > 0 ? '풀이를 봤는데 두 가지로 읽혀. 어떤 방법이었어?' : '어떤 방법으로 풀었어?');
    const list = candidates.length > 0 ? candidates : selectableMethods.map((m) => m.id);
    const buttons = list.map((id) => ({
      label: catalog[id].labelKo,
      onPress: () => { userSays(catalog[id].labelKo); startFlow(id); },
    }));
    if (candidates.length > 0) {
      buttons.push({ label: '둘 다 아니야', kind: 'ghost', onPress: () => showCandidateCards([]) });
    }
    setActions(buttons);
  }

  // 갈래 3: 질문 폴백 (기존 diagnoseMethod 함수 재사용)
  function askMethodByText() {
    coachSays('사진에서 풀이 과정을 못 찾았어. 머리로 푼 거면 괜찮아 — 어떤 방법으로 풀었는지 짧게 알려줄래?');
    const input = document.createElement('input');
    input.className = 'fallback-input';
    input.placeholder = '예: 근의 공식에 바로 대입했어';
    actionsBox.innerHTML = '';
    actionsBox.appendChild(input);
    const submit = document.createElement('button');
    submit.className = 'primary';
    submit.textContent = '보내기';
    submit.addEventListener('click', async () => {
      const rawText = input.value.trim();
      if (!rawText) return;
      userSays(rawText);
      actionsBox.innerHTML = '';
      try {
        const allowedMethods = selectableMethods.map((m) => {
          const c = catalog[m.id];
          return { id: c.id, labelKo: c.labelKo, summary: c.summary, exampleUtterances: c.exampleUtterances.slice(0, 2) };
        });
        const response = await fetch(DIAGNOSE_METHOD_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problemId: 'photo-proto',
            rawText,
            allowedMethodIds: allowedMethods.map((m) => m.id),
            allowedMethods,
          }),
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const result = await response.json();
        if (result.needsManualSelection) showCandidateCards(result.candidateMethodIds);
        else startFlow(result.predictedMethodId);
      } catch {
        showCandidateCards([]);  // 라우터 실패 시 전체 목록으로
      }
    });
    actionsBox.appendChild(submit);
    input.focus();
  }

  // ── 진단 flow 러너 (앱 엔진 그대로 걷기) ──
  let draft = null;
  function startFlow(methodId) {
    draft = F.createDiagnosisFlowDraft(methodId);
    renderCurrentNode();
  }
  function renderCurrentNode() {
    const flow = F.getDiagnosisFlow(draft.methodId);
    const node = F.getNode(flow, draft.currentNodeId);

    if (node.kind === 'choice') {
      cardEl(node.title, node.body);
      setActions(node.options.map((option) => ({
        label: option.text,
        onPress: () => { userSays(option.text); draft = F.advanceFromChoice(draft, option.id); renderCurrentNode(); },
      })));
      return;
    }

    if (node.kind === 'explain') {
      cardEl(node.title, node.body);
      setActions([
        { label: node.primaryLabel, kind: 'primary', onPress: () => { draft = F.advanceFromExplain(draft, 'continue'); renderCurrentNode(); } },
        { label: node.secondaryLabel, kind: 'ghost', onPress: () => { draft = F.advanceFromExplain(draft, 'dont_know'); renderCurrentNode(); } },
      ]);
      return;
    }

    if (node.kind === 'check') {
      cardEl(node.title, node.prompt);
      const buttons = node.options.map((option) => ({
        label: option.text,
        onPress: () => { userSays(option.text); draft = F.advanceFromCheck(draft, option.id); renderCurrentNode(); },
      }));
      buttons.push({ label: '모르겠어요', kind: 'ghost', onPress: () => { draft = F.advanceFromCheck(draft, undefined); renderCurrentNode(); } });
      setActions(buttons);
      return;
    }

    // final: 최종 약점 카드
    cardEl(node.title, node.body, 'final');
    coachSays('오늘 여기까지. 이 카드가 네 진짜 약점이야 — 다음에 같은 자리에서 안 틀리게, 앱에서 이어서 잡아줄게.');
    setActions([
      { label: '다른 문제도 올려보기', kind: 'primary', onPress: () => window.location.reload() },
    ]);
  }
})();
```

- [ ] **Step 3: 로컬 서빙 + 브라우저 확인**

```bash
npx serve web-proto -l 3333
```

브라우저(Browser pane)에서 `http://localhost:3333` 열어 확인:
- 업로드 화면 카피가 "틀린 문제만 찍어서" 인가
- 검증 A에서 쓴 사진 올리기 → 분석 중 → 단언 or 후보 카드 → flow 노드가 대화로 걸어지나 → 최종 약점 카드 도달

Expected: 콘솔 에러 0, flow 끝까지 도달

- [ ] **Step 4: 커밋**

```bash
git add web-proto/index.html web-proto/app.js
git commit -m "feat(web-proto): 사진 업로드→vision 분석→단언→진단 flow 러너 연결"
```

---

### Task 8: E2E 검증 + 마무리

- [ ] **Step 1: 3갈래 각각 실제로 재현** (검증 A 사진 재사용)
- 풀이 있는 사진 → 단언 경로
- 애매한/흐린 사진 → 후보 카드 경로
- 풀이 없는 사진(문제만) → 질문 폴백 경로

Expected: 세 경로 모두 flow 진입 or 정상 되물음. 스크린샷 증거 저장.

- [ ] **Step 2: 모바일 뷰포트 확인** (Browser pane resize 375px) — 버튼 터치 크기, 스크롤 동작

- [ ] **Step 3: push + 기록**

```bash
git push origin main && npm run log:commit
```

- [ ] **Step 4: 노션 업데이트 (기윤 승인 후)** — 기존 "📤 PDF/사진 업로드 오답노트 대행 (프로토타입)" 페이지에 "🔄 2026.07.22 결정 + 구현" 섹션 추가 (초안 보여주고 OK 받고 쓰기)

---

## Self-Review 결과

- **Spec 커버리지**: 핵심 결정(vision 1콜) → Task 3 / 단언 UX → Task 7 assertMethod / 갈래 3개 → routeFromAnalysis / 검증 A → Task 4~5 / v1 범위 밖(정오 판정 등) → 없음 확인 ✓
- **타입 일관성**: `VisionRawResult`(core) ↔ `VisionRawResultSchema`(function) ↔ `PHOTO_ANALYSIS_SCHEMA`(openai-client) 필드 7개 동일 ✓ / `buildPhotoRouterResult`·`buildMethodContextText` 이름 Task 2·3 일치 ✓
- **플레이스홀더**: `<PROJECT_ID>` 2곳은 Task 4 Step 2에서 `.firebaserc`로 채우는 명시적 절차 ✓

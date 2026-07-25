# 사진 flow '오류 짚기' 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** web-proto 사진 flow를 "어디가 어려웠어?" 설문에서 "여기서 틀렸네. 맞아?" 짚기로 전환한다.

**Architecture:** 기존 analyzePhoto 호출 하나를 확장(원샷)해 오류 후보 최대 2개 + 왜 + 쪽지시험 + 처방 + 자신감을 미리 받아 웹 "주머니"에 보관한다. 방법이 확정되는 모든 문이 `confirmMethod()` 하나로 모이고, 주머니 방법과 일치하면 짚기 사다리(투 스트라이크), 아니면 느낌 설문으로 간다. 앱 코드는 불변.

**Tech Stack:** Firebase Functions v2 (Node 22, zod, OpenAI Responses API strict JSON schema), web-proto 순수 JS (빌드 없음), node --test.

**Spec:** `docs/superpowers/specs/2026-07-25-photo-flow-error-pointing-design.md`

---

## 파일 지도

| 파일 | 역할 | 작업 |
|---|---|---|
| `functions/src/analyze-photo-core.ts` | 실수 유형 6종 상수, ErrorCandidate 타입, 응답 정화 | 수정 |
| `functions/tests/analyze-photo-core.test.ts` | 정화 로직 테스트 | 수정 |
| `functions/src/openai-client.ts` | vision JSON 스키마 + 조교 규칙서 프롬프트 | 수정 |
| `functions/src/analyze-photo.ts` | zod 스키마 확장 | 수정 |
| `web-proto/survey-data.js` | 느낌 설문 문구 + 처방 6줄 (신규, 빌드 불필요) | 생성 |
| `web-proto/app.js` | 주머니·confirmMethod·짚기 사다리·설문·카드 v2 | 수정 |
| `web-proto/index.html` | survey-data.js 로드 + 다시 찍기 버튼 문구 | 수정 |

실행 순서: 서버(1~3) → 데이터(4) → 웹(5~8) → 검증(9). 서버를 먼저 배포해야 웹 작업 중 실데이터로 확인 가능.

---

### Task 0: 브랜치 생성

- [ ] **Step 1: 브랜치**

```bash
cd /Users/baggiyun/dev/dasida-app
git checkout main && git pull
git checkout -b feat/photo-flow-error-pointing
```

---

### Task 1: 서버 — 실수 유형 상수·오류 후보 정화 (analyze-photo-core)

**Files:**
- Modify: `functions/src/analyze-photo-core.ts`
- Test: `functions/tests/analyze-photo-core.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`functions/tests/analyze-photo-core.test.ts` 하단에 추가 (기존 테스트 스타일 확인 후 동일하게 — `node:test` + `assert`):

```ts
import { sanitizeErrorCandidates, MISTAKE_TYPE_IDS } from '../src/analyze-photo-core';

const validCandidate = {
  quote: '= 3 ± 2√5',
  why: '√20을 2로 나누면 반으로 줄인 √5가 되어야 하는데 2를 곱했어.',
  mistakeType: 'calc_slip',
  fix: '계산을 한 단계 한 줄로 끊어 쓰자.',
  checkPrompt: '√36을 2로 나누면?',
  checkOptions: ['3', '√18', '6'],
  checkAnswerIndex: 0,
};

test('sanitizeErrorCandidates: 유효 후보는 통과, 최대 2개', () => {
  const out = sanitizeErrorCandidates([validCandidate, validCandidate, validCandidate], true);
  assert.equal(out.length, 2);
  assert.equal(out[0].mistakeType, 'calc_slip');
});

test('sanitizeErrorCandidates: 6종 밖 유형·빈 인용·보기 3개 아님·인덱스 초과는 탈락', () => {
  assert.equal(sanitizeErrorCandidates([{ ...validCandidate, mistakeType: 'lazy' }], true).length, 0);
  assert.equal(sanitizeErrorCandidates([{ ...validCandidate, quote: '  ' }], true).length, 0);
  assert.equal(sanitizeErrorCandidates([{ ...validCandidate, checkOptions: ['3'] }], true).length, 0);
  assert.equal(sanitizeErrorCandidates([{ ...validCandidate, checkAnswerIndex: 3 }], true).length, 0);
});

test('sanitizeErrorCandidates: 풀이 흔적 없으면 무조건 빈 배열', () => {
  assert.equal(sanitizeErrorCandidates([validCandidate], false).length, 0);
});

test('MISTAKE_TYPE_IDS는 정확히 6종', () => {
  assert.deepEqual([...MISTAKE_TYPE_IDS], [
    'concept_gap', 'formula_recall', 'setup_error',
    'calc_slip', 'procedure_miss', 'answer_read',
  ]);
});
```

- [ ] **Step 2: 실패 확인**

```bash
cd functions && npm test
```
Expected: FAIL — `sanitizeErrorCandidates is not exported` 계열 에러.

- [ ] **Step 3: 구현**

`functions/src/analyze-photo-core.ts`에 추가:

```ts
// 실수 유형 6종 — 문제 푸는 여정 순서. 스키마 enum과 웹 카드가 함께 쓰는 단일 원천.
export const MISTAKE_TYPE_IDS = [
  'concept_gap',    // 개념 구멍
  'formula_recall', // 공식 기억
  'setup_error',    // 식 세우기
  'calc_slip',      // 계산 손실수
  'procedure_miss', // 절차·조건 누락
  'answer_read',    // 마무리 해석
] as const;
export type MistakeTypeId = (typeof MISTAKE_TYPE_IDS)[number];

export type ErrorCandidate = {
  quote: string;          // 학생이 실제 쓴 줄 인용
  why: string;            // 왜 틀렸는지 2~3문장
  mistakeType: MistakeTypeId;
  fix: string;            // 학생 맞춤 처방 한 줄
  checkPrompt: string;    // 쪽지시험 질문
  checkOptions: string[]; // 보기 정확히 3개
  checkAnswerIndex: number; // 0~2
};

// AI 응답 방어: 규칙 위반 후보(6종 밖 유형, 빈 인용, 보기≠3, 인덱스 초과)는 버린다.
// 후보가 전부 탈락하면 웹이 알아서 설문으로 가므로 여기서 죽지 않는 게 중요.
export function sanitizeErrorCandidates(
  raw: unknown[],
  hasSolvingWork: boolean,
): ErrorCandidate[] {
  if (!hasSolvingWork || !Array.isArray(raw)) return [];
  const out: ErrorCandidate[] = [];
  for (const item of raw) {
    if (out.length >= 2) break;
    const c = item as Record<string, unknown>;
    const quote = typeof c.quote === 'string' ? c.quote.trim() : '';
    const why = typeof c.why === 'string' ? c.why.trim() : '';
    const fix = typeof c.fix === 'string' ? c.fix.trim() : '';
    const checkPrompt = typeof c.checkPrompt === 'string' ? c.checkPrompt.trim() : '';
    const checkOptions = Array.isArray(c.checkOptions)
      ? c.checkOptions.filter((o): o is string => typeof o === 'string' && o.trim() !== '')
      : [];
    const checkAnswerIndex = typeof c.checkAnswerIndex === 'number' ? c.checkAnswerIndex : -1;
    const mistakeType = MISTAKE_TYPE_IDS.find((id) => id === c.mistakeType);
    if (!quote || !why || !fix || !checkPrompt || !mistakeType) continue;
    if (checkOptions.length !== 3 || checkAnswerIndex < 0 || checkAnswerIndex > 2) continue;
    out.push({ quote, why, mistakeType, fix, checkPrompt, checkOptions, checkAnswerIndex });
  }
  return out;
}
```

그리고 `VisionRawResult` 타입에 두 필드 추가, `PhotoRouterResult`와 `buildPhotoRouterResult`에 통과 로직 추가:

```ts
export type VisionRawResult = {
  // ...기존 필드 유지...
  errorCandidates: unknown[];   // 정화 전 원본
  errorConfidence: number;      // 0~1, 오류 짚기 자신감 (방법 confidence와 별개)
};

export type PhotoRouterResult = {
  // ...기존 필드 유지...
  errorCandidates: ErrorCandidate[];
  errorConfidence: number;
};
```

`buildPhotoRouterResult` return 직전에:

```ts
  const errorCandidates = sanitizeErrorCandidates(raw.errorCandidates, raw.hasSolvingWork);
  // 후보가 전부 탈락했으면 자신감도 0으로 — 웹 검문소가 한 가지 숫자만 보면 되게
  const errorConfidence = errorCandidates.length === 0
    ? 0
    : Math.min(1, Math.max(0, raw.errorConfidence));
```

return 객체에 `errorCandidates, errorConfidence` 추가.

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd functions && npm test
```
Expected: PASS (기존 69개 + 신규 4개). 기존 buildPhotoRouterResult 테스트가 raw에 새 필드가 없어 컴파일 에러 나면, 해당 테스트 fixture에 `errorCandidates: [], errorConfidence: 0` 추가.

- [ ] **Step 5: 커밋**

```bash
git add functions/src/analyze-photo-core.ts functions/tests/analyze-photo-core.test.ts
git commit -m "feat(functions): 실수 유형 6종 + 오류 후보 정화 로직 (오류 짚기 1/3)"
```

---

### Task 2: 서버 — vision 스키마·조교 규칙서 프롬프트 확장 (openai-client, analyze-photo)

**Files:**
- Modify: `functions/src/openai-client.ts` (PHOTO_ANALYSIS_SCHEMA, PHOTO_ANALYSIS_SYSTEM_PROMPT)
- Modify: `functions/src/analyze-photo.ts` (VisionRawResultSchema)

- [ ] **Step 1: JSON 스키마 확장**

`PHOTO_ANALYSIS_SCHEMA`의 `properties`에 추가 (strict:true라 required에도 넣어야 함 — 못 찾은 날은 빈 배열 + 0):

```ts
    errorCandidates: {
      type: 'array',
      minItems: 0,
      maxItems: 2,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          quote: { type: 'string', maxLength: 160 },
          why: { type: 'string', maxLength: 400 },
          mistakeType: {
            type: 'string',
            enum: ['concept_gap', 'formula_recall', 'setup_error', 'calc_slip', 'procedure_miss', 'answer_read'],
          },
          fix: { type: 'string', maxLength: 200 },
          checkPrompt: { type: 'string', maxLength: 200 },
          checkOptions: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string', maxLength: 80 } },
          checkAnswerIndex: { type: 'integer', minimum: 0, maximum: 2 },
        },
        required: ['quote', 'why', 'mistakeType', 'fix', 'checkPrompt', 'checkOptions', 'checkAnswerIndex'],
      },
    },
    errorConfidence: { type: 'number', minimum: 0, maximum: 1 },
```

`required` 배열에 `'errorCandidates', 'errorConfidence'` 추가.

- [ ] **Step 2: 시스템 프롬프트 확장 (조교 규칙서 10개조 + 모범 예시 + ❌⭕)**

`PHOTO_ANALYSIS_SYSTEM_PROMPT` 배열을 다음으로 교체 (기존 10줄 유지 + 아래 추가):

```ts
const PHOTO_ANALYSIS_SYSTEM_PROMPT = [
  '당신은 한국 수능 수학 오답 사진 분석기입니다.',
  '사진에는 학생이 틀린 문제 하나와 학생의 손글씨 풀이가 담겨 있습니다.',
  '할 일: ① 학생이 적은 최종 답 읽기 ② 손글씨 풀이를 짧게 전사 ③ 어떤 풀이 방법을 시도했는지 분류 ④ 풀이에서 틀린 지점 찾기.',
  '문제를 직접 풀지 마세요. 해설하지 마세요. 학생이 실제로 쓴 것만 근거로 삼으세요.',
  '손글씨 풀이 과정이 사진에 없으면 hasSolvingWork를 false로 하고 transcription은 빈 문자열, errorCandidates는 빈 배열로 두세요.',
  'userAnswer는 학생이 적은 최종 답(예: "3", "27"). 안 보이면 null.',
  'transcription은 학생 풀이의 핵심 단계를 한국어 1~3문장으로 요약 전사하세요.',
  '반드시 허용된 풀이법 id 중 하나를 predictedMethodId로 반환하세요. 근거가 약하면 unknown.',
  'confidence는 정직하게: 풀이가 흐릿하거나 애매하면 낮게 매기세요.',
  'candidateMethodIds는 가능성 높은 순서로 1~4개. reason은 내부 디버그용으로 짧고 건조하게.',
  '',
  '[오류 짚기 규칙 — 반드시 지킬 것]',
  '1. quote에는 학생이 실제로 쓴 줄만 그대로 인용하세요. 사진에 없는 식을 지어내는 것은 최악의 실패입니다.',
  '2. errorCandidates는 자신 있는 순서로 최대 2개. 확실한 오류가 하나뿐이면 하나만 넣으세요. 억지 2등 금지.',
  '3. 여러 군데 틀렸어도 후보 하나당 오류 하나만. 제일 결정적인 것부터.',
  '4. mistakeType은 주어진 6종 중 하나만.',
  '5. 오류를 못 찾았거나 애매하면 errorCandidates를 비우고 errorConfidence를 낮게 쓰세요. 억지로 짚는 것보다 훨씬 낫습니다.',
  '6. why와 fix에서 정답이나 최종 값을 알려주지 마세요. 틀린 이유까지만.',
  '7. 새로운 풀이 방법을 제안하지 마세요. 학생이 쓴 방법 안에서만 이야기하세요.',
  '8. checkPrompt는 방금 짚은 그 한 조각만 확인하는 새 미니 문제. 보기 3개, 새 개념 금지.',
  '9. why는 2~3문장 + 탓하지 않는 한 줄(예: "√ 붙은 나누기는 원래 헷갈리기 쉬운 자리야"). 반말 코치 톤, 다그침 금지.',
  '10. 아래 모범 예시는 모양(말투·깊이·구조) 참고용입니다. 예시 속 숫자·식·내용을 절대 가져다 쓰지 마세요. 모든 내용은 이 학생의 사진에서만 나와야 합니다.',
  '',
  '[모범 예시 — 모양 참고용, 내용 복사 금지]',
  '문제: f(x) = x² − 10x + 29의 최솟값은?',
  '진단 질문 톤: "완전제곱식 풀이에서 어디가 가장 어려웠나요?"',
  '설명 톤: "더하고 뺀 수를 0으로 맞춰야 식이 유지됩니다. 또 마지막 상수항 계산에서 부호를 자주 놓칩니다."',
  '',
  '[❌/⭕ 대조 — 규칙 10의 시범]',
  '❌ 나쁜 why: "4를 더하고 빼는 원리가 헷갈렸구나" → 이 학생 문제에 없는 예시 내용이 새어 들어옴.',
  '⭕ 좋은 why: "√20을 2로 나눌 때 반으로 줄이는 대신 2를 곱했어. √가 붙은 나누기는 원래 헷갈리기 쉬운 자리야." → 모양은 예시, 내용은 학생 사진.',
].join('\n');
```

- [ ] **Step 3: zod 스키마 확장 (analyze-photo.ts)**

`VisionRawResultSchema`에 추가:

```ts
  errorCandidates: z.array(z.unknown()).max(2),
  errorConfidence: z.number().min(0).max(1),
```

(정밀 검증은 core의 sanitize가 담당 — zod는 모양만 본다. 로그에는 `errorCandidateCount: result.errorCandidates.length, errorConfidence: result.errorConfidence` 두 필드를 `logger.info`에 추가.)

- [ ] **Step 4: 컴파일·테스트**

```bash
cd functions && npm test
```
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add functions/src/openai-client.ts functions/src/analyze-photo.ts
git commit -m "feat(functions): analyzePhoto 원샷 확장 — 오류 후보 2개+쪽지시험+조교 규칙서 10개조 (오류 짚기 2/3)"
```

---

### Task 3: 서버 배포 + 실요청 스모크

- [ ] **Step 1: 배포**

```bash
firebase deploy --only functions:analyzePhoto
```
Expected: `✔ Deploy complete!`

- [ ] **Step 2: 실사진 스모크**

브라우저(web-proto)로 실제 오답 사진 1장 업로드 후, 개발자 도구 Network에서 analyzePhoto 응답 확인:
- `errorCandidates` 배열 존재, 각 항목에 quote/why/mistakeType/fix/checkPrompt/checkOptions(3개)/checkAnswerIndex
- `errorConfidence` 0~1
- quote가 실제 사진에 쓴 내용과 일치하는지 육안 확인 (환각 인용 1차 점검)

- [ ] **Step 3: 커밋 없음** (배포만)

---

### Task 4: 웹 — 느낌 설문 데이터 (survey-data.js 신규)

**Files:**
- Create: `web-proto/survey-data.js`
- Modify: `web-proto/index.html` (script 태그)

- [ ] **Step 1: 파일 생성**

`web-proto/survey-data.js` (빌드 불필요, 전역으로 노출):

```js
// 느낌 설문 + 약점 카드 문구 — 실수 유형 6종 기준.
// 원칙: 특정 문제의 숫자·식 금지(어떤 문제가 와도 성립), 분석 아닌 느낌을 묻는다.
window.DasidaPhotoSurvey = (function () {
  // 유형 라벨(카드 표기)과 통조림 처방(설문 경로 카드용 — 짚기 성공 시엔 AI의 fix 사용)
  var TYPES = {
    concept_gap:    { label: '개념 구멍',    fix: '문제 더 풀기 전에 이 방법이 왜 되는지 설명을 한 번만 다시 보자. 원리가 잡히면 나머지는 따라와.' },
    formula_recall: { label: '공식 기억',    fix: '시작 전에 공식을 손으로 세 번 써보자. 외운 게 아니라 손에 붙어야 실전에서 안 흔들려.' },
    setup_error:    { label: '식 세우기',    fix: '식을 세우면 대입하기 전에 문제 말과 맞는지 한 번 소리 내서 확인하자.' },
    calc_slip:      { label: '계산 손실수',  fix: '계산을 한 줄에 몰아 쓰지 말고 한 단계 한 줄로 끊어 쓰자. 손실수는 줄 간격에서 잡힌다.' },
    procedure_miss: { label: '절차 누락',    fix: '이 방법의 단계를 번호로 적어두고 풀 때마다 지워가며 가자. 빼먹는 자리가 보이게.' },
    answer_read:    { label: '마무리 해석',  fix: '답 쓰기 전에 "문제가 뭘 물었지?"를 한 번 다시 읽자. 다 풀고 넘어지는 게 제일 아깝잖아.' },
  };

  // 기본 설문 3종 — 커스텀이 없는 방법은 이 문구를 쓴다 (모든 방법에 실제 문구 보장)
  var DEFAULT_OPTIONS = [
    { type: 'concept_gap', text: '이 방법의 원리 자체가 잘 안 잡혔어' },
    { type: 'calc_slip',   text: '식은 세웠는데 계산에서 미끄러졌어' },
    { type: 'answer_read', text: '다 풀어놓고 마지막에 답을 잘못 쓴 것 같아' },
  ];

  // 방법별 커스텀 (그 방법의 언어로) — 검증하며 계속 추가한다
  var BY_METHOD = {
    cps: [
      { type: 'concept_gap',    text: '(x−a)² 꼴로 만드는 원리가 헷갈렸어' },
      { type: 'calc_slip',      text: '식 변형하다가 계산에서 미끄러졌어' },
      { type: 'procedure_miss', text: '(x−a)²=k까지 갔는데 그다음 뭘 할지 몰랐어' },
    ],
    vertex: [
      { type: 'formula_recall', text: '-b/2a 공식이 가물가물했어' },
      { type: 'calc_slip',      text: 'x 구하고 대입하다가 계산이 엉켰어' },
      { type: 'answer_read',    text: '구한 값에서 뭘 답으로 쓸지 헷갈렸어' },
    ],
    limit: [
      { type: 'concept_gap', text: '극한을 어떻게 쪼개는지 개념이 안 잡혔어' },
      { type: 'calc_slip',   text: '식 정리하다가 계산이 엉켰어' },
      { type: 'answer_read', text: '수렴인지 발산인지 마지막 판단이 헷갈렸어' },
    ],
  };

  // B안(오류 못 찾은 날) 전용: answer_read 힌트 버전
  var ANSWER_READ_HINT = { type: 'answer_read', text: '마지막에 답 쓸 때 실수한 것 같아' };

  function optionsFor(methodId) {
    var custom = methodId && BY_METHOD[methodId];
    return (custom || DEFAULT_OPTIONS).slice();
  }

  return { TYPES: TYPES, optionsFor: optionsFor, ANSWER_READ_HINT: ANSWER_READ_HINT };
})();
```

- [ ] **Step 2: index.html에 로드**

`web-proto/index.html`에서 `app.js` script 태그 **앞**에 추가:

```html
<script defer src="survey-data.js"></script>
```

(기존 script들이 defer면 순서 유지됨 — app.js보다 앞에 두는 것만 지킬 것)

- [ ] **Step 3: 브라우저 확인**

web-proto 서버 열고 콘솔에서:
```js
window.DasidaPhotoSurvey.optionsFor('cps').length === 3
```
Expected: true

- [ ] **Step 4: 커밋**

```bash
git add web-proto/survey-data.js web-proto/index.html
git commit -m "feat(web-proto): 느낌 설문 데이터 — 유형 6종 라벨·처방·방법별 문구"
```

---

### Task 5: 웹 — 주머니·confirmMethod·짚기 사다리 (app.js 핵심)

**Files:**
- Modify: `web-proto/app.js`

설계 핵심: **방법이 확정되는 모든 문(단언 맞아 / 추측 맞아 / 후보 선택 / 자유입력 판별 / 전체 목록)이 `confirmMethod(methodId)` 하나로 모인다.** 주머니 일치 여부 판단은 이 함수만 안다.

- [ ] **Step 1: 상수·주머니 추가**

app.js 상단 (`TOPIC_TOP_N` 근처)에:

```js
  // 오류 짚기 검문소 문턱 — 낮게 시작해 채점표 데이터로 조인다 (spec §2)
  const ERROR_CONFIDENCE_MIN = 0.5;
  // 추측 확인(경우 2 중간 확신) 하한 — 이 미만이면 바로 후보 카드
  const SOFT_ASSERT_MIN = 0.45;
  const SURVEY = window.DasidaPhotoSurvey;
  // 주머니: analyzePhoto 원샷 결과 전체. 방법이 뒤집히면 오류 진단은 무효.
  let pocket = null;
```

- [ ] **Step 2: routeFromAnalysis에 주머니 저장 + 추측 확인 분기**

기존 `routeFromAnalysis`를 다음으로 교체:

```js
  function routeFromAnalysis(result) {
    pocket = result;
    lastAnalysisText = [result.transcription, result.reason].filter(Boolean).join(' ');
    if (!result.hasSolvingWork) {
      offerRetake(); // 갈래 3: 풀이 흔적 없음 → 다시 찍기 유도 (Task 8)
      return;
    }
    if (result.needsManualSelection) {
      // 경우 2: 1등 추측이 살아 있고 확신이 중간이면 추측 확인부터
      if (result.confidence >= SOFT_ASSERT_MIN && catalog[result.predictedMethodId]) {
        softAssertMethod(result);
        return;
      }
      showCandidateCards(result.candidateMethodIds); // 확신 낮음: 바로 보기 제시
      return;
    }
    assertMethod(result); // 경우 1: 단언
  }
```

- [ ] **Step 3: assertMethod의 "맞아"를 confirmMethod로 교체 + softAssertMethod 신설**

`assertMethod` 안의 `startFlow(result.predictedMethodId)` 호출을 `confirmMethod(result.predictedMethodId)`로 교체. 그 아래 신설:

```js
  // 경우 2 중간 확신: 단정 대신 추측 확인 — "~같아. 맞아?"
  function softAssertMethod(result) {
    const info = catalog[result.predictedMethodId];
    const snippet = firstSnippet(result.transcription);
    coachSays(`풀이에 ${snippet ? `"${snippet}" ` : ''}쓴 게 보이던데 — ${info.labelKo}(으)로 푼 것 같아. 맞아?`);
    setActions([
      { label: '맞아', kind: 'primary', onPress: () => { userSays('맞아'); confirmMethod(result.predictedMethodId); } },
      {
        label: '아니야, 다른 방법이야', kind: 'ghost',
        onPress: () => {
          userSays('아니야');
          // 거절된 1등은 후보에서 제외 — 거절한 게 또 뜨지 않게
          showCandidateCards(result.candidateMethodIds, undefined, [result.predictedMethodId]);
        },
      },
    ]);
  }

  // 방법 확정의 단일 관문. 주머니 일치 + 자신감 통과 → 짚기, 아니면 설문.
  function confirmMethod(methodId) {
    const pocketAlive = pocket && methodId === pocket.predictedMethodId;
    if (pocketAlive && pocket.errorCandidates.length > 0 && pocket.errorConfidence >= ERROR_CONFIDENCE_MIN) {
      startPointing(0);
      return;
    }
    if (pocketAlive && pocket.hasSolvingWork) {
      // 가지 6 = B안: 방법은 맞는데 오류를 못 찾은 날 — 관찰을 솔직하게 보고
      coachSays('그런데 좀 신기해 — 풀이 과정에서는 틀린 데를 못 찾았어. 과정은 맞게 간 것 같거든.');
      coachSays('이러면 보통 마지막에 답을 옮겨 적을 때나 검산에서 새는 경우가 많아.');
      showFeelingSurvey(methodId, '풀면서 느낌상 뭐가 걸렸어?', true);
      return;
    }
    showFeelingSurvey(methodId); // 방법 뒤집힘·풀이 없음: 주머니 무효
  }
```

- [ ] **Step 4: 짚기 사다리 (투 스트라이크)**

```js
  // 짚기 사다리: 1번 → 2번("하나 더 걸리는 데 있었는데") → 느낌 설문. 세 번째 시도 없음.
  function startPointing(idx) {
    const cand = pocket.errorCandidates[idx];
    if (!cand) {
      showFeelingSurvey(pocket.predictedMethodId, '음, 그럼 내 눈에 보이는 데는 아니었나 보네. 각도를 바꿔보자 — 풀면서 느낌상 뭐가 제일 걸렸어?');
      return;
    }
    if (idx === 0) {
      coachSays('그럼 풀이를 좀 더 보자.');
      coachSays(`여기 — "${cand.quote}" 쓴 부분. 여기서 틀린 것 같아. 맞아?`);
    } else {
      coachSays(`그래? 그럼 하나 더 걸리는 데가 있었는데 — "${cand.quote}" 쓴 줄. 여기 아니야?`);
    }
    setActions([
      { label: idx === 0 ? '맞아, 거기서 틀렸어' : '맞아, 거기야', kind: 'primary',
        onPress: () => { userSays('맞아, 거기야'); showWhy(idx); } },
      { label: idx === 0 ? '아니야, 거기 아니야' : '아니야', kind: 'ghost',
        onPress: () => { userSays('아니야'); startPointing(idx + 1); } },
    ]);
  }
```

- [ ] **Step 5: 커밋** (showWhy·showFeelingSurvey는 Task 6·7에서 — 이 시점엔 미정의 함수라 브라우저에서 해당 경로만 에러. 커밋은 Task 7 끝에서 묶어서 한다. 여기서는 저장만.)

---

### Task 6: 웹 — 왜 설명·쪽지시험·약점 카드 v2

**Files:**
- Modify: `web-proto/app.js` (Task 5에 이어서)

- [ ] **Step 1: 왜 설명 + 쪽지시험**

```js
  function showWhy(idx) {
    const cand = pocket.errorCandidates[idx];
    coachSays(cand.why);
    setActions([
      { label: '그렇구나, 확인해볼래', kind: 'primary', onPress: () => showCheck(idx) },
    ]);
  }

  function showCheck(idx) {
    const cand = pocket.errorCandidates[idx];
    coachSays(`그럼 진짜 아는지 보자. ${cand.checkPrompt}`);
    setActions(cand.checkOptions.map((opt, i) => ({
      label: opt,
      onPress: () => {
        userSays(opt);
        const passed = i === cand.checkAnswerIndex;
        if (passed) {
          coachSays('그렇지. 이제 이 자리에서는 안 틀리겠네.');
        } else {
          // 재시험 없음 — 한 번만 더 짚고 넘어간다 (늘어지면 귀찮음 축 침범)
          coachSays(`아직 헷갈리는구나. 정답은 "${cand.checkOptions[cand.checkAnswerIndex]}" — 아까랑 같은 원리야.`);
        }
        showWeaknessCard({
          methodId: pocket.predictedMethodId,
          mistakeType: cand.mistakeType,
          evidence: cand.quote,
          fix: cand.fix,
          aiConfirmed: true,
          checkPassed: passed,
        });
      },
    })));
  }
```

- [ ] **Step 2: 약점 카드 v2**

기존 final 노드 렌더링(`renderCurrentNode`의 final 분기 + `cardEl(... 'final')` 사용부)을 대체할 카드:

```js
  // 약점 카드 v2 = 방법 × 실수 유형 × 증거. 설문 경로(aiConfirmed=false)는 증거 없이 조심스러운 톤.
  function showWeaknessCard({ methodId, mistakeType, evidence, fix, aiConfirmed, checkPassed }) {
    const methodLabel = methodId && catalog[methodId] ? catalog[methodId].labelKo : '방법 미상';
    const typeInfo = SURVEY.TYPES[mistakeType];
    const title = `오늘 찾은 ${aiConfirmed ? '진짜 ' : ''}약점 — ${methodLabel} × ${typeInfo.label}`;
    const lines = [];
    if (aiConfirmed && evidence) lines.push(`짚은 자리: "${evidence}"`);
    if (!aiConfirmed) lines.push('(네가 직접 짚어준 것)');
    lines.push(fix || typeInfo.fix);
    if (aiConfirmed) {
      lines.push(checkPassed
        ? '확인 문제는 한 번에 통과 — 원리는 잡았어. 이제 손이 기억하게 만드는 게 다음이야.'
        : '확인 문제도 헷갈렸어 — 급하게 문제 더 풀지 말고, 이 원리 하나 확실히 잡는 게 먼저야.');
    }
    cardEl(title, lines.join('\n'), 'final');
    coachSays('오늘 여기까지. 다음에 같은 자리에서 안 틀리게, 앱에서 이어서 잡아줄게.');
    setActions([
      { label: '다른 문제도 올려보기', kind: 'primary', onPress: () => window.location.reload() },
    ]);
  }
```

(`cardEl`의 card-body가 `textContent`라 `\n`이 안 살면 `.card-body`에 `white-space: pre-line` CSS를 `web-proto/styles.css`에 추가: `.card .card-body { white-space: pre-line; }`)

- [ ] **Step 3: 커밋 없음** (Task 7과 묶음)

---

### Task 7: 웹 — 느낌 설문 + 자유입력 연결 + 구 flow 러너 제거

**Files:**
- Modify: `web-proto/app.js`

- [ ] **Step 1: 느낌 설문**

```js
  // 느낌 설문: "어디서 틀렸어?"(분석 숙제)가 아니라 "뭐가 걸렸어?"(경험 증언)만 묻는다.
  function showFeelingSurvey(methodId, promptText, withAnswerReadHint) {
    const options = SURVEY.optionsFor(methodId);
    if (withAnswerReadHint) {
      // B안: 마지막 보기를 힌트 버전으로 교체 (없으면 추가)
      const i = options.findIndex((o) => o.type === 'answer_read');
      if (i >= 0) options[i] = SURVEY.ANSWER_READ_HINT; else options.push(SURVEY.ANSWER_READ_HINT);
    }
    coachSays(promptText || '그럼 — 풀면서 느낌상 뭐가 제일 걸렸어?');
    const buttons = options.map((opt) => ({
      label: opt.text,
      onPress: () => {
        userSays(opt.text);
        showWeaknessCard({ methodId, mistakeType: opt.type, aiConfirmed: false });
      },
    }));
    buttons.push({
      label: '잘 모르겠어', kind: 'ghost',
      onPress: () => {
        userSays('잘 모르겠어');
        showWeaknessCard({ methodId, mistakeType: 'concept_gap', aiConfirmed: false });
      },
    });
    setActions(buttons);
  }
```

- [ ] **Step 2: 방법 확정 문들을 confirmMethod로 통일**

- `methodButton(id)`의 `startFlow(id)` → `confirmMethod(id)`
- `routeFromText`의 확신 분기: `startFlow(result.predictedMethodId)` → `confirmMethod(result.predictedMethodId)` (직전 coachSays는 유지)
- `showAllMethods`의 `startFlow('unknown')` → `showFeelingSurvey(null)` (방법 미상 일반형 설문)

- [ ] **Step 3: 구 flow 러너 제거**

`app.js`에서 `let draft = null;`, `startFlow()`, `renderCurrentNode()` 전체 삭제 (이제 아무도 호출 안 함). `flow-entry.ts`/`flow-bundle.js`는 그대로 둔다 — `methodOptions`·`diagnosisMethodRoutingCatalog`는 계속 쓴다.

- [ ] **Step 4: 브라우저 전 경로 육안 확인**

web-proto 열고 사진 업로드 → 단언 → 맞아 → 짚기 → 맞아 → 왜 → 쪽지시험 → 카드까지 걷기. 콘솔 에러 0 확인.

- [ ] **Step 5: 커밋 (Task 5·6·7 묶음)**

```bash
git add web-proto/app.js web-proto/styles.css
git commit -m "feat(web-proto): 오류 짚기 사다리 — 주머니·confirmMethod 단일 관문·쪽지시험·약점 카드 v2·느낌 설문"
```

---

### Task 8: 웹 — 경우 3 다시 찍기 유도

**Files:**
- Modify: `web-proto/app.js`

- [ ] **Step 1: offerRetake 구현**

```js
  // 갈래 3: 풀이 흔적 없음. (b)문제만 찍은 학생을 경우 1로 승격시키는 사다리.
  function offerRetake() {
    coachSays('사진에서 풀이 과정을 못 찾았어. 혹시 종이에 풀었으면, 풀이까지 나오게 다시 찍어줄래? 그러면 어디서 틀렸는지 내가 직접 짚어줄 수 있어.');
    coachSays('머리로 푼 거면 괜찮아 — 어떤 방법으로 풀었는지 짧게만 알려줘.');
    setActions([
      { label: '📷 풀이까지 나오게 다시 찍기', kind: 'primary', onPress: () => window.location.reload() },
      { label: '✏️ 직접 알려줄게', kind: 'ghost', onPress: () => askMethodByText('어떤 방법으로 풀었는지 짧게 알려줄래? 네 말 그대로 써도 돼.') },
    ]);
  }
```

(기존 갈래 3의 `askMethodByText('사진에서 풀이 과정을 못 찾았어...')` 직접 호출은 Step 2의 routeFromAnalysis 교체로 이미 offerRetake로 바뀌어 있음 — Task 5 Step 2 확인)

- [ ] **Step 2: 브라우저 확인**

풀이 없는 사진(문제만) 업로드 → 다시 찍기/직접 입력 두 버튼 확인 → 직접 입력 → 자유 입력 → 방법 판별 → 느낌 설문 → 카드.

- [ ] **Step 3: 커밋**

```bash
git add web-proto/app.js
git commit -m "feat(web-proto): 풀이 없는 사진에 다시 찍기 유도 — 경우 3을 경우 1로 승격시키는 사다리"
```

---

### Task 9: E2E — 설계도의 모든 문 열기 (검증 2겹)

**Files:** 없음 (검증만). 문턱을 임시로 바꿔 가지를 강제 재현한다.

- [ ] **Step 1: 강제 재현 체크리스트**

브라우저 콘솔에서 주머니를 조작해 각 가지 강제 진입 (`pocket`은 클로저 안이라, 재현은 실제 사진 + 아래 방법으로):

| 가지 | 재현 방법 | 기대 결과 |
|---|---|---|
| 경우1-1 (1번 적중) | 오답 사진 업로드 → 맞아 → 맞아 | 왜→쪽지시험→카드(증거 포함) |
| 경우1-2 (전부 거절) | 위에서 아니야→아니야 | 느낌 설문→카드 |
| 경우1-3 (2번 적중) | 1번 아니야→2번 맞아 | 2번 후보의 왜→시험→카드 |
| 경우1-5 (방법 뒤집힘) | 단언에서 아니야→다른 방법 선택 | 짚기 없이 느낌 설문→카드 |
| 경우1-6 (B안) | `ERROR_CONFIDENCE_MIN`을 일시적으로 `1.1`로 올리고 새로고침→업로드→맞아 | "과정에서는 못 찾았어" 멘트+힌트 설문 → **확인 후 0.5로 되돌리기** |
| 경우2 (추측 확인) | 흐릿하게 찍은 사진(확신 중간 유도) 또는 `HIGH_CONFIDENCE_THRESHOLD` 특성상 자연 발생 확인 | "~같아. 맞아?" → 맞아 → 짚기 진입 |
| 경우2 지하 (보기서 1등 선택) | 후보 카드에서 1등과 같은 방법 선택 | 짚기 진입 (주머니 부활) |
| 경우3 (풀이 없음) | 문제만 찍은 사진 | 다시 찍기/직접 입력 → 각각 확인 |
| 쪽지시험 오답 | 시험에서 일부러 틀린 보기 | 정답 안내 1회+카드에 "원리부터" 문구 |

- [ ] **Step 2: 콘솔 에러 0 확인 후 결과를 PROGRESS에 기록**

```bash
git add -A && git commit -m "test(web-proto): 오류 짚기 전 가지 E2E 확인" --allow-empty
```

- [ ] **Step 3: PR 생성**

```bash
git push -u origin feat/photo-flow-error-pointing
gh pr create --title "feat(photo-flow): 오류 짚기 — 물어보는 앱에서 짚어주는 앱으로" --body "$(cat <<'EOF'
## Summary
- analyzePhoto 원샷 확장: 오류 후보 2개 + 왜 + 쪽지시험 + 처방 + 자신감 (조교 규칙서 10개조)
- 웹 짚기 사다리: 단언/추측 확인 → 1·2번 짚기(투 스트라이크) → 느낌 설문 → 약점 카드 v2
- 실수 유형 6종 (방법 × 유형 × 증거), B안(못 찾은 날 솔직 고백), 경우 3 다시 찍기 유도

Spec: docs/superpowers/specs/2026-07-25-photo-flow-error-pointing-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

### Task 10: 검증 3겹 — 시험지 10장 채점 (기윤 주도, 머지·공개 게이트)

**Files:** 없음 (사람 검증)

- [ ] **Step 1: 기윤이 시험지 10장 준비**

손글씨 오답 사진 10장, 실수 유형을 심어서: calc_slip 3 / formula_recall 2 / concept_gap 2 / answer_read 2 / procedure_miss 1.

- [ ] **Step 2: 채점**

각 장을 web-proto에 올리고 기록: 1번 짚기 적중? / 1~2번 내 적중? / 인용(quote)이 실제 쓴 글씨와 일치? / 유형 도장 일치? / 톤 OK?

- [ ] **Step 3: 합격 판정**

- 1번 적중 ≥ 7/10, 1~2번 합산 ≥ 8/10 (미달 시 프롬프트 조정 후 재채점)
- **환각 인용 0건 — 1건이라도 나오면 공개 보류** (하드 게이트)
- 기윤 정성 판정: "다시다 목소리 맞다"

- [ ] **Step 4: 통과 시 PR 머지 + 종료 절차**

```bash
gh pr merge --merge
npm run log:commit
```
Notion "DASIDA 개발 기록"의 [사진 flow 오류 짚기] 페이지: 상태 → 구현완료, 구현완료일 → 머지일, Plan 필드에 이 문서 GitHub permalink.

---

## Self-Review 결과

- **Spec coverage**: §1 분류(Task 1·4) §2 원샷(Task 1~3) §3 사다리·경우 1~3(Task 5~8) §4 규칙서(Task 2) §5 설문(Task 4) §6 검증(Task 9~10) — 전부 매핑됨. 확장 지점(§7)은 구현 없음(의도).
- **Placeholder scan**: 코드 블록 전부 실물. 통과.
- **Type consistency**: `errorCandidates`/`errorConfidence`/`mistakeType`/`fix`/`checkPrompt`/`checkOptions`/`checkAnswerIndex` — 서버 스키마(Task 2), 정화(Task 1), 웹 사용부(Task 5~7) 명칭 일치 확인. `SURVEY.TYPES[...].fix`(통조림)와 `cand.fix`(AI 맞춤)는 카드에서 `fix || typeInfo.fix`로 합류. 통과.
- **주의**: 기존 analyze-photo-core 테스트 fixture에 새 필수 필드 2개 추가 필요 (Task 1 Step 4에 명시).

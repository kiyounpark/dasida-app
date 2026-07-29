import OpenAI from 'openai';

import type {
  DiagnosisExplainRequest,
  DiagnosisMethodDescriptor,
  DiagnosisMethodRequest,
  OpenAIDiagnosisExplainResult,
  OpenAIDiagnosisResult,
} from './types';

const DIAGNOSIS_RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
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
  required: ['predictedMethodId', 'confidence', 'candidateMethodIds', 'reason'],
} as const;

const DIAGNOSIS_EXPLAIN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    replyText: { type: 'string', minLength: 1, maxLength: 500 },
  },
  required: ['replyText'],
} as const;

const SYSTEM_PROMPT = [
  '당신은 한국어 수학 오답 풀이법 분류기입니다.',
  '학생의 자유 입력을 읽고 학생이 어떤 풀이 방법을 시도했는지만 분류하세요.',
  '정답 여부, 실수 유형, 약점 이름은 분류하지 마세요.',
  '반드시 허용된 풀이법 id 중 하나를 predictedMethodId로 반환하세요.',
  '근거가 약하면 predictedMethodId를 unknown으로 반환하세요.',
  'candidateMethodIds는 가능성이 높은 순서대로 1~4개만 반환하세요.',
  'reason은 내부 디버그용으로 짧고 건조하게 작성하세요.',
].join('\n');

const EXPLAIN_SYSTEM_PROMPT = [
  '당신은 한국어 수학 튜터입니다.',
  '학생이 이미 선택한 풀이 줄기 안에서 현재 단계 설명만 더 쉽게 다시 설명하세요.',
  '새로운 풀이 방법을 제안하지 마세요.',
  '약점 이름이나 진단명을 추론하지 마세요.',
  '정답이나 최종 값을 직접 알려주지 마세요.',
  '설명은 최대 4문장 또는 2개의 짧은 문단으로 끝내세요.',
  '학생이 바로 다음 버튼을 누를 수 있을 정도로 짧고 구체적으로 쓰세요.',
].join('\n');

function buildMethodContext(methods: DiagnosisMethodDescriptor[]) {
  return methods
    .map((method) => {
      const examples = method.exampleUtterances.slice(0, 2).join(' / ');

      return [
        `- id: ${method.id}`,
        `  이름: ${method.labelKo}`,
        `  설명: ${method.summary}`,
        `  예시: ${examples || '(없음)'}`,
      ].join('\n');
    })
    .join('\n');
}

function buildUserPrompt(body: DiagnosisMethodRequest) {
  return [
    `problemId: ${body.problemId}`,
    `학생 입력: ${body.rawText}`,
    `허용된 풀이법 id: ${body.allowedMethodIds.join(', ')}`,
    '',
    '허용된 풀이법 설명:',
    buildMethodContext(body.allowedMethods),
  ].join('\n');
}

function buildExplainUserPrompt(body: DiagnosisExplainRequest) {
  const optionLines =
    body.nodeOptions && body.nodeOptions.length > 0
      ? body.nodeOptions.map((option) => `- ${option}`).join('\n')
      : '(없음)';

  return [
    `problemId: ${body.problemId}`,
    `문제: ${body.problemQuestion}`,
    `풀이 줄기 id: ${body.methodId}`,
    `풀이 줄기 이름: ${body.methodLabelKo}`,
    `현재 노드 종류: ${body.nodeKind}`,
    `현재 노드 id: ${body.nodeId}`,
    `현재 노드 제목: ${body.nodeTitle}`,
    `현재 노드 본문: ${body.nodeBody ?? '(없음)'}`,
    `현재 노드 확인 문제: ${body.nodePrompt ?? '(없음)'}`,
    '현재 노드 선택지:',
    optionLines,
    `학생 질문: ${body.userQuestion}`,
  ].join('\n');
}

export async function requestDiagnosisMethodFromOpenAI({
  apiKey,
  model,
  body,
}: {
  apiKey: string;
  model: string;
  body: DiagnosisMethodRequest;
}): Promise<{ result: OpenAIDiagnosisResult; responseId: string; model: string }> {
  const client = new OpenAI({ apiKey });

  const response = await client.responses.create({
    model,
    instructions: SYSTEM_PROMPT,
    input: buildUserPrompt(body),
    text: {
      format: {
        type: 'json_schema',
        name: 'diagnosis_method_result',
        schema: DIAGNOSIS_RESULT_SCHEMA,
        strict: true,
      },
    },
  });

  const outputText = response.output_text?.trim();
  if (!outputText) {
    throw new Error('OpenAI response did not include output_text');
  }

  let parsedResult: OpenAIDiagnosisResult;
  try {
    parsedResult = JSON.parse(outputText) as OpenAIDiagnosisResult;
  } catch (error) {
    const preview = outputText.slice(0, 200);
    throw new Error(
      `Failed to parse OpenAI diagnosis JSON: ${
        error instanceof Error ? error.message : 'unknown error'
      }. output=${preview}`
    );
  }

  return {
    result: parsedResult,
    responseId: response.id,
    model,
  };
}

export async function requestDiagnosisExplanationFromOpenAI({
  apiKey,
  model,
  body,
}: {
  apiKey: string;
  model: string;
  body: DiagnosisExplainRequest;
}): Promise<{ result: OpenAIDiagnosisExplainResult; responseId: string; model: string }> {
  const client = new OpenAI({ apiKey });

  const response = await client.responses.create({
    model,
    instructions: EXPLAIN_SYSTEM_PROMPT,
    input: buildExplainUserPrompt(body),
    text: {
      format: {
        type: 'json_schema',
        name: 'diagnosis_explain_result',
        schema: DIAGNOSIS_EXPLAIN_SCHEMA,
        strict: true,
      },
    },
  });

  const outputText = response.output_text?.trim();
  if (!outputText) {
    throw new Error('OpenAI response did not include output_text');
  }

  let parsedResult: OpenAIDiagnosisExplainResult;
  try {
    parsedResult = JSON.parse(outputText) as OpenAIDiagnosisExplainResult;
  } catch (error) {
    const preview = outputText.slice(0, 200);
    throw new Error(
      `Failed to parse OpenAI explain JSON: ${
        error instanceof Error ? error.message : 'unknown error'
      }. output=${preview}`
    );
  }

  return {
    result: parsedResult,
    responseId: response.id,
    model,
  };
}

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

export async function requestReviewFeedbackFromOpenAI({
  apiKey,
  model,
  systemPrompt,
  messages,
}: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<{ replyText: string }> {
  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    max_tokens: 200,
  });

  const replyText = completion.choices[0]?.message?.content?.trim() ?? '';
  if (!replyText) {
    throw new Error('OpenAI response did not include content');
  }

  return { replyText };
}

// strict: true 규약 — properties의 모든 키가 required에도 있어야 한다. 어기면 실제 호출에서 400.
// 빌드로는 못 잡으니 테스트로 잠근다(analyze-photo-core.test.ts) → export.
export const PHOTO_ANALYSIS_SCHEMA = {
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
          retrySetup: { type: ['string', 'null'], maxLength: 300 },
          retryPrompt: { type: ['string', 'null'], maxLength: 200 },
          retryOptions: { type: ['array', 'null'], minItems: 3, maxItems: 3, items: { type: 'string', maxLength: 80 } },
          retryAnswerIndex: { type: ['integer', 'null'], minimum: 0, maximum: 2 },
        },
        required: [
          'quote', 'why', 'mistakeType', 'fix', 'checkPrompt', 'checkOptions', 'checkAnswerIndex',
          'retrySetup', 'retryPrompt', 'retryOptions', 'retryAnswerIndex',
        ],
      },
    },
    errorConfidence: { type: 'number', minimum: 0, maximum: 1 },
  },
  required: [
    'hasSolvingWork',
    'userAnswer',
    'transcription',
    'predictedMethodId',
    'confidence',
    'candidateMethodIds',
    'reason',
    'errorCandidates',
    'errorConfidence',
  ],
} as const;

const PHOTO_ANALYSIS_SYSTEM_PROMPT = [
  '당신은 한국 수능 수학 오답 사진 분석기입니다.',
  '사진에는 학생이 틀린 문제 하나와 학생의 손글씨 풀이가 담겨 있습니다.',
  '할 일: ① 학생이 적은 최종 답 읽기 ② 손글씨 풀이를 짧게 전사 ③ 어떤 풀이 방법을 시도했는지 분류 ④ 풀이에서 틀린 지점 찾기.',
  '학생이 쓴 각 줄이 맞는지는 속으로 반드시 검산하세요. 검산하지 않으면 계산 실수를 찾을 수 없습니다.',
  '단, 당신이 푼 풀이나 답을 학생에게 말하지 마세요. 해설도 하지 마세요. 인용은 반드시 학생이 실제로 쓴 줄에서만 하세요.',
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
  '3. 여러 군데 틀렸어도 후보 하나당 오류 하나만.',
  '   순서는 풀이 과정 → 최종 답. 풀이 과정에 틀린 곳이 있으면 그것을 1번 후보로 올리고,',
  '   최종 답 줄의 오류는 2번으로 미루세요.',
  '   풀이 과정이 전부 맞을 때만 최종 답의 오류를 1번으로 짚으세요.',
  '   (이유: 과정이 틀리면 답도 따라 틀리므로, 위쪽을 고쳐야 아래가 같이 고쳐집니다.)',
  '   줄마다 계산이 다 맞아도 끝난 게 아닙니다. 마지막에 나온 값이 문제가 물어본 바로 그 값인지,',
  '   그리고 그 종류의 값으로 나올 수 있는 값인지 확인하세요.',
  '   계산은 전부 맞는데 마지막 해석 한 줄만 틀린 오답이 흔합니다. 그럴 때는 멀쩡한 계산 줄을 짚지 말고 그 마지막 줄을 짚으세요.',
  '4. mistakeType은 주어진 6종 중 하나만.',
  '5. 오류를 못 찾았거나 애매하면 errorCandidates를 비우고 errorConfidence를 낮게 쓰세요. 억지로 짚는 것보다 훨씬 낫습니다.',
  '6. why와 fix에서 정답이나 최종 값을 알려주지 마세요. 틀린 이유까지만.',
  '7. 새로운 풀이 방법을 제안하지 마세요. 학생이 쓴 방법 안에서만 이야기하세요.',
  '8. checkPrompt는 방금 짚은 그 한 조각만 확인하는 새 미니 문제. 새 개념 금지.',
  '    보기는 checkOptions 배열에만 넣으세요. checkPrompt 안에 ①②③처럼 보기를 다시 적으면 화면에 두 번 나옵니다. 질문 문장만 쓰세요.',
  '9. why는 2~3문장 + 탓하지 않는 한 줄(예: "√ 붙은 나누기는 원래 헷갈리기 쉬운 자리야"). 반말 코치 톤, 다그침 금지.',
  '10. 아래 모범 예시는 모양(말투·깊이·구조) 참고용입니다. 예시 속 숫자·식·내용을 절대 가져다 쓰지 마세요. 모든 내용은 이 학생의 사진에서만 나와야 합니다.',
  '11. 재도전 문제(retry*): 학생이 틀린 그 단계만 다시 밟는 쌍둥이 문제.',
  '    retrySetup은 그 단계 직전까지 세팅된 새 상황(같은 원리, 숫자만 변경) 1~2문장,',
  '    retryPrompt는 "여기서 다음 한 수는?" 형태의 질문, 새 개념 금지. 보기는 retryOptions에만 넣고 질문 안에 다시 적지 마세요.',
  '    retryAnswerIndex가 가리키는 보기가 실제 정답인지 속으로 반드시 검산하세요.',
  '    checkPrompt(방금 짚은 조각 확인)와 달리 retry는 새 숫자로 적용을 확인한다.',
  '    12번 카드 4법과 정답 검산 중 하나라도 확신 못 하면 retry 필드 4개를 모두 null로 두세요.',
  '    틀린 재도전 하나가 빈 재도전 열 개보다 나쁩니다. 억지 생성 금지.',
  '12. [문제 카드 4법 — 쪽지시험(check*)과 재도전(retry*) 공통]',
  '    쪽지시험과 재도전은 독립된 카드입니다. 학생 화면에는 이 카드만 보이고, 원본 사진은 보이지 않습니다.',
  '    ① 필요한 식·값은 카드 안에 다 적으세요. "원래 식", "처음 적은 식", "다음 이차식"처럼',
  '       사진 속 내용을 가리키면 학생은 그것을 볼 방법이 없어 아무도 못 푸는 문제가 됩니다.',
  '    ② 오답 보기 2개는 명백히 틀려야 합니다. 만든 뒤 오답마다 "이게 왜 틀렸는지" 속으로 한 줄씩',
  '       답해보세요. 답할 수 없는 보기는 정답의 변형입니다 — 버리고 다시 만드세요.',
  '    ③ 보기는 정확히 3개, 한 보기에 한 표현만. 따옴표나 쉼표로 두 표현을 잇지 마세요.',
  '    ④ 질문과 보기의 형식을 맞추세요. 값을 물으면 보기도 값, 행동을 물으면 보기도 행동,',
  '       빠진 조각을 물으면 보기도 조각.',
  '',
  '[모범 예시 — 모양 참고용, 내용 복사 금지]',
  '문제: f(x) = x² − 10x + 29의 최솟값은?',
  '진단 질문 톤: "완전제곱식 풀이에서 어디가 가장 어려웠나요?"',
  '설명 톤: "더하고 뺀 수를 0으로 맞춰야 식이 유지됩니다. 또 마지막 상수항 계산에서 부호를 자주 놓칩니다."',
  '',
  '[❌/⭕ 대조 — 규칙 10의 시범]',
  '❌ 나쁜 why: "4를 더하고 빼는 원리가 헷갈렸구나" → 이 학생 문제에 없는 예시 내용이 새어 들어옴.',
  '⭕ 좋은 why: "√20을 2로 나눌 때 반으로 줄이는 대신 2를 곱했어. √가 붙은 나누기는 원래 헷갈리기 쉬운 자리야." → 모양은 예시, 내용은 학생 사진.',
  '',
  '[❌/⭕ 대조 — 규칙 12의 시범. ❌는 전부 실제로 학생에게 나갔던 불량품]',
  '① 카드 밖 지칭',
  '❌ "다음 이차식을 올바르게 인수분해한 것은?" → 카드에 그 이차식이 없어 아무도 못 푼다.',
  '⭕ "x²−4x+3을 올바르게 인수분해한 것은?" → 필요한 식이 질문 안에 있다.',
  '② 정답이 둘',
  '❌ 정답 4x(x−2)=0 옆에 오답 x(4x−8)=0 → 양변을 2로 나눈 같은 식이라 근이 똑같다.',
  '⭕ 오답은 근이 달라지게: 4x(x+2)=0',
  '③ 보기 오염',
  "❌ 보기 하나가 ar^4','ar^5 → 따옴표·쉼표 찌꺼기로 두 표현이 붙어 보기가 두 개로 보인다.",
  '⭕ 한 보기에 하나만: ar^4',
  '④ 형식 불일치',
  '❌ 질문은 "빠진 부분"을 묻는데 보기는 완성된 공식 전체 → 묻는 것과 고르는 것이 다르다.',
  '⭕ 조각을 물으면 보기도 조각: "÷2", "×n"',
].join('\n');

export async function requestPhotoAnalysisFromOpenAI({
  apiKey,
  model,
  reasoningEffort,
  imageDataUrl,
  methodContextText,
}: {
  apiKey: string;
  model: string;
  reasoningEffort?: string;
  imageDataUrl: string;
  methodContextText: string;
}): Promise<{ result: unknown; responseId: string; model: string }> {
  // SDK 기본 타임아웃(10분)이 함수 타임아웃(60초)보다 길어 hang 시 60초 전체를 태움 → 45초로 제한
  const client = new OpenAI({ apiKey, timeout: 45_000, maxRetries: 1 });

  const response = await client.responses.create({
    model,
    // 추론 모델만 reasoning을 받는다 — 비추론 모델(gpt-4.1 등)로 되돌릴 때 400 나지 않게 빈 값이면 생략.
    // 실측: 인수분해 오류는 생각을 켜야 잡힌다 (medium 3/3, off 1/3)
    ...(reasoningEffort ? { reasoning: { effort: reasoningEffort as 'low' | 'medium' | 'high' } } : {}),
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

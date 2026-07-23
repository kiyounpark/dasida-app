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
  // SDK 기본 타임아웃(10분)이 함수 타임아웃(60초)보다 길어 hang 시 60초 전체를 태움 → 45초로 제한
  const client = new OpenAI({ apiKey, timeout: 45_000, maxRetries: 1 });

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

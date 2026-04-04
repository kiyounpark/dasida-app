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

export async function requestReviewFeedbackFromOpenAI({
  apiKey,
  model,
  systemPrompt,
  userContent,
}: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userContent: string;
}): Promise<{ replyText: string }> {
  // review-feedback은 자유 텍스트 응답이므로 responses.create(JSON schema)가 아닌
  // chat.completions.create를 사용한다. 코칭 피드백은 구조화된 JSON이 불필요하기 때문.
  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    max_tokens: 200,
  });

  const replyText = completion.choices[0]?.message?.content?.trim() ?? '';
  if (!replyText) {
    throw new Error('OpenAI response did not include content');
  }

  return { replyText };
}

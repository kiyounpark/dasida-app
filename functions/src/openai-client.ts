import OpenAI from 'openai';

import type {
  DiagnosisMethodDescriptor,
  DiagnosisMethodRequest,
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

const SYSTEM_PROMPT = [
  '당신은 한국어 수학 오답 풀이법 분류기입니다.',
  '학생의 자유 입력을 읽고 학생이 어떤 풀이 방법을 시도했는지만 분류하세요.',
  '정답 여부, 실수 유형, 약점 이름은 분류하지 마세요.',
  '반드시 허용된 풀이법 id 중 하나를 predictedMethodId로 반환하세요.',
  '근거가 약하면 predictedMethodId를 unknown으로 반환하세요.',
  'candidateMethodIds는 가능성이 높은 순서대로 1~4개만 반환하세요.',
  'reason은 내부 디버그용으로 짧고 건조하게 작성하세요.',
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

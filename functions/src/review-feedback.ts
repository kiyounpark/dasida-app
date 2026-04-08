// functions/src/review-feedback.ts
import * as logger from 'firebase-functions/logger';
import { defineSecret, defineString } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { requestReviewFeedbackFromOpenAI } from './openai-client';

const openAiApiKey = defineSecret('OPENAI_API_KEY');
const openAiModel = defineString('OPENAI_MODEL', { default: 'gpt-4.1' });

const ReviewFeedbackRequestSchema = z.object({
  weaknessId: z.string().min(1).max(60),
  stepTitle: z.string().min(1).max(100),
  stepBody: z.string().min(1).max(400),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(500),
      }),
    )
    .min(1)
    .max(10),
});

const SYSTEM_PROMPT = `당신은 한국 수학 학습을 돕는 AI 코치입니다.
학생이 수학 개념 복습 단계에서 자신의 이해를 표현했습니다.

학생의 답변을 다음 기준으로 판단하세요:

1. 수학 개념과 관련된 실질적인 내용이 있는 경우:
   "좋은 방향이에요! [핵심 포인트]도 더하면 완벽해요" 형식으로 1-2문장 피드백을 주세요.

2. "그러게요", "네", "맞아요", "모르겠어요" 처럼 수학 내용이 없는 짧은 표현인 경우:
   칭찬하지 말고, 개념을 자신의 말로 설명해보도록 구체적으로 유도해 주세요.
   예시: "이 개념을 자신의 말로 한 번 설명해볼 수 있을까요? 예를 들어, [단계 핵심어]가 왜 중요한지 써보면 좋아요."

모호한 답변에 "좋은 방향이에요!"라고 칭찬하지 마세요.
오직 현재 단계의 개념만 다루세요. 다른 단계 내용이나 다음 단계 개념을 먼저 언급하지 마세요.
2-3문장 이내로 짧게 답하세요.
한국어로 답하세요.`;

export const reviewFeedback = onRequest(
  {
    region: 'asia-northeast3',
    timeoutSeconds: 20,
    cors: true,
    invoker: 'public',
    secrets: [openAiApiKey],
  },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const parsed = ReviewFeedbackRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
      return;
    }

    const { stepTitle, stepBody, messages } = parsed.data;

    // 첫 번째 user 메시지에 단계 컨텍스트를 prepend
    const stepContext = `단계: ${stepTitle}\n설명: ${stepBody}\n\n`;
    const enrichedMessages = messages.map((m, i) =>
      i === 0 && m.role === 'user' ? { ...m, content: `${stepContext}${m.content}` } : m,
    );

    try {
      const { replyText } = await requestReviewFeedbackFromOpenAI({
        apiKey: openAiApiKey.value(),
        model: openAiModel.value(),
        systemPrompt: SYSTEM_PROMPT,
        messages: enrichedMessages,
      });

      response.status(200).json({ replyText });
    } catch (error) {
      logger.error('reviewFeedback failed', error);
      response.status(500).json({ error: 'Failed to generate feedback' });
    }
  },
);

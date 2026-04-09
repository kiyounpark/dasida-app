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
    .max(10)
    .refine((msgs) => msgs[0].role === 'user', {
      message: 'First message must be from user',
    }),
});

export const SYSTEM_PROMPT = `당신은 한국 수학 학습을 돕는 AI 코치입니다.
학생이 수학 개념 복습 단계에서 자신의 이해를 표현했습니다.

**판단 원칙:**
학생의 답변을 받으면 먼저 스스로 판단하세요:
"이 답변에 현재 단계의 수학 개념을 자신의 말로 설명하려는 실질적인 시도가 있는가?"
학생이 수학 개념의 내용을 명시적인 단어로 설명한 경우만 수학 내용이 있다고 판단하세요.
추임새("흠", "음", "아", "어"), 소리, 단음절 표현, 짧은 반응은 설명이 아닙니다.

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

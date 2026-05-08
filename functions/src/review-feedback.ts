// functions/src/review-feedback.ts
import * as logger from 'firebase-functions/logger';
import { defineSecret, defineString } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { requestReviewFeedbackFromOpenAI } from './openai-client';

const openAiApiKey = defineSecret('OPENAI_API_KEY');
const openAiModel = defineString('OPENAI_MODEL', { default: 'gpt-4.1' });

export const ReviewFeedbackRequestSchema = z.object({
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

export const SYSTEM_PROMPT = SYSTEM_PROMPT_BASE; // 기존 테스트 호환용

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

    const { stepTitle, stepBody, messages, selectedChoiceText, selectedChoiceCorrect } = parsed.data;

    const mode = decideMode(messages);
    const systemPrompt = buildSystemPrompt(
      mode,
      selectedChoiceText !== undefined && selectedChoiceCorrect !== undefined
        ? { text: selectedChoiceText, correct: selectedChoiceCorrect }
        : undefined,
    );

    // 첫 번째 user 메시지에 단계 컨텍스트를 prepend
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
      response.status(200).json({ replyText });
    } catch (error) {
      logger.error('reviewFeedback failed', error);
      response.status(500).json({ error: 'Failed to generate feedback' });
    }
  },
);

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
  selectedChoiceText: z.string().min(1).max(200).transform((s) => s.replace(/[\n\r]/g, ' ')).optional(),
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
다음 3비트 구조로 작성하세요:
1. **인정**: 학생이 잘 잡은 부분 한 가지를 짧게 인정 (1문장).
2. **핵심**: 정답의 핵심을 한두 문장으로 분명히 정리 (1-2문장).
3. **클로징**: 학생이 마무리할 수 있도록 따뜻한 한 줄로 닫음 (1문장).
   예시: "이 정도면 충분해요", "여기까지면 다음으로 가도 좋아요", "잘 따라왔어요, 한 번 더 풀 때 자연스럽게 떠오를 거예요".

전체 3-4문장 이내. 힌트로 끝내지 말고 반드시 클로징 한 줄로 닫으세요.`;

export const SYSTEM_PROMPT = SYSTEM_PROMPT_BASE; // 기존 테스트 호환용

type Mode = 'explore' | 'close';

export function decideMode(messages: { role: 'user' | 'assistant' }[]): Mode {
  const assistantCount = messages.filter((m) => m.role === 'assistant').length;
  return assistantCount === 0 ? 'explore' : 'close';
}

export function buildSystemPrompt(
  mode: Mode,
  stepContext: { title: string; body: string },
  selectedChoice?: { text: string; correct: boolean },
): string {
  const modeSuffix = mode === 'explore' ? EXPLORE_MODE_SUFFIX : CLOSE_MODE_SUFFIX;
  const stepSection = `\n\n──────────────────────────────\n**현재 단계 정보 (배경 — 학생이 직접 쓴 글이 아님):**\n- 단계 제목: ${stepContext.title}\n- 정답 절차: ${stepContext.body}\n\n⚠️ 이 정답 절차는 학생이 화면에서 보고 있지만, 학생이 자기 말로 설명했는지 평가해야 할 대상입니다. 학생이 이 절차를 한 말처럼 그대로 따라 쓰거나 칭찬하지 마세요.`;
  const choiceContext = selectedChoice
    ? `\n\n**선택지 컨텍스트:**\n학생은 먼저 다음 선택지를 골랐습니다: "${selectedChoice.text}" (정답 여부: ${selectedChoice.correct ? '정답' : '오답'}). 이 맥락을 고려해 응답하세요.`
    : '';
  const inputRule = `\n\n──────────────────────────────\n**학생이 쓴 글 다루기 (중요):**\n사용자가 보낸 메시지의 내용만 학생이 실제로 쓴 글입니다. 시스템 프롬프트의 "정답 절차"를 학생이 쓴 글처럼 다루지 마세요. 학생이 쓴 글에 수학 개념 설명이 없으면, 그 글을 짧게 짚고 다시 설명해보도록 유도하세요.`;
  return SYSTEM_PROMPT_BASE + modeSuffix + stepSection + choiceContext + inputRule;
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
      { title: stepTitle, body: stepBody },
      selectedChoiceText !== undefined && selectedChoiceCorrect !== undefined
        ? { text: selectedChoiceText, correct: selectedChoiceCorrect }
        : undefined,
    );

    // 단계 정보는 시스템 프롬프트로 이동했으므로 user 메시지는 그대로 전달.
    // (학생 발화와 단계 정보를 섞지 않아 AI가 환각하는 것을 방지)
    const enrichedMessages = messages;

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

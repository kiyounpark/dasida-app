// features/quiz/review-feedback.ts
import { reviewFeedbackUrl, reviewFeedbackTimeoutMs } from '@/constants/env';

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type ReviewFeedbackInput = {
  weaknessId: string;
  stepTitle: string;
  stepBody: string;
  messages: ChatMessage[];
};

export type ReviewFeedbackResult = {
  replyText: string;
};

export async function requestReviewFeedback(
  input: ReviewFeedbackInput,
): Promise<ReviewFeedbackResult> {
  if (!reviewFeedbackUrl) {
    throw new Error('Review feedback endpoint is not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), reviewFeedbackTimeoutMs);

  try {
    const response = await fetch(reviewFeedbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg =
        (payload && typeof payload.error === 'string' && payload.error) ||
        `Review feedback request failed (HTTP ${response.status})`;
      throw new Error(errorMsg);
    }

    if (!payload || typeof payload.replyText !== 'string' || !payload.replyText.trim()) {
      throw new Error('Review feedback returned empty or invalid response');
    }

    return { replyText: payload.replyText.trim() };
  } finally {
    clearTimeout(timeoutId);
  }
}

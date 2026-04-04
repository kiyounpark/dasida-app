// features/quiz/review-feedback.ts
import { reviewFeedbackUrl, reviewFeedbackTimeoutMs } from '@/constants/env';

export type ReviewFeedbackInput = {
  weaknessId: string;
  stepTitle: string;
  stepBody: string;
  selectedChoiceText: string | null;
  userText: string | null;
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

  if (!input.selectedChoiceText && !input.userText) {
    throw new Error('No user input to send for feedback');
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

    if (
      !response.ok ||
      !payload ||
      typeof payload.replyText !== 'string' ||
      !payload.replyText.trim()
    ) {
      throw new Error(
        (payload && typeof payload.error === 'string' && payload.error) ||
          'Failed to fetch review feedback',
      );
    }

    return { replyText: payload.replyText.trim() };
  } finally {
    clearTimeout(timeoutId);
  }
}

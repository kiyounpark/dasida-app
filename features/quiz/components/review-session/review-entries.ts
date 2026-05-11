import type { RemedialNode } from '@/data/review-remedial-flows';

export type ReviewEntry =
  | { kind: 'step-card'; stepIndex: number }
  | { kind: 'input-area'; stepIndex: number; interactive: boolean }
  | { kind: 'choice-bubble'; choiceIndex: number; text: string; correct: boolean }
  | { kind: 'feedback-banner'; correct: boolean; text: string }
  | { kind: 'user-bubble'; text: string }
  | { kind: 'ai-bubble'; text: string }
  | { kind: 'ai-typing' }
  | { kind: 'fallback-input'; turn: 1 | 2; interactive: boolean }
  | { kind: 'remedial-node'; node: RemedialNode; interactive: boolean }
  | { kind: 'done-cta'; label: string };

export function createStepCardEntry(stepIndex: number): Extract<ReviewEntry, { kind: 'step-card' }> {
  return { kind: 'step-card', stepIndex };
}

export function createInputAreaEntry(stepIndex: number): Extract<ReviewEntry, { kind: 'input-area' }> {
  return { kind: 'input-area', stepIndex, interactive: true };
}

export function createChoiceBubbleEntry(
  choiceIndex: number,
  text: string,
  correct: boolean,
): Extract<ReviewEntry, { kind: 'choice-bubble' }> {
  return { kind: 'choice-bubble', choiceIndex, text, correct };
}

export function createFeedbackBannerEntry(
  correct: boolean,
  text: string,
): Extract<ReviewEntry, { kind: 'feedback-banner' }> {
  return { kind: 'feedback-banner', correct, text };
}

export function createUserBubbleEntry(text: string): Extract<ReviewEntry, { kind: 'user-bubble' }> {
  return { kind: 'user-bubble', text };
}

export function createAiBubbleEntry(text: string): Extract<ReviewEntry, { kind: 'ai-bubble' }> {
  return { kind: 'ai-bubble', text };
}

export function createAiTypingEntry(): Extract<ReviewEntry, { kind: 'ai-typing' }> {
  return { kind: 'ai-typing' };
}

export function createFallbackInputEntry(turn: 1 | 2): Extract<ReviewEntry, { kind: 'fallback-input' }> {
  return { kind: 'fallback-input', turn, interactive: true };
}

export function createRemedialNodeEntry(node: RemedialNode): Extract<ReviewEntry, { kind: 'remedial-node' }> {
  return { kind: 'remedial-node', node, interactive: true };
}

export function createDoneCtaEntry(label: string): Extract<ReviewEntry, { kind: 'done-cta' }> {
  return { kind: 'done-cta', label };
}

type Lockable = Extract<ReviewEntry, { interactive: boolean }>;

export function lockAllEntries(entries: readonly ReviewEntry[]): ReviewEntry[] {
  return entries.map((e) => {
    if ('interactive' in e) {
      return { ...e, interactive: false } as Lockable;
    }
    return e;
  });
}

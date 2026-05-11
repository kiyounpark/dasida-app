import { useCallback, useState } from 'react';
import {
  createInputAreaEntry,
  createStepCardEntry,
  createAiBubbleEntry,
  type ReviewEntry,
} from '@/features/quiz/components/review-session/review-entries';

export function useReviewEntries(initialStepIndex: number) {
  const [entries, setEntries] = useState<ReviewEntry[]>(() => [
    createStepCardEntry(initialStepIndex),
    createInputAreaEntry(initialStepIndex),
  ]);

  const appendEntries = useCallback((next: ReviewEntry[]) => {
    setEntries((prev) => [...prev, ...next]);
  }, []);

  const resetForStep = useCallback((stepIndex: number) => {
    setEntries([createStepCardEntry(stepIndex), createInputAreaEntry(stepIndex)]);
  }, []);

  const lockInputArea = useCallback(() => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.kind === 'input-area' || e.kind === 'fallback-input') {
          return { ...e, interactive: false };
        }
        return e;
      }),
    );
  }, []);

  const lockRemedialNodes = useCallback(() => {
    setEntries((prev) =>
      prev.map((e) => (e.kind === 'remedial-node' ? { ...e, interactive: false } : e)),
    );
  }, []);

  const replaceTypingWithBubble = useCallback((text: string) => {
    setEntries((prev) => {
      const lastIdx = prev.length - 1;
      if (lastIdx >= 0 && prev[lastIdx].kind === 'ai-typing') {
        const next = prev.slice(0, lastIdx);
        next.push(createAiBubbleEntry(text));
        return next;
      }
      return [...prev, createAiBubbleEntry(text)];
    });
  }, []);

  const removeLastTyping = useCallback(() => {
    setEntries((prev) => {
      const lastIdx = prev.length - 1;
      if (lastIdx >= 0 && prev[lastIdx].kind === 'ai-typing') {
        return prev.slice(0, lastIdx);
      }
      return prev;
    });
  }, []);

  return {
    entries,
    appendEntries,
    resetForStep,
    lockInputArea,
    lockRemedialNodes,
    replaceTypingWithBubble,
    removeLastTyping,
  };
}

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

  // 가장 최근(=끝에서 가까운) ai-typing 한 개를 제거한다.
  // 라우터 분기로 typing 뒤에 다른 entry가 끼어들 가능성이 있어 마지막 인덱스 고정 대신
  // 끝에서부터 스캔한다.
  const removeLastTyping = useCallback(() => {
    setEntries((prev) => {
      for (let i = prev.length - 1; i >= 0; i -= 1) {
        if (prev[i].kind === 'ai-typing') {
          const next = prev.slice();
          next.splice(i, 1);
          return next;
        }
      }
      return prev;
    });
  }, []);

  // 가장 최근(=마지막) input-area 또는 fallback-input 한 개를 다시 활성화한다.
  // 네트워크 실패 후 재시도 경로를 열어주기 위한 헬퍼.
  const unlockLatestInput = useCallback(() => {
    setEntries((prev) => {
      for (let i = prev.length - 1; i >= 0; i -= 1) {
        const e = prev[i];
        if (e.kind === 'input-area' || e.kind === 'fallback-input') {
          const next = prev.slice();
          next[i] = { ...e, interactive: true };
          return next;
        }
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
    unlockLatestInput,
  };
}

import { useEffect, useState } from 'react';

import { useCurrentLearner } from '@/features/learner/provider';
import {
  loadScratchpad,
  type Stroke,
} from '@/features/quiz/exam/storage/scratchpad-strokes-store';

export type UseProblemStrokesResult = {
  loaded: boolean;
  strokes: Stroke[];
  hasStrokes: boolean;
};

export function useProblemStrokes(
  examId: string,
  problemNumber: number,
): UseProblemStrokesResult {
  const { profile } = useCurrentLearner();
  const accountKey = profile?.accountKey ?? null;

  const [loaded, setLoaded] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);

  useEffect(() => {
    if (!accountKey || !examId || !problemNumber) {
      setStrokes([]);
      setLoaded(true);
      return;
    }
    let cancelled = false;
    setLoaded(false);
    void loadScratchpad(accountKey, examId, problemNumber).then((data) => {
      if (cancelled) return;
      setStrokes(data?.strokes ?? []);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [accountKey, examId, problemNumber]);

  return {
    loaded,
    strokes,
    hasStrokes: loaded && strokes.length > 0,
  };
}

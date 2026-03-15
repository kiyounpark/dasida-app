import { useEffect, useRef, useState } from 'react';
import type {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';

import type { DiagnosisPage } from '@/features/quiz/hooks/diagnostic-screen-helpers';

type UseDiagnosisPagerParams = {
  diagnosisPageWidth: number;
  diagnosisPages: DiagnosisPage[];
  isDiagnosing: boolean;
};

export function useDiagnosisPager({
  diagnosisPageWidth,
  diagnosisPages,
  isDiagnosing,
}: UseDiagnosisPagerParams) {
  const diagnosisPagerRef = useRef<FlatList<DiagnosisPage> | null>(null);
  const diagnosisScrollOffsetsRef = useRef<Record<number, number>>({});
  const diagnosisHasInteractedRef = useRef<Record<number, boolean>>({});
  const diagnosisPendingAutoScrollRef = useRef<Record<number, boolean>>({});
  const diagnosisPendingRestoreRef = useRef<Record<number, boolean>>({});
  const activeDiagnosisAnswerIndexRef = useRef<number | null>(null);
  const [activeDiagnosisPageIndex, setActiveDiagnosisPageIndex] = useState(0);

  useEffect(() => {
    if (!isDiagnosing) {
      setActiveDiagnosisPageIndex(0);
      diagnosisScrollOffsetsRef.current = {};
      diagnosisHasInteractedRef.current = {};
      diagnosisPendingAutoScrollRef.current = {};
      diagnosisPendingRestoreRef.current = {};
      activeDiagnosisAnswerIndexRef.current = null;
      return;
    }

    setActiveDiagnosisPageIndex((prev) =>
      Math.min(prev, Math.max(diagnosisPages.length - 1, 0)),
    );
  }, [diagnosisPages.length, isDiagnosing]);

  useEffect(() => {
    if (!isDiagnosing || diagnosisPages.length === 0) {
      return;
    }

    const targetIndex = Math.min(activeDiagnosisPageIndex, diagnosisPages.length - 1);
    if (targetIndex < 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      diagnosisPagerRef.current?.scrollToIndex({
        animated: false,
        index: targetIndex,
      });
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [activeDiagnosisPageIndex, diagnosisPageWidth, diagnosisPages.length, isDiagnosing]);

  useEffect(() => {
    activeDiagnosisAnswerIndexRef.current =
      diagnosisPages[activeDiagnosisPageIndex]?.answerIndex ?? null;
  }, [activeDiagnosisPageIndex, diagnosisPages]);

  const hasStoredDiagnosisOffset = (answerIndex: number) =>
    Object.prototype.hasOwnProperty.call(diagnosisScrollOffsetsRef.current, answerIndex);

  const shouldRestoreDiagnosisOffset = (answerIndex: number) =>
    diagnosisHasInteractedRef.current[answerIndex] === true &&
    hasStoredDiagnosisOffset(answerIndex);

  const setDiagnosisInteracted = (answerIndex: number) => {
    diagnosisHasInteractedRef.current[answerIndex] = true;
  };

  const requestDiagnosisAutoScroll = (answerIndex: number) => {
    if (activeDiagnosisAnswerIndexRef.current !== answerIndex) {
      return;
    }

    diagnosisPendingAutoScrollRef.current[answerIndex] = true;
  };

  const requestDiagnosisRestore = (answerIndex: number) => {
    if (shouldRestoreDiagnosisOffset(answerIndex)) {
      diagnosisPendingRestoreRef.current[answerIndex] = true;
      return;
    }

    delete diagnosisPendingRestoreRef.current[answerIndex];
  };

  const scrollToDiagnosisPage = (pageIndex: number, animated = true) => {
    if (pageIndex < 0 || pageIndex >= diagnosisPages.length) {
      return;
    }

    const targetAnswerIndex = diagnosisPages[pageIndex]?.answerIndex;
    if (targetAnswerIndex !== undefined) {
      requestDiagnosisRestore(targetAnswerIndex);
    }

    setActiveDiagnosisPageIndex(pageIndex);
    diagnosisPagerRef.current?.scrollToIndex({
      animated,
      index: pageIndex,
    });
  };

  const handleDiagnosisMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const nextPageIndex = Math.round(event.nativeEvent.contentOffset.x / diagnosisPageWidth);
    if (nextPageIndex !== activeDiagnosisPageIndex) {
      const targetAnswerIndex = diagnosisPages[nextPageIndex]?.answerIndex;
      if (targetAnswerIndex !== undefined) {
        requestDiagnosisRestore(targetAnswerIndex);
      }
      setActiveDiagnosisPageIndex(nextPageIndex);
    }
  };

  const handleDiagnosisScrollOffsetChange = (answerIndex: number, offsetY: number) => {
    diagnosisScrollOffsetsRef.current[answerIndex] = Math.max(offsetY, 0);
  };

  const handleDiagnosisAutoScrollHandled = (answerIndex: number) => {
    delete diagnosisPendingAutoScrollRef.current[answerIndex];
  };

  const handleDiagnosisRestoreHandled = (answerIndex: number) => {
    delete diagnosisPendingRestoreRef.current[answerIndex];
  };

  return {
    activeDiagnosisPageIndex,
    diagnosisPagerRef,
    diagnosisPendingAutoScrollRef,
    diagnosisPendingRestoreRef,
    diagnosisScrollOffsetsRef,
    handleDiagnosisAutoScrollHandled,
    handleDiagnosisMomentumEnd,
    handleDiagnosisRestoreHandled,
    handleDiagnosisScrollOffsetChange,
    hasStoredDiagnosisOffset,
    requestDiagnosisAutoScroll,
    requestDiagnosisRestore,
    scrollToDiagnosisPage,
    setActiveDiagnosisPageIndex,
    setDiagnosisInteracted,
  };
}

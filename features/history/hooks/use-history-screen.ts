import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { buildHistoryInsights } from '@/features/history/history-insights';
import { useCurrentLearner } from '@/features/learner/provider';
import type { LearningAttempt } from '@/features/learning/types';
import {
  computeAnalysisInProgressState,
  type AnalysisInProgressState,
  type LatestExamAttemptSummary,
} from '@/features/quiz/exam/exam-analysis-in-progress';
import { getDiagnosisProgress } from '@/features/quiz/exam/exam-diagnosis-progress';
import { getLatestExamAttempt } from '@/features/quiz/exam/latest-exam-attempt-store';
import { useExamSession } from '@/features/quiz/exam/exam-session';

export type UseHistoryScreenResult = ReturnType<typeof useHistoryScreen>;

export function useHistoryScreen() {
  const { isReady, refresh, loadRecentAttempts, summary, session } = useCurrentLearner();
  const { hydrateResult } = useExamSession();
  const [recentExamAttempts, setRecentExamAttempts] = useState<LearningAttempt[]>([]);
  const [isLoadingAttempts, setIsLoadingAttempts] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [latestAttempt, setLatestAttempt] = useState<LatestExamAttemptSummary | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisInProgressState>({ isInProgress: false });
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadAttempts = useCallback(async () => {
    if (!isReady || !summary?.accountKey) {
      if (!isMountedRef.current) return;
      setRecentExamAttempts([]);
      setIsLoadingAttempts(false);
      return;
    }

    setIsLoadingAttempts(true);
    try {
      const attempts = await loadRecentAttempts({
        source: 'featured-exam',
        limit: 5,
      });
      if (!isMountedRef.current) return;
      setRecentExamAttempts(attempts);
    } catch {
      if (!isMountedRef.current) return;
      setRecentExamAttempts([]);
    } finally {
      if (isMountedRef.current) setIsLoadingAttempts(false);
    }
  }, [isReady, loadRecentAttempts, summary?.accountKey]);

  useEffect(() => {
    void loadAttempts();
  }, [loadAttempts, summary?.updatedAt]);

  const isFirstFocusRef = useRef(true);
  const lastFocusRefreshAtRef = useRef(0);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        return;
      }
      const now = Date.now();
      if (now - lastFocusRefreshAtRef.current < 5_000) return;
      lastFocusRefreshAtRef.current = now;
      void refresh();
      void loadAttempts();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.accountKey]),
  );

  useFocusEffect(
    useCallback(() => {
      const accountKey = session?.accountKey;
      let cancelled = false;
      void (async () => {
        if (!accountKey) {
          setLatestAttempt(null);
          setAnalysisState({ isInProgress: false });
          return;
        }
        const attempt = await getLatestExamAttempt(accountKey);
        if (cancelled) return;
        setLatestAttempt(attempt);
        if (!attempt) {
          setAnalysisState({ isInProgress: false });
          return;
        }
        const diagnosed = await getDiagnosisProgress({
          examId: attempt.examId,
          attemptId: attempt.attemptId,
          attemptDateISO: attempt.attemptDateISO,
        });
        if (cancelled) return;
        setAnalysisState(
          computeAnalysisInProgressState({ latestAttempt: attempt, diagnosedProblems: diagnosed }),
        );
      })();
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.accountKey]),
  );

  const insights = useMemo(() => {
    if (!summary) return null;
    return buildHistoryInsights({
      summary,
      recentExamAttempts,
      latestAttemptId: latestAttempt?.attemptId ?? null,
      analysisState,
    });
  }, [summary, recentExamAttempts, latestAttempt?.attemptId, analysisState]);

  async function onRefresh() {
    setIsRefreshing(true);
    try {
      await refresh();
      await loadAttempts();
    } finally {
      setIsRefreshing(false);
    }
  }

  function onPrimaryAction() {
    if (!insights) return;

    if (insights.hero.ctaKind === 'resume_analysis') {
      if (!latestAttempt || !latestAttempt.result) return;
      const startIndex = analysisState.isInProgress ? analysisState.diagnosedNotes.length : 0;
      hydrateResult(latestAttempt.result);
      router.push({
        pathname: '/quiz/exam/diagnosis-session',
        params: {
          examId: latestAttempt.examId,
          wrongProblemNumbers: JSON.stringify(latestAttempt.wrongProblemNumbers),
          startIndex: String(startIndex),
          totalNotes: String(latestAttempt.wrongProblemNumbers.length),
          diagnosedCountBefore: String(startIndex),
        },
      });
      return;
    }
  }

  function onPressEmptyStateCta() {
    router.push('/(tabs)/exam');
  }

  return {
    insights,
    isLoadingAttempts,
    isReady,
    isRefreshing,
    onPrimaryAction,
    onPressEmptyStateCta,
    onRefresh,
  };
}

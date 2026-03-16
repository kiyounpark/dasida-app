import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { buildHistoryInsights } from '@/features/history/history-insights';
import { useCurrentLearner } from '@/features/learner/provider';
import { useQuizSession } from '@/features/quiz/session';
import type { LearningAttempt } from '@/features/learning/types';

export type UseHistoryScreenResult = ReturnType<typeof useHistoryScreen>;

function formatErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '최근 진단 흐름을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';
}

export function useHistoryScreen() {
  const { isReady, refresh, loadRecentAttempts, summary } = useCurrentLearner();
  const { resetSession } = useQuizSession();
  const [recentDiagnosticAttempts, setRecentDiagnosticAttempts] = useState<LearningAttempt[]>([]);
  const [attemptsErrorMessage, setAttemptsErrorMessage] = useState<string | null>(null);
  const [isLoadingAttempts, setIsLoadingAttempts] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadAttempts = useCallback(async () => {
    if (!isReady || !summary?.accountKey) {
      if (!isMountedRef.current) {
        return;
      }

      setRecentDiagnosticAttempts([]);
      setAttemptsErrorMessage(null);
      setIsLoadingAttempts(false);
      return;
    }

    setIsLoadingAttempts(true);

    try {
      const attempts = await loadRecentAttempts({
        source: 'diagnostic',
        limit: 5,
      });

      if (!isMountedRef.current) {
        return;
      }

      setRecentDiagnosticAttempts(attempts);
      setAttemptsErrorMessage(null);
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      setRecentDiagnosticAttempts([]);
      setAttemptsErrorMessage(formatErrorMessage(error));
    } finally {
      if (isMountedRef.current) {
        setIsLoadingAttempts(false);
      }
    }
  }, [isReady, loadRecentAttempts, summary?.accountKey]);

  useEffect(() => {
    void loadAttempts();
  }, [loadAttempts, summary?.updatedAt]);

  const insights = useMemo(() => {
    if (!summary) {
      return null;
    }

    return buildHistoryInsights(summary, recentDiagnosticAttempts, {
      attemptsErrorMessage,
    });
  }, [attemptsErrorMessage, recentDiagnosticAttempts, summary]);

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
    if (!insights || !summary) {
      return;
    }

    if (insights.hero.ctaKind === 'review' && summary.nextReviewTask?.weaknessId) {
      router.push({
        pathname: '/quiz/practice',
        params: {
          mode: 'weakness',
          weaknessId: summary.nextReviewTask.weaknessId,
        },
      });
      return;
    }

    resetSession();
    router.push({
      pathname: '/quiz/diagnostic',
      params: { autostart: '1' },
    });
  }

  return {
    insights,
    isLoadingAttempts,
    isReady,
    isRefreshing,
    onPrimaryAction,
    onRefresh,
  };
}

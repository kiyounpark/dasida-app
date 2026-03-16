import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

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

  useEffect(() => {
    let isMounted = true;

    async function loadAttempts() {
      if (!isReady || !summary?.accountKey) {
        if (isMounted) {
          setRecentDiagnosticAttempts([]);
          setAttemptsErrorMessage(null);
          setIsLoadingAttempts(false);
        }
        return;
      }

      if (isMounted) {
        setIsLoadingAttempts(true);
      }

      try {
        const attempts = await loadRecentAttempts({
          source: 'diagnostic',
          limit: 5,
        });

        if (!isMounted) {
          return;
        }

        setRecentDiagnosticAttempts(attempts);
        setAttemptsErrorMessage(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setRecentDiagnosticAttempts([]);
        setAttemptsErrorMessage(formatErrorMessage(error));
      } finally {
        if (isMounted) {
          setIsLoadingAttempts(false);
        }
      }
    }

    void loadAttempts();

    return () => {
      isMounted = false;
    };
  }, [isReady, loadRecentAttempts, summary?.accountKey, summary?.updatedAt]);

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
      setIsLoadingAttempts(true);

      try {
        const attempts = await loadRecentAttempts({
          source: 'diagnostic',
          limit: 5,
        });

        setRecentDiagnosticAttempts(attempts);
        setAttemptsErrorMessage(null);
      } catch (error) {
        setRecentDiagnosticAttempts([]);
        setAttemptsErrorMessage(formatErrorMessage(error));
      } finally {
        setIsLoadingAttempts(false);
      }
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

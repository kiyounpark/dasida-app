import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { buildHistoryInsights } from '@/features/history/history-insights';
import { useCurrentLearner } from '@/features/learner/provider';
import type { LearningAttempt } from '@/features/learning/types';

export type UseHistoryScreenResult = ReturnType<typeof useHistoryScreen>;

export function useHistoryScreen() {
  const { isReady, refresh, loadRecentAttempts, summary } = useCurrentLearner();
  const [recentDiagnosticAttempts, setRecentDiagnosticAttempts] = useState<LearningAttempt[]>([]);
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
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      setRecentDiagnosticAttempts([]);
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
      isLoadingAttempts,
    });
  }, [isLoadingAttempts, recentDiagnosticAttempts, summary]);

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

    if (insights.hero.ctaKind === 'review' && (summary.dueReviewTasks?.length ?? 0) > 0) {
      router.push({
        pathname: '/quiz/practice',
        params: {
          mode: 'review',
        },
      });
      return;
    }

    router.push({
      pathname: '/quiz/diagnostic',
      params: {
        autostart: '1',
        reset: '1',
      },
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

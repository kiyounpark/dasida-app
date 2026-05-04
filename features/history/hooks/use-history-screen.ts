import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { buildHistoryInsights, type HistoryExamHistoryItem } from '@/features/history/history-insights';
import { useCurrentLearner } from '@/features/learner/provider';
import type { LearningAttempt, LearningAttemptResult } from '@/features/learning/types';
import type { WeaknessId } from '@/data/diagnosisMap';
import {
  computeAnalysisInProgressState,
  type AnalysisInProgressState,
  type LatestExamAttemptSummary,
} from '@/features/quiz/exam/exam-analysis-in-progress';
import { buildExamResultSummaryFromAttempt } from '@/features/quiz/exam/build-exam-result-summary-from-attempt';
import { buildResumeAnalysisQueue } from '@/features/quiz/exam/build-resume-analysis-queue';
import { useExamSession } from '@/features/quiz/exam/exam-session';
import { syncDiagnosisProgressFromServer } from '@/features/quiz/exam/sync-diagnosis-progress';

import { onPressExamHistoryItemImpl } from './use-history-screen-handlers';

export type UseHistoryScreenResult = ReturnType<typeof useHistoryScreen>;

type LocalLatestAttempt = LatestExamAttemptSummary & {
  results: LearningAttemptResult[];
};

export function useHistoryScreen() {
  const { isReady, refresh, loadRecentAttempts, loadAttemptResults, summary, session } = useCurrentLearner();
  const { hydrateResult } = useExamSession();
  const [recentExamAttempts, setRecentExamAttempts] = useState<LearningAttempt[]>([]);
  const [isLoadingAttempts, setIsLoadingAttempts] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [latestAttempt, setLatestAttempt] = useState<LocalLatestAttempt | null>(null);
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
      // refresh()가 summary.updatedAt을 갱신하면 위의 useEffect가 loadAttempts를 트리거한다.
      // 여기서 loadAttempts를 직접 호출하면 같은 focus에서 두 번 fetch가 발생하므로 호출하지 않는다.
      void refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.accountKey]),
  );

  const latestAttemptId = recentExamAttempts[0]?.id ?? null;
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        // recentExamAttempts가 비어있으면 분석 상태도 없음
        if (recentExamAttempts.length === 0) {
          setLatestAttempt(null);
          setAnalysisState({ isInProgress: false });
          return;
        }
        const latest = recentExamAttempts[0];
        try {
          const results = await loadAttemptResults(latest.id);
          if (cancelled) return;

          const wrongResults = results.filter(
            (r) => !r.isCorrect && r.selectedIndex !== null,
          );
          const wrongProblemNumbers = wrongResults.map((r) => r.questionNumber);
          const resultSummary = buildExamResultSummaryFromAttempt({ attempt: latest, results });

          setLatestAttempt({
            examId: latest.sourceEntityId ?? '',
            attemptId: latest.id,
            attemptDateISO: latest.completedAt,
            wrongProblemNumbers,
            result: resultSummary,
            results,
          });

          const diagnosed: Record<number, WeaknessId> = {};
          for (const r of results) {
            if (r.diagnosisCompleted && r.finalWeaknessId !== null) {
              diagnosed[r.questionNumber] = r.finalWeaknessId;
            }
          }

          // Seed local AsyncStorage cache so any entry path (hero CTA, tap row) starts
          // from server state and avoids overwriting with partial local data on next sync.
          await syncDiagnosisProgressFromServer(
            {
              examId: latest.sourceEntityId ?? '',
              attemptId: latest.id,
              attemptDateISO: latest.completedAt,
            },
            results,
          );
          if (cancelled) return;

          setAnalysisState(
            computeAnalysisInProgressState({
              latestAttempts: [
                {
                  examId: latest.sourceEntityId ?? '',
                  attemptId: latest.id,
                  attemptDateISO: latest.completedAt,
                  wrongProblemNumbers,
                  result: resultSummary,
                },
              ],
              diagnosedProblemsByAttempt: { [latest.id]: diagnosed },
            }),
          );
        } catch {
          if (cancelled) return;
          setLatestAttempt(null);
          setAnalysisState({ isInProgress: false });
        }
      })();
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [latestAttemptId]),
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
      if (!analysisState.isInProgress) return;

      const firstItem = analysisState.isInProgress ? analysisState.items[0] : null;
      if (!firstItem) return;
      const queue = buildResumeAnalysisQueue(
        latestAttempt.wrongProblemNumbers,
        firstItem.diagnosedNotes,
      );
      if (queue.length === 0) return;

      hydrateResult(latestAttempt.result);
      router.push({
        pathname: '/quiz/exam/diagnosis-session',
        params: {
          examId: latestAttempt.examId,
          wrongProblemNumbers: JSON.stringify(queue),
          startIndex: '0',
          totalNotes: String(latestAttempt.wrongProblemNumbers.length),
          diagnosedCountBefore: String(firstItem.diagnosedNotes.length),
        },
      });
      return;
    }
  }

  function onPressEmptyStateCta() {
    router.push('/(tabs)/exam');
  }

  const onPressExamHistoryItem = useCallback(
    (item: HistoryExamHistoryItem) => {
      void onPressExamHistoryItemImpl(item, latestAttempt, hydrateResult);
    },
    [latestAttempt, hydrateResult],
  );

  return {
    insights,
    isLoadingAttempts,
    isReady,
    isRefreshing,
    onPrimaryAction,
    onPressEmptyStateCta,
    onPressExamHistoryItem,
    onRefresh,
  };
}

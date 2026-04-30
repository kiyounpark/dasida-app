import { router } from 'expo-router';

import { syncDiagnosisProgressFromServer } from '@/features/quiz/exam/sync-diagnosis-progress';
import { RESUMED_PARAM_VALUE } from '@/features/quiz/exam/exam-result-navigation';
import type { ExamResultSummary } from '@/features/quiz/exam/types';
import type { LearningAttemptResult } from '@/features/learning/types';

import type { HistoryExamHistoryItem } from '../history-insights';

type LatestAttemptForTap = {
  examId: string;
  attemptId: string;
  attemptDateISO: string;
  result: ExamResultSummary | null;
  results: LearningAttemptResult[];
};

export async function onPressExamHistoryItemImpl(
  item: HistoryExamHistoryItem,
  latestAttempt: LatestAttemptForTap | null,
  hydrateResult: (summary: ExamResultSummary) => void,
): Promise<void> {
  if (item.status !== 'in_progress') return;
  if (!latestAttempt || !latestAttempt.result) return;
  if (item.attemptId !== latestAttempt.attemptId) return;

  await syncDiagnosisProgressFromServer(
    {
      examId: latestAttempt.examId,
      attemptId: latestAttempt.attemptId,
      attemptDateISO: latestAttempt.attemptDateISO,
    },
    latestAttempt.results,
  );

  hydrateResult(latestAttempt.result);
  router.push(`/quiz/exam/result?resumed=${RESUMED_PARAM_VALUE}`);
}

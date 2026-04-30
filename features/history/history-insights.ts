import { compareTimestampsAsc } from '@/functions/shared/timestamp-utils';
import { diagnosisMap, type WeaknessId } from '@/data/diagnosisMap';
import type { LearnerSummaryCurrent, LearningAttempt } from '@/features/learning/types';
import type { ReviewStage } from '@/features/learning/history-types';
import type { AnalysisInProgressState } from '@/features/quiz/exam/exam-analysis-in-progress';
import { EXAM_CATALOG_BY_ID } from '@/features/quiz/data/exam-catalog';

export type HistoryHeroState = {
  examAttempts: number;
  averageAccuracyValue: string; // '—' | 'N%'
  topWeaknesses: Array<{
    weaknessId: WeaknessId;
    label: string;
    count: number;
  }>;
  ctaKind: 'resume_analysis' | null;
  ctaLabel: string | null;
};

export type HistoryExamHistoryItem = {
  attemptId: string;
  examId: string;
  examTitle: string;
  occurredAtLabel: string;
  accuracyLabel: string;
  status: 'completed' | 'in_progress' | 'not_started';
  statusLabel: string;
  isLatest: boolean;
};

export type HistoryScreenInsights = {
  isEmpty: boolean;
  hero: HistoryHeroState;
  weaknessProgress: HistoryWeaknessProgressItem[];
  examHistory: HistoryExamHistoryItem[];
};


export type HistoryWeaknessProgressItem = {
  weaknessId: WeaknessId;
  label: string;
  stageLabel: string;
  progressRatio: number;
  isDue: boolean;
  nextLabel: string;
};



const STAGE_LABELS: Record<ReviewStage, string> = {
  day1: '1단계',
  day3: '2단계',
  day7: '3단계',
  day30: '4단계',
};

const STAGE_PROGRESS: Record<ReviewStage, number> = {
  day1: 0.25,
  day3: 0.5,
  day7: 0.75,
  day30: 1.0,
};

function getWeaknessLabel(weaknessId?: WeaknessId | null): string {
  if (!weaknessId) return '기록 없음';
  return diagnosisMap[weaknessId]?.labelKo ?? '알 수 없는 약점';
}

function formatDateTime(timestamp: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function formatNextLabel(scheduledFor: string, isDue: boolean): string {
  if (isDue) return '오늘 복습';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const scheduled = new Date(scheduledFor);
  scheduled.setHours(0, 0, 0, 0);
  const diffDays = Math.round((scheduled.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return '오늘 복습';
  if (diffDays === 1) return '내일 복습';
  return `${diffDays}일 후 복습`;
}


function buildWeaknessProgress(
  summary: LearnerSummaryCurrent,
): HistoryWeaknessProgressItem[] {
  const dueReviewTasks = summary.dueReviewTasks ?? [];
  const dueIds = new Set(dueReviewTasks.map((t) => t.weaknessId));
  const allTasks = [
    ...dueReviewTasks,
    ...(summary.nextReviewTask && !dueIds.has(summary.nextReviewTask.weaknessId)
      ? [summary.nextReviewTask]
      : []),
  ];

  return allTasks.slice(0, 4).map((task) => {
    const isDue = dueIds.has(task.weaknessId);
    return {
      weaknessId: task.weaknessId,
      label: getWeaknessLabel(task.weaknessId),
      stageLabel: STAGE_LABELS[task.stage],
      progressRatio: STAGE_PROGRESS[task.stage],
      isDue,
      nextLabel: formatNextLabel(task.scheduledFor, isDue),
    };
  });
}



export function buildHero(input: {
  summary: LearnerSummaryCurrent;
  recentExamAttempts: LearningAttempt[];
  analysisState: AnalysisInProgressState;
}): HistoryHeroState {
  const { summary, recentExamAttempts } = input;
  const examAttempts = summary.totals.featuredExamAttempts;

  let averageAccuracyValue = '—';
  if (recentExamAttempts.length > 0) {
    const total = recentExamAttempts.reduce((sum, a) => sum + a.accuracy, 0);
    const avg = Math.round(total / recentExamAttempts.length);
    averageAccuracyValue = `${avg}%`;
  }

  const topWeaknesses = (summary.repeatedWeaknesses ?? [])
    .slice(0, 3)
    .map((rw) => ({
      weaknessId: rw.weaknessId,
      label: getWeaknessLabel(rw.weaknessId),
      count: rw.count,
    }));

  const ctaKind: HistoryHeroState['ctaKind'] =
    input.analysisState.isInProgress ? 'resume_analysis' : null;
  const ctaLabel = ctaKind === 'resume_analysis' ? '이어서 분석하기 →' : null;

  return {
    examAttempts,
    averageAccuracyValue,
    topWeaknesses,
    ctaKind,
    ctaLabel,
  };
}

export function buildExamHistoryItems(input: {
  recentExamAttempts: LearningAttempt[];
  latestAttemptId: string | null;
  analysisState: AnalysisInProgressState;
}): HistoryExamHistoryItem[] {
  const { recentExamAttempts, latestAttemptId, analysisState } = input;

  return recentExamAttempts.map((attempt) => {
    const examId = attempt.sourceEntityId ?? '';
    const examTitle = EXAM_CATALOG_BY_ID[examId]?.title ?? examId;
    const isLatest = attempt.id === latestAttemptId;

    let status: HistoryExamHistoryItem['status'];
    let statusLabel: string;
    if (isLatest && analysisState.isInProgress) {
      status = 'in_progress';
      statusLabel = `진행 중 ${analysisState.noteCount}/${analysisState.totalNotes}`;
    } else if (attempt.primaryWeaknessId !== null) {
      status = 'completed';
      statusLabel = '분석 완료';
    } else if (attempt.wrongCount === 0) {
      status = 'completed';
      statusLabel = '만점';
    } else {
      status = 'not_started';
      statusLabel = '분석 미시작';
    }

    return {
      attemptId: attempt.id,
      examId,
      examTitle,
      occurredAtLabel: formatDateTime(attempt.completedAt),
      accuracyLabel: `정답률 ${attempt.accuracy}%`,
      status,
      statusLabel,
      isLatest,
    };
  });
}

export function buildHistoryInsights(input: {
  summary: LearnerSummaryCurrent;
  recentExamAttempts: LearningAttempt[];
  latestAttemptId: string | null;
  analysisState: AnalysisInProgressState;
}): HistoryScreenInsights {
  const { summary, recentExamAttempts, latestAttemptId, analysisState } = input;
  const isEmpty = summary.totals.featuredExamAttempts === 0;

  return {
    isEmpty,
    hero: buildHero({ summary, recentExamAttempts, analysisState }),
    weaknessProgress: buildWeaknessProgress(summary),
    examHistory: buildExamHistoryItems({ recentExamAttempts, latestAttemptId, analysisState }),
  };
}

import { diagnosisMap, type WeaknessId } from '@/data/diagnosisMap';
import type { LearnerSummaryCurrent, LearningAttempt } from '@/features/learning/types';

export type HistoryHeroState = {
  title: string;
  body: string;
  meta: string[];
  pointLabel: string;
  pointBody: string;
  ctaLabel: string;
  ctaKind: 'review' | 'diagnostic';
};

export type HistorySpotlightSeriesPoint = {
  id: string;
  label: string;
  accuracy: number;
  isLatest: boolean;
};

export type HistorySpotlightState =
  | {
      mode: 'empty';
      label: string;
      value: string;
      supportingText: string;
      badgeText: string;
      badgeTone: 'neutral';
      coachText: string;
      series: [];
    }
  | {
      mode: 'single';
      label: string;
      value: string;
      supportingText: string;
      badgeText: string;
      badgeTone: 'neutral';
      coachText: string;
      series: [HistorySpotlightSeriesPoint];
    }
  | {
      mode: 'trend';
      label: string;
      value: string;
      supportingText: string;
      badgeText: string;
      badgeTone: 'positive' | 'warning';
      coachText: string;
      series: HistorySpotlightSeriesPoint[];
    };

export type HistoryComparisonState =
  | {
      enabled: false;
      placeholder: string;
    }
  | {
      enabled: true;
      summaryTitle: string;
      summaryBody: string;
      previous: {
        accuracyLabel: string;
        weaknessLabels: string[];
        completedAtLabel: string;
      };
      current: {
        accuracyLabel: string;
        weaknessLabels: string[];
        completedAtLabel: string;
      };
    };

export type HistoryFocusItem = {
  weaknessId: WeaknessId;
  label: string;
  countLabel: string;
  body: string;
  fillRatio: number;
  isLinkedToReview: boolean;
};

export type HistoryPulseItem = {
  id: string;
  kind: 'diagnostic' | 'review' | 'exam';
  kindLabel: string;
  title: string;
  subtitle: string;
  occurredAtLabel: string;
};

export type HistoryScreenInsights = {
  hero: HistoryHeroState;
  spotlight: HistorySpotlightState;
  comparison: HistoryComparisonState;
  focusItems: HistoryFocusItem[];
  pulseItems: HistoryPulseItem[];
};

function formatShortDate(timestamp: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
  }).format(new Date(timestamp));
}

function formatDateTime(timestamp: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function getWeaknessLabel(weaknessId?: WeaknessId | null) {
  if (!weaknessId) {
    return '기록 없음';
  }

  return diagnosisMap[weaknessId].labelKo;
}

function getActivityKindLabel(kind: 'diagnostic' | 'review' | 'exam') {
  switch (kind) {
    case 'diagnostic':
      return '진단';
    case 'review':
      return '복습';
    case 'exam':
      return '실전';
  }
}

function sortAttempts(attempts: LearningAttempt[]) {
  return [...attempts].sort((left, right) => left.completedAt.localeCompare(right.completedAt));
}

function buildHero(
  summary: LearnerSummaryCurrent,
  attempts: LearningAttempt[],
): HistoryHeroState {
  if (summary.nextReviewTask) {
    return {
      title: '오늘은 약점 1개만 짧게 다시 잡아보면 됩니다.',
      body: '이미 한 번 정리한 흔들림을 오늘 복습으로 묶어 두면, 다음 진단에서 훨씬 덜 흔들리는 흐름으로 이어질 수 있어요.',
      meta: [
        `우선순위 · ${summary.nextReviewTask.stage.toUpperCase()}`,
        `대상 · ${getWeaknessLabel(summary.nextReviewTask.weaknessId)}`,
      ],
      pointLabel: '복습',
      pointBody: '오늘 할 일은 넓게 보지 않고 1개 약점만 다시 잡습니다.',
      ctaLabel: '복습하러 가기',
      ctaKind: 'review',
    };
  }

  if (summary.latestDiagnosticSummary) {
    return {
      title: '최근 흐름을 끊지 않게 빠른 재진단으로 이어가 보세요.',
      body: '복습 예약은 아직 없지만, 지금 한 번 더 짧게 풀면 남은 흔들림이 어디인지 더 선명하게 보이기 시작합니다.',
      meta: [
        `최근 정답률 · ${summary.latestDiagnosticSummary.accuracy}%`,
        `최근 약점 · ${getWeaknessLabel(summary.latestDiagnosticSummary.topWeaknesses[0])}`,
      ],
      pointLabel: `${attempts.length || 1}회차`,
      pointBody: '한 번 더 풀면 달라진 점을 더 또렷하게 볼 수 있어요.',
      ctaLabel: '빠른 재진단 하기',
      ctaKind: 'diagnostic',
    };
  }

  return {
    title: '첫 진단 10문제로 내 흐름을 먼저 만들어보세요.',
    body: '첫 결과 하나만 생겨도 다음부터는 달라진 점을 계속 확인할 수 있어요.',
    meta: ['10문항', '약 3분'],
    pointLabel: '시작',
    pointBody: '가볍게 한 번 시작해 보세요. 첫 기록부터 차근차근 쌓이면 됩니다.',
    ctaLabel: '첫 진단 시작하기',
    ctaKind: 'diagnostic',
  };
}

function buildSpotlight(
  attempts: LearningAttempt[],
  attemptsErrorMessage?: string | null,
): HistorySpotlightState {
  const sorted = sortAttempts(attempts);

  if (sorted.length === 0) {
    return {
      mode: 'empty',
      label: attemptsErrorMessage ? '흐름을 불러오지 못했어요' : '아직 비교할 기록이 없어요',
      value: attemptsErrorMessage ? '대기' : '시작',
      supportingText: attemptsErrorMessage
        ? '최근 진단 흐름은 잠시 후 다시 불러올 수 있어요.'
        : '첫 진단을 쌓으면 변화량이 여기에 보입니다.',
      badgeText: attemptsErrorMessage ? '불러오기 필요' : '기록 전',
      badgeTone: 'neutral',
      coachText: attemptsErrorMessage
        ? attemptsErrorMessage
        : '첫 기록이 생기면 다음부터는 이전보다 얼마나 달라졌는지 함께 볼 수 있어요.',
      series: [],
    };
  }

  const latest = sorted[sorted.length - 1];
  const series = sorted.map((attempt, index) => ({
    id: attempt.id,
    label: `${formatShortDate(attempt.completedAt)} · ${attempt.accuracy}%`,
    accuracy: attempt.accuracy,
    isLatest: index === sorted.length - 1,
  })) as HistorySpotlightSeriesPoint[];

  if (sorted.length === 1) {
    return {
      mode: 'single',
      label: '첫 기록이 생겼어요',
      value: `${latest.accuracy}%`,
      supportingText: '다음 진단부터는 직전 대비 변화량을 바로 보여줍니다.',
      badgeText: '첫 기록',
      badgeTone: 'neutral',
      coachText:
        '좋아요. 다음 진단이 쌓이면 지난번과 이번을 바로 비교해 볼 수 있어요.',
      series: [series[0]],
    };
  }

  const previous = sorted[sorted.length - 2];
  const delta = latest.accuracy - previous.accuracy;
  const maxAccuracy = Math.max(...sorted.map((attempt) => attempt.accuracy));
  const isBest = latest.accuracy === maxAccuracy;

  return {
    mode: 'trend',
    label: '직전보다',
    value: `${delta >= 0 ? '+' : ''}${delta}%p`,
    supportingText: `이번 ${latest.accuracy}% · 지난번 ${previous.accuracy}%`,
    badgeText: isBest ? '최근 흐름 최고' : delta >= 0 ? '상승 흐름' : '잠깐 흔들림',
    badgeTone: isBest || delta >= 0 ? 'positive' : 'warning',
    coachText:
      delta >= 0
        ? '좋은 흐름이에요. 지금처럼 차근차근 이어가면 됩니다.'
        : '조금 흔들려도 괜찮아요. 오늘은 이 부분만 다시 보면 됩니다.',
    series,
  };
}

function buildComparison(attempts: LearningAttempt[]): HistoryComparisonState {
  const sorted = sortAttempts(attempts);

  if (sorted.length < 2) {
    return {
      enabled: false,
      placeholder: '한 번 더 진단하면 지난번과 이번을 나란히 비교해 볼 수 있어요.',
    };
  }

  const previous = sorted[sorted.length - 2];
  const current = sorted[sorted.length - 1];
  const delta = current.accuracy - previous.accuracy;
  const previousWeaknessLabel = getWeaknessLabel(previous.topWeaknesses[0]);
  const currentWeaknessLabel = getWeaknessLabel(current.topWeaknesses[0]);

  const summaryBody =
    previousWeaknessLabel === currentWeaknessLabel
      ? delta >= 0
        ? `${currentWeaknessLabel}는 아직 남아 있지만, 정답률은 올라가고 있어요. 같은 부분을 조금씩 더 잘 잡아가고 있는 흐름이에요.`
        : `${currentWeaknessLabel}가 여전히 남아 있고 이번에는 조금 흔들렸어요. 오늘은 이 부분을 다시 보면 도움이 됩니다.`
      : delta >= 0
        ? `대표 흔들림이 ${previousWeaknessLabel}에서 ${currentWeaknessLabel}로 좁혀졌어요. 이제 더 구체적인 부분만 정리하면 됩니다.`
        : `대표 흔들림이 ${previousWeaknessLabel}에서 ${currentWeaknessLabel}로 바뀌었어요. 이번엔 이 부분을 먼저 다시 보면 좋아요.`;

  return {
    enabled: true,
    summaryTitle: `정답률 ${delta >= 0 ? '+' : ''}${delta}%p`,
    summaryBody,
    previous: {
      accuracyLabel: `${previous.accuracy}%`,
      weaknessLabels: previous.topWeaknesses.slice(0, 2).map((weaknessId) => getWeaknessLabel(weaknessId)),
      completedAtLabel: formatDateTime(previous.completedAt),
    },
    current: {
      accuracyLabel: `${current.accuracy}%`,
      weaknessLabels: current.topWeaknesses.slice(0, 2).map((weaknessId) => getWeaknessLabel(weaknessId)),
      completedAtLabel: formatDateTime(current.completedAt),
    },
  };
}

function buildFocusItems(summary: LearnerSummaryCurrent): HistoryFocusItem[] {
  return summary.repeatedWeaknesses.slice(0, 2).map((item) => ({
    weaknessId: item.weaknessId,
    label: getWeaknessLabel(item.weaknessId),
    countLabel: `${item.count}회`,
    body: '자주 헷갈렸던 부분이에요. 가볍게 다시 보면 도움이 됩니다.',
    fillRatio: Math.min(item.count, 5) / 5,
    isLinkedToReview: summary.nextReviewTask?.weaknessId === item.weaknessId,
  }));
}

function buildPulseItems(summary: LearnerSummaryCurrent): HistoryPulseItem[] {
  return summary.recentActivity.slice(0, 2).map((item) => ({
    id: item.id,
    kind: item.kind,
    kindLabel: getActivityKindLabel(item.kind),
    title: item.title,
    subtitle: item.subtitle,
    occurredAtLabel: formatDateTime(item.occurredAt),
  }));
}

export function buildHistoryInsights(
  summary: LearnerSummaryCurrent,
  recentDiagnosticAttempts: LearningAttempt[],
  options?: {
    attemptsErrorMessage?: string | null;
  },
): HistoryScreenInsights {
  return {
    hero: buildHero(summary, recentDiagnosticAttempts),
    spotlight: buildSpotlight(recentDiagnosticAttempts, options?.attemptsErrorMessage),
    comparison: buildComparison(recentDiagnosticAttempts),
    focusItems: buildFocusItems(summary),
    pulseItems: buildPulseItems(summary),
  };
}

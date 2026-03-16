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
      pointBody: '한 번 더 쌓이면 성장 신호를 더 분명하게 읽을 수 있습니다.',
      ctaLabel: '빠른 재진단 하기',
      ctaKind: 'diagnostic',
    };
  }

  return {
    title: '첫 진단 10문제로 내 흐름을 먼저 만들어보세요.',
    body: '지금은 변화량보다 첫 기록이 더 중요합니다. 첫 결과 하나만 생겨도 다음부터는 “나아짐”을 계속 보여줄 수 있어요.',
    meta: ['10문항', '약 3분'],
    pointLabel: '시작',
    pointBody: '첫 기록 전에는 숫자보다 시작 동기가 먼저 보이게 합니다.',
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
        : '첫 기록이 생긴 뒤부터는 점수보다 “전보다 나아졌는지”를 중심으로 보여줄 수 있어요.',
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
        '지금은 추세선보다 첫 출발점이 중요합니다. 두 번째 기록이 생기면 바로 전후 비교가 가능합니다.',
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
        ? '좋은 신호예요. 지금 방식이 맞고 있다는 증거로 읽히게 만들었습니다.'
        : '내려간 날이라도 바로 낙인찍지 않고, 오늘 다시 잡을 약점으로 자연스럽게 이어지게 했습니다.',
    series,
  };
}

function buildComparison(attempts: LearningAttempt[]): HistoryComparisonState {
  const sorted = sortAttempts(attempts);

  if (sorted.length < 2) {
    return {
      enabled: false,
      placeholder:
        '비교 카드는 두 번째 진단부터 열립니다. 지금은 “첫 기록이 생겼다”는 감각만 주는 쪽이 더 중요합니다.',
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
        ? `${currentWeaknessLabel}는 아직 남아 있지만, 정답률은 올라가고 있어요. 같은 약점을 더 정교하게 다루는 단계로 읽을 수 있습니다.`
        : `${currentWeaknessLabel}가 여전히 남아 있고 이번에는 조금 흔들렸어요. 그래서 다음 행동을 바로 복습으로 연결하는 흐름이 중요합니다.`
      : delta >= 0
        ? `대표 흔들림이 ${previousWeaknessLabel}에서 ${currentWeaknessLabel}로 좁혀졌어요. 큰 개념 흔들림에서 더 구체적인 정리 단계로 이동한 흐름으로 볼 수 있습니다.`
        : `대표 흔들림이 ${previousWeaknessLabel}에서 ${currentWeaknessLabel}로 바뀌었고 이번엔 살짝 내려갔어요. 그래서 지금은 새로운 흔들림을 빠르게 붙잡는 쪽이 맞습니다.`;

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
    body: '반복 빈도만 조용히 보여주고, 오늘 복습과 연결될 때만 강조합니다.',
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

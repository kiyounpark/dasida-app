import { diagnosisMap } from '@/data/diagnosisMap';
import { formatReviewStageLabel } from '@/features/learning/review-stage';
import type { LearnerSummaryCurrent } from '@/features/learning/types';

export type JourneyStepKey = 'diagnostic' | 'analysis' | 'review' | 'exam';
export type JourneyStepStatus = 'completed' | 'active' | 'pending' | 'locked';
export type JourneyCtaAction =
  | 'start_diagnostic'
  | 'open_result'
  | 'open_review';

export type HomeJourneyStep = {
  key: JourneyStepKey;
  number: number;
  title: string;
  detail: string;
  status: JourneyStepStatus;
  statusLabel: string;
};

export type HomeJourneyState = {
  eyebrow: string;
  title: string;
  body: string;
  progressLabel: string;
  currentStepKey: JourneyStepKey;
  currentStepTitle: string;
  currentStepBody: string;
  currentBubbleText: string;
  ctaAction: JourneyCtaAction;
  ctaLabel: string;
  ctaBody: string;
  steps: HomeJourneyStep[];
};

const stepTitles: Record<JourneyStepKey, string> = {
  diagnostic: '10문제 빠른 진단',
  analysis: '오답 약점 분석',
  review: '맞춤 연습 & 복습',
  exam: '완벽 마스터',
};

function hasActivityAfter(
  summary: LearnerSummaryCurrent,
  kind: 'review' | 'exam',
  timestamp?: string,
) {
  if (!timestamp) {
    return false;
  }

  const anchor = Date.parse(timestamp);
  if (Number.isNaN(anchor)) {
    return false;
  }

  return summary.recentActivity.some((activity) => {
    if (activity.kind !== kind) {
      return false;
    }

    const occurredAt = Date.parse(activity.occurredAt);
    return !Number.isNaN(occurredAt) && occurredAt > anchor;
  });
}

function getWeaknessLabel(summary: LearnerSummaryCurrent) {
  const weaknessId = summary.latestDiagnosticSummary?.topWeaknesses[0];
  if (!weaknessId) {
    return '최근 약점 없음';
  }

  return diagnosisMap[weaknessId].labelKo;
}

function getCurrentStep(summary: LearnerSummaryCurrent): JourneyStepKey {
  const hasLatestDiagnostic = Boolean(summary.latestDiagnosticSummary);
  const latestDiagnosticAt = summary.latestDiagnosticSummary?.completedAt;
  const hasDueReviews = (summary.dueReviewTasks?.length ?? 0) > 0;
  const hasReviewAfterLatestDiagnostic = hasActivityAfter(summary, 'review', latestDiagnosticAt);

  if (hasDueReviews || hasReviewAfterLatestDiagnostic) {
    return 'review';
  }

  if (hasLatestDiagnostic) {
    return 'analysis';
  }

  return 'diagnostic';
}

function getStepStatus(
  currentStep: JourneyStepKey,
  step: JourneyStepKey,
): JourneyStepStatus {
  if (currentStep === 'diagnostic') {
    return step === 'diagnostic' ? 'active' : 'locked';
  }

  if (currentStep === 'analysis') {
    if (step === 'diagnostic') {
      return 'completed';
    }

    if (step === 'analysis') {
      return 'active';
    }

    return step === 'review' ? 'pending' : 'locked';
  }

  // currentStep === 'review' (현재 여정 보드의 최대 단계)
  if (step === 'diagnostic' || step === 'analysis') {
    return 'completed';
  }

  return step === 'review' ? 'active' : 'pending';
}

function getStepDetail(
  step: JourneyStepKey,
  summary: LearnerSummaryCurrent,
): string {
  if (step === 'diagnostic') {
    return summary.latestDiagnosticSummary
      ? `최근 약점 · ${getWeaknessLabel(summary)}`
      : '10문항 · 약 3분';
  }

  if (step === 'analysis') {
    return summary.latestDiagnosticSummary
      ? `${getWeaknessLabel(summary)} 중심 결과 확인`
      : '최근 진단 결과 확인';
  }

  if (step === 'review') {
    const dueReviewTasks = summary.dueReviewTasks ?? [];
    if (dueReviewTasks[0]) {
      return `${formatReviewStageLabel(dueReviewTasks[0].stage)} · 오늘 복습 ${dueReviewTasks.length}개`;
    }

    return '약점을 다시 잡는 단계';
  }

  return '복습 뒤 실전에 적용';
}

function getStepStatusLabel(
  step: JourneyStepKey,
  status: JourneyStepStatus,
  summary: LearnerSummaryCurrent,
): string {
  if (status === 'completed') {
    return '완료';
  }

  if (status === 'locked') {
    return '잠김';
  }

  if (status === 'pending') {
    return '대기 중';
  }

  if (step === 'diagnostic') {
    return '진행 중';
  }

  if (step === 'review') {
    const dueCount = summary.dueReviewTasks?.length ?? 0;
    return dueCount > 0 ? `복습 ${dueCount}개` : '활성화';
  }

  return '활성화';
}

function getCurrentBubbleText(currentStep: JourneyStepKey) {
  switch (currentStep) {
    case 'analysis':
      return '내 약점을 분석 중이에요...';
    case 'review':
      return '이제 연습할 시간!';
    default:
      return '반가워요! 첫 진단 평가를 시작해볼까요?';
  }
}

function getCurrentStepBody(
  currentStep: JourneyStepKey,
  summary: LearnerSummaryCurrent,
) {
  switch (currentStep) {
    case 'analysis':
      return `${getWeaknessLabel(summary)}부터 확인하면 다음 복습 단계가 더 빨리 열립니다.`;
    case 'review': {
      const dueCount = summary.dueReviewTasks?.length ?? 0;
      return dueCount > 1
        ? `오늘은 복습 ${dueCount}개를 차례로 정리하면 됩니다.`
        : '오늘은 약점 1개만 짧게 다시 잡으면 됩니다.';
    }
    default:
      return '첫 기록만 생기면 분석, 복습, 실전 적용까지 한 줄로 이어집니다.';
  }
}

function getCtaState(
  currentStep: JourneyStepKey,
  summary: LearnerSummaryCurrent,
): Pick<HomeJourneyState, 'ctaAction' | 'ctaLabel' | 'ctaBody'> {
  if (currentStep === 'analysis') {
    return {
      ctaAction: 'open_result',
      ctaLabel: '약점 결과 보기',
      ctaBody: `${getWeaknessLabel(summary)}부터 보면 다음 복습으로 자연스럽게 이어집니다.`,
    };
  }

  if (currentStep === 'review') {
    const dueCount = summary.dueReviewTasks?.length ?? 0;

    if (dueCount === 0) {
      return {
        ctaAction: 'open_review',
        ctaLabel: '약점 연습 시작하기',
        ctaBody: '약점 연습을 마치면 모의고사가 열립니다.',
      };
    }

    return {
      ctaAction: 'open_review',
      ctaLabel: dueCount > 1 ? `복습 ${dueCount}개 시작하기` : '복습 시작하기',
      ctaBody:
        dueCount > 1
          ? '대표 약점부터 순서대로 다시 보면 됩니다.'
          : '오늘 해야 할 복습 한 가지만 먼저 열어보세요.',
    };
  }

  return {
    ctaAction: 'start_diagnostic',
    ctaLabel: '첫 진단 시작하기',
    ctaBody: '10문제로 지금 위치를 먼저 확인합니다.',
  };
}

export function buildHomeJourneyState(summary: LearnerSummaryCurrent): HomeJourneyState {
  const currentStepKey = getCurrentStep(summary);
  const stepOrder: JourneyStepKey[] = ['diagnostic', 'analysis', 'review', 'exam'];
  const currentStepIndex = stepOrder.indexOf(currentStepKey);
  const steps = stepOrder.map((step, index) => {
    const status = getStepStatus(currentStepKey, step);

    return {
      key: step,
      number: index + 1,
      title: stepTitles[step],
      detail: getStepDetail(step, summary),
      status,
      statusLabel: getStepStatusLabel(step, status, summary),
    };
  });

  return {
    eyebrow: '학습 여정',
    title: '지금 단계만 따라가면 됩니다.',
    body: '진단에서 분석, 복습, 실전 적용까지 한 줄로 이어집니다.',
    progressLabel: `${currentStepIndex + 1} / 4 단계`,
    currentStepKey,
    currentStepTitle: stepTitles[currentStepKey],
    currentStepBody: getCurrentStepBody(currentStepKey, summary),
    currentBubbleText: getCurrentBubbleText(currentStepKey),
    ...getCtaState(currentStepKey, summary),
    steps,
  };
}

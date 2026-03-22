import { diagnosisMap } from '@/data/diagnosisMap';
import { getReviewHeroPrompt } from '@/data/review-content-map';
import type {
  ActiveReviewTaskSummary,
  DiagnosticSummarySnapshot,
  LearnerProfile,
} from '@/features/learner/types';
import {
  buildHomeJourneyState,
  type HomeJourneyState,
} from '@/features/learning/home-journey-state';
import { formatReviewStageLabel } from '@/features/learning/review-stage';

import type { LearnerSummaryCurrent, PeerPresenceSnapshot } from './types';

export type PeerPresenceState =
  | {
      mode: 'live';
      title: string;
      peers: PeerPresenceSnapshot['peers'];
    }
  | {
      mode: 'fallback';
      title: string;
      subtitle?: string;
    };

export type HomeLearningState = {
  hero: 'diagnostic' | 'review';
  heroTitle: string;
  heroBody: string;
  heroMeta: string;
  todayReviewCount: number;
  journey: HomeJourneyState;
  peerPresence: PeerPresenceState;
  latestDiagnosticSummary?: DiagnosticSummarySnapshot;
  nextReviewTask?: ActiveReviewTaskSummary;
  featuredExamCard: {
    examId: string;
    status: 'not_started' | 'in_progress' | 'completed';
    title: string;
    body: string;
    ctaLabel: string;
  };
  recentResultCard: {
    enabled: boolean;
    title: string;
    body: string;
    ctaLabel: string;
  };
  recentActivity: Array<{
    id: string;
    kind: 'diagnostic' | 'review' | 'exam';
    title: string;
    subtitle: string;
    occurredAt: string;
  }>;
};

function buildHeroContent(
  summary: LearnerSummaryCurrent,
  dueReviewTasks: ActiveReviewTaskSummary[],
): Pick<HomeLearningState, 'hero' | 'heroTitle' | 'heroBody' | 'heroMeta' | 'todayReviewCount'> {
  if (dueReviewTasks.length > 0) {
    const leadTask = dueReviewTasks[0];
    const weaknessLabel = diagnosisMap[leadTask.weaknessId].labelKo;
    const todayReviewCount = dueReviewTasks.length;
    return {
      hero: 'review',
      heroTitle: getReviewHeroPrompt(leadTask.weaknessId),
      heroBody:
        todayReviewCount > 1
          ? `${weaknessLabel}부터 시작하면 오늘 복습 ${todayReviewCount}개를 차례로 다시 볼 수 있어요.`
          : `${weaknessLabel} 한 가지만 짧게 다시 떠올려보면 됩니다.`,
      heroMeta: `${formatReviewStageLabel(leadTask.stage)} · 오늘 복습 ${todayReviewCount}개`,
      todayReviewCount,
    };
  }

  if (summary.latestDiagnosticSummary?.topWeaknesses[0]) {
    const weaknessLabel = diagnosisMap[summary.latestDiagnosticSummary.topWeaknesses[0]].labelKo;
    return {
      hero: 'diagnostic',
      heroTitle: '빠른 재진단 10문제',
      heroBody: '흔들리는 틀린 문제부터 가볍게 다시 정리할 수 있어요.',
      heroMeta: `최근 약점 · ${weaknessLabel}`,
      todayReviewCount: 0,
    };
  }

  return {
    hero: 'diagnostic',
    heroTitle: '3분 체험 10문제',
    heroBody: '흔들리는 틀린 문제부터 빠르게 정리할 수 있어요.',
    heroMeta: '10문항 · 약 3분',
    todayReviewCount: 0,
  };
}

function buildPeerPresenceState(
  hero: HomeLearningState['hero'],
  peerPresenceSnapshot: PeerPresenceSnapshot | null,
  todayReviewCount: number,
): PeerPresenceState {
  if (peerPresenceSnapshot && peerPresenceSnapshot.peers.length > 0) {
    return {
      mode: 'live',
      title: '같이 틀린 문제를 정리하는 학생들',
      peers: peerPresenceSnapshot.peers,
    };
  }

  if (hero === 'review') {
    return {
      mode: 'fallback',
      title: '한 번 정리한 틀린 문제는 다시 볼수록 덜 흔들려요',
      subtitle:
        todayReviewCount > 1
          ? `오늘은 대표 약점부터 복습 ${todayReviewCount}개를 차례로 다시 보면 됩니다.`
          : '오늘은 약점 1개만 짧게 다시 보면 됩니다.',
    };
  }

  return {
    mode: 'fallback',
    title: '귀찮은 틀린 문제 정리, 여기서 바로 이어갈 수 있어요',
    subtitle: '답만 보고 넘기지 않게 이어줄게요.',
  };
}

function buildFeaturedExamCard(
  status: HomeLearningState['featuredExamCard']['status'],
): HomeLearningState['featuredExamCard'] {
  if (status === 'in_progress') {
    return {
      examId: 'featured-mock-1',
      status,
      title: '대표 모의고사',
      body: '이어 풀면서 틀린 문제 정리까지 연결할 수 있어요.',
      ctaLabel: '계속 풀기',
    };
  }

  if (status === 'completed') {
    return {
      examId: 'featured-mock-1',
      status,
      title: '대표 모의고사',
      body: '최근에 마친 실전 세트를 다시 볼 수 있어요.',
      ctaLabel: '다시 보기',
    };
  }

  return {
    examId: 'featured-mock-1',
    status,
    title: '대표 모의고사',
    body: '실전 세트에서 정리한 흐름을 바로 써볼 수 있어요.',
    ctaLabel: '보러가기',
  };
}

function buildRecentResultCard(
  summary: LearnerSummaryCurrent,
): HomeLearningState['recentResultCard'] {
  const weaknessId = summary.latestDiagnosticSummary?.topWeaknesses[0];
  if (!weaknessId) {
    return {
      enabled: false,
      title: '최근 진단 결과',
      body: '아직 저장된 진단 결과가 없어요.',
      ctaLabel: '진단 후 열림',
    };
  }

  return {
    enabled: true,
    title: '최근 진단 결과',
    body: '최근에 정리한 약점을 다시 확인할 수 있어요.',
    ctaLabel: '결과 보기',
  };
}

function buildRecentActivity(summary: LearnerSummaryCurrent): HomeLearningState['recentActivity'] {
  return summary.recentActivity;
}

export function buildHomeLearningState(
  _profile: LearnerProfile,
  summary: LearnerSummaryCurrent,
  peerPresenceSnapshot: PeerPresenceSnapshot | null = null,
): HomeLearningState {
  const nextReviewTask = summary.nextReviewTask;
  const dueReviewTasks = summary.dueReviewTasks ?? [];
  const heroContent = buildHeroContent(summary, dueReviewTasks);
  const peerPresence = buildPeerPresenceState(
    heroContent.hero,
    peerPresenceSnapshot,
    heroContent.todayReviewCount,
  );
  const featuredExamCard = buildFeaturedExamCard(summary.featuredExamState.status);
  const recentResultCard = buildRecentResultCard(summary);

  return {
    ...heroContent,
    journey: buildHomeJourneyState(summary),
    peerPresence,
    latestDiagnosticSummary: summary.latestDiagnosticSummary,
    nextReviewTask,
    featuredExamCard: {
      ...featuredExamCard,
      examId: summary.featuredExamState.examId ?? featuredExamCard.examId,
    },
    recentResultCard,
    recentActivity: buildRecentActivity(summary),
  };
}

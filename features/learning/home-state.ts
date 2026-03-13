import { diagnosisMap, type WeaknessId } from '@/data/diagnosisMap';
import type { LearnerProfile } from '@/features/learner/types';

import type { PeerPresenceSnapshot, ReviewTask } from './types';

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
  peerPresence: PeerPresenceState;
  latestDiagnosticSummary?: {
    topWeaknesses: WeaknessId[];
    accuracy: number;
    completedAt: string;
  };
  nextReviewTask?: ReviewTask;
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
  }>;
};

function sortReviewTasks(tasks: ReviewTask[]) {
  return [...tasks].sort((left, right) =>
    left.scheduledFor.localeCompare(right.scheduledFor),
  );
}

function buildHeroContent(
  profile: LearnerProfile,
  nextReviewTask?: ReviewTask,
): Pick<HomeLearningState, 'hero' | 'heroTitle' | 'heroBody' | 'heroMeta'> {
  if (nextReviewTask) {
    const weaknessLabel = diagnosisMap[nextReviewTask.weaknessId].labelKo;
    return {
      hero: 'review',
      heroTitle: '오늘의 약점 학습',
      heroBody: '이미 정리한 틀린 문제 패턴을 오늘 짧게 다시 붙잡아볼 차례예요.',
      heroMeta: `${nextReviewTask.stage.toUpperCase()} · ${weaknessLabel}`,
    };
  }

  if (profile.latestDiagnosticSummary?.topWeaknesses[0]) {
    const weaknessLabel = diagnosisMap[profile.latestDiagnosticSummary.topWeaknesses[0]].labelKo;
    return {
      hero: 'diagnostic',
      heroTitle: '빠른 재진단 10문제',
      heroBody: '흔들리는 틀린 문제부터 가볍게 다시 정리할 수 있어요.',
      heroMeta: `최근 약점 · ${weaknessLabel}`,
    };
  }

  return {
    hero: 'diagnostic',
    heroTitle: '3분 체험 10문제',
    heroBody: '흔들리는 틀린 문제부터 빠르게 정리할 수 있어요.',
    heroMeta: '10문항 · 약 3분',
  };
}

function buildPeerPresenceState(
  hero: HomeLearningState['hero'],
  peerPresenceSnapshot: PeerPresenceSnapshot | null,
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
      subtitle: '오늘은 약점 1개만 짧게 다시 보면 됩니다.',
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
      body: '최근에 한 번 마친 실전 세트를 다시 살펴볼 수 있어요.',
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
  profile: LearnerProfile,
): HomeLearningState['recentResultCard'] {
  const weaknessId = profile.latestDiagnosticSummary?.topWeaknesses[0];
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

export function buildHomeLearningState(
  profile: LearnerProfile,
  reviewTasks: ReviewTask[],
  peerPresenceSnapshot: PeerPresenceSnapshot | null = null,
): HomeLearningState {
  const pendingTasks = sortReviewTasks(reviewTasks.filter((task) => !task.completed));
  const nextReviewTask =
    pendingTasks[0] ??
    (profile.activeReviewTask
      ? {
          ...profile.activeReviewTask,
          sourceId: `preview-${profile.activeReviewTask.id}`,
          completed: false,
          createdAt: profile.updatedAt,
        }
      : undefined);
  const heroContent = buildHeroContent(profile, nextReviewTask);
  const peerPresence = buildPeerPresenceState(heroContent.hero, peerPresenceSnapshot);
  const featuredExamCard = buildFeaturedExamCard(
    profile.featuredExamState?.status ?? 'not_started',
  );
  const recentResultCard = buildRecentResultCard(profile);

  const recentActivity: HomeLearningState['recentActivity'] = [];

  if (profile.latestDiagnosticSummary) {
    recentActivity.push({
      id: 'latest-diagnostic',
      kind: 'diagnostic',
      title: '최근 진단 결과',
      subtitle:
        profile.latestDiagnosticSummary.topWeaknesses.length > 0
          ? diagnosisMap[profile.latestDiagnosticSummary.topWeaknesses[0]].labelKo
          : '최근 정리 없음',
    });
  }

  if (nextReviewTask) {
    recentActivity.push({
      id: `review-${nextReviewTask.id}`,
      kind: 'review',
      title: '다음 복습',
      subtitle: diagnosisMap[nextReviewTask.weaknessId].labelKo,
    });
  }

  if (profile.featuredExamState) {
    recentActivity.push({
      id: `exam-${profile.featuredExamState.examId}`,
      kind: 'exam',
      title: '대표 모의고사',
      subtitle:
        profile.featuredExamState.status === 'in_progress'
          ? '이어 풀기 가능'
          : profile.featuredExamState.status === 'completed'
            ? '최근 완료'
            : '아직 시작 전',
    });
  }

  return {
    ...heroContent,
    peerPresence,
    latestDiagnosticSummary: profile.latestDiagnosticSummary,
    nextReviewTask,
    featuredExamCard: {
      ...featuredExamCard,
      examId: profile.featuredExamState?.examId ?? featuredExamCard.examId,
    },
    recentResultCard,
    recentActivity,
  };
}

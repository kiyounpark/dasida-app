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
      heroBody: `${weaknessLabel}처럼 실전에서 흔들리기 쉬운 부분을 오늘 짧게 다시 붙잡아볼 차례예요.`,
      heroMeta: `${nextReviewTask.stage.toUpperCase()} · ${weaknessLabel}`,
    };
  }

  if (profile.latestDiagnosticSummary?.topWeaknesses[0]) {
    const weaknessLabel = diagnosisMap[profile.latestDiagnosticSummary.topWeaknesses[0]].labelKo;
    return {
      hero: 'diagnostic',
      heroTitle: '빠른 재진단 10문제',
      heroBody: `${weaknessLabel}처럼 흔들린 부분을 가볍게 다시 점검하고 다음 복습 방향까지 바로 이어볼 수 있어요.`,
      heroMeta: `최근 약점 · ${weaknessLabel}`,
    };
  }

  return {
    hero: 'diagnostic',
    heroTitle: '3분 체험 10문제',
    heroBody: '빠르게 약점을 찾고, 바로 복습 방향까지 보여줘요.',
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
      title: hero === 'review' ? '지금 같이 이어가는 학생들' : '이렇게 다시 보는 학생들이 있어요',
      peers: peerPresenceSnapshot.peers,
    };
  }

  if (hero === 'review') {
    return {
      mode: 'fallback',
      title: '짧게 다시 보는 습관이 실전에서 흔들림을 줄여줘요',
      subtitle: '오늘 할 약점 1개만 다시 보면서 감각을 붙여보세요.',
    };
  }

  return {
    mode: 'fallback',
    title: '틀린 문제를 그냥 넘기면 같은 실수가 반복돼요',
    subtitle: 'DASIDA는 오답을 약점으로 정리하고 다시 보게 해줍니다.',
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
      body: '이어 풀 수 있는 실전 세트가 준비되어 있어요.',
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
    body: '실전 감각을 붙일 대표 세트를 준비해두었습니다.',
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
      body: `${diagnosisMap[weaknessId].labelKo}처럼 자주 흔들린 부분을 다시 볼 수 있어요.`,
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
          : '오답 분석 없음',
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

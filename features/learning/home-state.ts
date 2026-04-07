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

import type { LearnerSummaryCurrent, PeerPresenceSnapshot, ReviewTask, WeaknessProgressItem } from './types';

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
  weaknessProgressItems: WeaknessProgressItem[];
  resolvedWeaknessHistory: Array<{ weekLabel: string; count: number }>;
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

function buildWeaknessProgressItems(
  summary: LearnerSummaryCurrent,
  allReviewTasks: ReviewTask[],
): WeaknessProgressItem[] {
  // 활성 태스크 (미완료) 먼저, stage 높은 순
  const activeTasks = allReviewTasks
    .filter((t) => !t.completed)
    .sort((a, b) => {
      const stageOrder: Record<string, number> = { day30: 4, day7: 3, day3: 2, day1: 1 };
      return (stageOrder[b.stage] ?? 0) - (stageOrder[a.stage] ?? 0);
    });

  // 완료된 day30 태스크, 최근 완료 순
  const completedTasks = allReviewTasks
    .filter((t) => t.completed && t.stage === 'day30')
    .sort((a, b) => {
      const aAt = a.completedAt ?? '';
      const bAt = b.completedAt ?? '';
      return bAt.localeCompare(aAt);
    });

  const combined = [...activeTasks, ...completedTasks];

  // 중복 weaknessId 제거 (같은 약점의 첫 번째 태스크만 유지)
  const seen = new Set<string>();
  const deduped = combined.filter((t) => {
    if (seen.has(t.weaknessId)) return false;
    seen.add(t.weaknessId);
    return true;
  });

  return deduped.slice(0, 3).map((t) => ({
    weaknessId: t.weaknessId,
    topicLabel: diagnosisMap[t.weaknessId].topicLabel,
    weaknessLabel: diagnosisMap[t.weaknessId].labelKo,
    stage: t.stage,
    completed: t.completed,
  }));
}

function buildResolvedWeaknessHistory(
  allReviewTasks: ReviewTask[],
): Array<{ weekLabel: string; count: number }> {
  const resolvedTasks = allReviewTasks.filter(
    (t) => t.completed && t.stage === 'day30' && t.completedAt,
  );

  if (resolvedTasks.length === 0) {
    return [{ weekLabel: '1주차', count: 0 }];
  }

  // 가장 이른 완료 날짜 기준으로 주차 계산
  const sortedByDate = [...resolvedTasks].sort((a, b) =>
    (a.completedAt ?? '').localeCompare(b.completedAt ?? ''),
  );
  const firstCompletedAt = new Date(sortedByDate[0].completedAt!);

  // 주차별 집계 (누적 아님, 주차별 count)
  const weekCounts: Record<number, number> = {};
  for (const task of resolvedTasks) {
    const completedAt = new Date(task.completedAt!);
    const diffMs = completedAt.getTime() - firstCompletedAt.getTime();
    const weekIndex = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    weekCounts[weekIndex] = (weekCounts[weekIndex] ?? 0) + 1;
  }

  // 최근 3주 포인트 생성 (누적 count)
  const maxWeek = Math.max(...Object.keys(weekCounts).map(Number));
  const startWeek = Math.max(0, maxWeek - 2);

  let cumulative = 0;
  // startWeek 이전의 count 누적
  for (const [weekStr, cnt] of Object.entries(weekCounts)) {
    if (Number(weekStr) < startWeek) {
      cumulative += cnt;
    }
  }

  const points: Array<{ weekLabel: string; count: number }> = [];
  for (let w = startWeek; w <= maxWeek; w++) {
    cumulative += weekCounts[w] ?? 0;
    const label = w === maxWeek ? '지금' : `${w + 1}주차`;
    points.push({ weekLabel: label, count: cumulative });
  }

  return points.slice(-3);
}

export function buildHomeLearningState(
  _profile: LearnerProfile,
  summary: LearnerSummaryCurrent,
  peerPresenceSnapshot: PeerPresenceSnapshot | null = null,
  allReviewTasks: ReviewTask[] = [],
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
    weaknessProgressItems: buildWeaknessProgressItems(summary, allReviewTasks),
    resolvedWeaknessHistory: buildResolvedWeaknessHistory(allReviewTasks),
  };
}

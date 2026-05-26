import { router } from 'expo-router';

import { WeaknessDetailScreenView } from '@/features/quiz/components/weakness-detail-screen-view';
import type { WeaknessAppearance } from '@/features/learning/types';

const APPEARANCES: WeaknessAppearance[] = [
  {
    attemptId: 'mock-1',
    source: 'featured-exam',
    sourceLabel: '2026 3월 학평 30번',
    attemptedAt: '2026-05-08T05:00:00.000Z',
  },
  {
    attemptId: 'mock-2',
    source: 'featured-exam',
    sourceLabel: '2026 4월 학평 21번',
    attemptedAt: '2026-05-15T05:00:00.000Z',
  },
  {
    attemptId: 'mock-3',
    source: 'diagnostic',
    sourceLabel: '오답 진단 · 미분 8번',
    attemptedAt: '2026-05-22T05:00:00.000Z',
  },
];

export default function CaptureWeaknessScreen() {
  return (
    <WeaknessDetailScreenView
      loading={false}
      notFound={false}
      item={{
        weaknessId: 'solving_order_confusion',
        topicLabel: '미분',
        weaknessLabel: '풀이 순서 혼동',
        stage: 'day3',
        completed: false,
        diagnosticAccuracy: 0.4,
        reviewAccuracyByStage: { day1: 0.55, day3: 0.72 },
        recentAppearanceCount: 4,
        severity: 'frequent',
        appearances: APPEARANCES,
      }}
      appearances={APPEARANCES}
      onPracticeNow={() => {}}
      onBack={() => router.replace('/dev')}
    />
  );
}

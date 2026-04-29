import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import type { WeaknessId } from '@/data/diagnosisMap';
import { useCurrentLearner } from '@/features/learner/provider';
import type {
  LearningAttempt,
  WeaknessAppearance,
  WeaknessProgressItem,
} from '@/features/learning/types';
import { buildWeaknessAppearances } from '@/features/learning/weakness-appearances';

export type UseWeaknessDetailScreenParams = {
  weaknessId: string | undefined;
};

export type UseWeaknessDetailScreenResult = {
  loading: boolean;
  notFound: boolean;
  item: WeaknessProgressItem | null;
  appearances: WeaknessAppearance[];
  onPracticeNow: () => void;
  onBack: () => void;
};

export function useWeaknessDetailScreen(
  params: UseWeaknessDetailScreenParams,
): UseWeaknessDetailScreenResult {
  const { homeState, loadRecentAttempts } = useCurrentLearner();
  const [appearances, setAppearances] = useState<WeaknessAppearance[]>([]);
  // weaknessId가 없으면 useFocusEffect가 early return하여 setLoading(false)가 호출되지 않으므로 초기값을 false로 설정
  const [loading, setLoading] = useState(params.weaknessId != null);

  const weaknessId = params.weaknessId as WeaknessId | undefined;
  const item =
    weaknessId == null
      ? null
      : homeState?.weaknessProgressItems.find((i) => i.weaknessId === weaknessId) ?? null;

  useEffect(() => {
    if (homeState != null && weaknessId != null && item == null) {
      router.replace('/(tabs)/quiz');
    }
  }, [homeState, weaknessId, item]);

  useFocusEffect(
    useCallback(() => {
      if (weaknessId == null) return;
      let cancelled = false;
      (async () => {
        setLoading(true);
        try {
          // 상세 화면은 홈(limit 10)보다 넓은 범위로 로드해 등장 기록을 풍부하게 표시
          const [diagnostic, exam] = await Promise.all([
            loadRecentAttempts({ source: 'diagnostic', limit: 50 }),
            loadRecentAttempts({ source: 'featured-exam', limit: 50 }),
          ]);
          if (cancelled) return;
          const all: LearningAttempt[] = [...diagnostic, ...exam];
          setAppearances(buildWeaknessAppearances(weaknessId, all));
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [weaknessId, loadRecentAttempts]),
  );

  const onPracticeNow = useCallback(() => {
    if (weaknessId == null) return;
    router.push({
      pathname: '/quiz/practice',
      params: { weaknessId },
    });
  }, [weaknessId]);

  const onBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/quiz');
  }, []);

  return {
    loading,
    notFound: homeState != null && weaknessId != null && item == null,
    item,
    appearances,
    onPracticeNow,
    onBack,
  };
}

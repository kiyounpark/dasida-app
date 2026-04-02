import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import type { HomeJourneyState } from '@/features/learning/home-journey-state';
import { useCurrentLearner } from '@/features/learner/provider';
import { useQuizSession } from '@/features/quiz/session';

type CurrentLearnerSnapshot = ReturnType<typeof useCurrentLearner>;

export type UseQuizHubScreenResult = {
  authNoticeMessage: string | null;
  homeState: CurrentLearnerSnapshot['homeState'];
  isCompactLayout: boolean;
  isReady: CurrentLearnerSnapshot['isReady'];
  journey: HomeJourneyState | null;
  onDismissAuthNotice: () => void;
  onOpenPractice: () => void;
  onOpenRecentResult: () => void;
  onPressJourneyCta: () => void;
  onRefresh: CurrentLearnerSnapshot['refresh'];
  onStartDiagnostic: () => void;
  profile: CurrentLearnerSnapshot['profile'];
  session: CurrentLearnerSnapshot['session'];
};

export function useQuizHubScreen(): UseQuizHubScreenResult {
  const { height, width } = useWindowDimensions();
  const {
    authNoticeMessage,
    dismissAuthNotice,
    homeState,
    isReady,
    profile,
    refresh,
    session,
  } = useCurrentLearner();
  const { resetSession } = useQuizSession();
  const [localAuthNoticeMessage, setLocalAuthNoticeMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authNoticeMessage) {
      return;
    }

    setLocalAuthNoticeMessage(authNoticeMessage);
    dismissAuthNotice();
  }, [authNoticeMessage, dismissAuthNotice]);

  const onStartDiagnostic = () => {
    resetSession();
    router.push({
      pathname: '/quiz/diagnostic',
      params: { autostart: '1' },
    });
  };

  const onOpenPractice = () => {
    if (!homeState) {
      return;
    }

    if (homeState.todayReviewCount > 0) {
      router.push({ pathname: '/quiz/practice', params: { mode: 'review' } });
      return;
    }

    router.push({ pathname: '/quiz/practice', params: { mode: 'weakness' } });
  };

  const onOpenRecentResult = () => {
    if (!homeState?.recentResultCard.enabled) {
      return;
    }

    router.push({
      pathname: '/quiz/result',
      params: { source: 'snapshot' },
    });
  };

  const onPressJourneyCta = () => {
    const action = homeState?.journey.ctaAction;

    if (!action) {
      return;
    }

    switch (action) {
      case 'open_result':
        onOpenRecentResult();
        return;
      case 'open_review':
        onOpenPractice();
        return;
      default:
        onStartDiagnostic();
    }
  };

  return {
    authNoticeMessage: localAuthNoticeMessage,
    homeState,
    isCompactLayout: width < 390 || height < 780,
    isReady,
    journey: homeState?.journey ?? null,
    onDismissAuthNotice: () => {
      setLocalAuthNoticeMessage(null);
    },
    onOpenPractice,
    onOpenRecentResult,
    onPressJourneyCta,
    onRefresh: refresh,
    onStartDiagnostic,
    profile,
    session,
  };
}

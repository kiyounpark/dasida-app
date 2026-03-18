import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import { useCurrentLearner } from '@/features/learner/provider';
import { useQuizSession } from '@/features/quiz/session';

type CurrentLearnerSnapshot = ReturnType<typeof useCurrentLearner>;

export type UseQuizHubScreenResult = {
  authNoticeMessage: string | null;
  homeState: CurrentLearnerSnapshot['homeState'];
  isCompactLayout: boolean;
  isReady: CurrentLearnerSnapshot['isReady'];
  onDismissAuthNotice: () => void;
  onOpenExams: () => void;
  onOpenPractice: () => void;
  onOpenRecentResult: () => void;
  onRefresh: CurrentLearnerSnapshot['refresh'];
  onStartDiagnostic: () => void;
  profile: CurrentLearnerSnapshot['profile'];
  session: CurrentLearnerSnapshot['session'];
};

export function useQuizHubScreen(): UseQuizHubScreenResult {
  const { width } = useWindowDimensions();
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
    if (!homeState || homeState.hero !== 'review' || homeState.todayReviewCount === 0) {
      return;
    }

    router.push({
      pathname: '/quiz/practice',
      params: {
        mode: 'review',
      },
    });
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

  const onOpenExams = () => {
    router.push('/quiz/exams');
  };

  return {
    authNoticeMessage: localAuthNoticeMessage,
    homeState,
    isCompactLayout: width < 390,
    isReady,
    onDismissAuthNotice: () => {
      setLocalAuthNoticeMessage(null);
    },
    onOpenExams,
    onOpenPractice,
    onOpenRecentResult,
    onRefresh: refresh,
    onStartDiagnostic,
    profile,
    session,
  };
}

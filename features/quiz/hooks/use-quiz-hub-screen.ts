import { router } from 'expo-router';
import { useWindowDimensions } from 'react-native';

import { useCurrentLearner } from '@/features/learner/provider';
import { useQuizSession } from '@/features/quiz/session';

type CurrentLearnerSnapshot = ReturnType<typeof useCurrentLearner>;

export type UseQuizHubScreenResult = {
  homeState: CurrentLearnerSnapshot['homeState'];
  isCompactLayout: boolean;
  isReady: CurrentLearnerSnapshot['isReady'];
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
  const { isReady, session, profile, homeState, refresh } = useCurrentLearner();
  const { resetSession } = useQuizSession();

  const onStartDiagnostic = () => {
    resetSession();
    router.push({
      pathname: '/quiz/diagnostic',
      params: { autostart: '1' },
    });
  };

  const onOpenPractice = () => {
    const weaknessId = homeState?.nextReviewTask?.weaknessId;
    if (!weaknessId) {
      return;
    }

    router.push({
      pathname: '/quiz/practice',
      params: {
        mode: 'weakness',
        weaknessId,
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
    homeState,
    isCompactLayout: width < 390,
    isReady,
    onOpenExams,
    onOpenPractice,
    onOpenRecentResult,
    onRefresh: refresh,
    onStartDiagnostic,
    profile,
    session,
  };
}

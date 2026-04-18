// features/quiz/hooks/use-step-complete-screen.ts
import { useCallback } from 'react';
import { router } from 'expo-router';

import { useCurrentLearner } from '@/features/learner/provider';
import { useQuizSession } from '@/features/quiz/session';

export type StepCompleteKey = 'diagnostic' | 'analysis' | 'practice';

export type UseStepCompleteScreenResult = {
  stepKey: StepCompleteKey;
  onContinue: () => void;
};

export function useStepCompleteScreen(
  stepKey: StepCompleteKey,
): UseStepCompleteScreenResult {
  const { resetSession } = useQuizSession();
  const { graduateToPractice } = useCurrentLearner();

  const onContinue = useCallback(() => {
    if (stepKey === 'diagnostic') {
      router.back();
      return;
    }

    if (stepKey === 'analysis') {
      router.replace('/quiz/result');
      return;
    }

    // practice: 졸업 처리 후 홈으로 이동
    void graduateToPractice()
      .then(() => {
        resetSession();
        router.replace('/(tabs)/quiz');
      })
      .catch(console.warn);
  }, [stepKey, resetSession, graduateToPractice]);

  return { stepKey, onContinue };
}

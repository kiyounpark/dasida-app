// features/quiz/hooks/use-step-complete-screen.ts
import { useCallback, useState } from 'react';
import { router } from 'expo-router';

import { useCurrentLearner } from '@/features/learner/provider';
import { useQuizSession } from '@/features/quiz/session';

export type StepCompleteKey = 'diagnostic' | 'analysis' | 'practice';

export type UseStepCompleteScreenResult = {
  stepKey: StepCompleteKey;
  onContinue: () => void;
  onDismiss: (() => void) | undefined;
  isGraduating: boolean;
};

export function useStepCompleteScreen(
  stepKey: StepCompleteKey,
): UseStepCompleteScreenResult {
  const { resetSession } = useQuizSession();
  const { graduateToPractice } = useCurrentLearner();
  const [isGraduating, setIsGraduating] = useState(false);

  const onContinue = useCallback(() => {
    if (stepKey === 'diagnostic') {
      router.back();
      return;
    }

    if (stepKey === 'analysis') {
      router.replace('/quiz/result');
      return;
    }

    // practice: 졸업 처리 후 홈으로 이동 (중복 호출 방지)
    if (isGraduating) return;
    setIsGraduating(true);
    void graduateToPractice()
      .then(() => {
        resetSession();
        router.replace('/(tabs)/quiz');
      })
      .catch((err) => {
        console.warn('[StepComplete] graduateToPractice failed', err);
        setIsGraduating(false);
        // 졸업 저장 실패해도 홈으로 이동 — quiz-hub에서 재시도 가능
        resetSession();
        router.replace('/(tabs)/quiz');
      });
  }, [stepKey, isGraduating, resetSession, graduateToPractice]);

  const onDismissCallback = useCallback(() => {
    router.back();
  }, []);

  const onDismiss: (() => void) | undefined =
    stepKey === 'practice' ? onDismissCallback : undefined;

  return { stepKey, onContinue, onDismiss, isGraduating };
}

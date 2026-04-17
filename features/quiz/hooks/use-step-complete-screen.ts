// features/quiz/hooks/use-step-complete-screen.ts
import { useCallback } from 'react';
import { router } from 'expo-router';

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

  const onContinue = useCallback(() => {
    if (stepKey === 'diagnostic') {
      // 진단 화면으로 돌아가서 isDiagnosing UI 표시
      router.back();
      return;
    }

    if (stepKey === 'analysis') {
      // 약점 결과 화면으로 이동
      router.replace('/quiz/result');
      return;
    }

    // practice: 세션 초기화 후 여정 보드(홈)로 이동
    resetSession();
    router.replace('/(tabs)/quiz');
  }, [stepKey, resetSession]);

  return { stepKey, onContinue };
}

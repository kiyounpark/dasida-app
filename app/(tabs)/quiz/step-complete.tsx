// app/(tabs)/quiz/step-complete.tsx
import { useLocalSearchParams } from 'expo-router';

import StepCompleteScreen from '@/features/quiz/screens/step-complete-screen';
import type { StepCompleteKey } from '@/features/quiz/hooks/use-step-complete-screen';
import { getSingleParam } from '@/utils/get-single-param';

const VALID_STEPS: StepCompleteKey[] = ['diagnostic', 'analysis', 'practice'];

function isValidStep(value: string | undefined): value is StepCompleteKey {
  return VALID_STEPS.includes(value as StepCompleteKey);
}

export default function StepCompleteRoute() {
  const params = useLocalSearchParams();
  const step = getSingleParam(params.step);

  if (!isValidStep(step)) {
    return <StepCompleteScreen stepKey="diagnostic" />;
  }

  return <StepCompleteScreen stepKey={step} />;
}

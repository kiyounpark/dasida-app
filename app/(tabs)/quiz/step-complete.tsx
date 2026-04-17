import { useLocalSearchParams } from 'expo-router';

import { StepCompleteScreenView } from '@/features/quiz/components/step-complete-screen-view';
import {
  useStepCompleteScreen,
  type StepCompleteKey,
} from '@/features/quiz/hooks/use-step-complete-screen';
import { getSingleParam } from '@/utils/get-single-param';

export default function StepCompleteScreen() {
  const params = useLocalSearchParams();
  const stepKey = (getSingleParam(params.step) ?? 'practice') as StepCompleteKey;
  const { onContinue } = useStepCompleteScreen(stepKey);

  return <StepCompleteScreenView stepKey={stepKey} onContinue={onContinue} />;
}

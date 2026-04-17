// features/quiz/screens/step-complete-screen.tsx
import { StepCompleteScreenView } from '@/features/quiz/components/step-complete-screen-view';
import {
  type StepCompleteKey,
  useStepCompleteScreen,
} from '@/features/quiz/hooks/use-step-complete-screen';

type Props = {
  stepKey: StepCompleteKey;
};

export default function StepCompleteScreen({ stepKey }: Props) {
  const screen = useStepCompleteScreen(stepKey);

  return <StepCompleteScreenView {...screen} />;
}

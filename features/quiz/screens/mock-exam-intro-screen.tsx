import { MockExamIntroScreenView } from '@/features/quiz/components/mock-exam-intro-screen-view';
import { useMockExamIntroScreen } from '@/features/quiz/hooks/use-mock-exam-intro-screen';

export default function MockExamIntroScreen() {
  const screen = useMockExamIntroScreen();
  return <MockExamIntroScreenView {...screen} />;
}

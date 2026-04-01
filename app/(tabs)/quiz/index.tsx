import { useCurrentLearner } from '@/features/learner/provider';
import MockExamIntroScreen from '@/features/quiz/screens/mock-exam-intro-screen';
import QuizHubScreen from '@/features/quiz/screens/quiz-hub-screen';

export default function QuizHubRoute() {
  const { isReady, profile } = useCurrentLearner();

  if (!isReady) {
    return <QuizHubScreen />;
  }

  if (profile?.practiceGraduatedAt) {
    return <MockExamIntroScreen />;
  }

  return <QuizHubScreen />;
}

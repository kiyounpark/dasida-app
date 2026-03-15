import { QuizHubScreenView } from '@/features/quiz/components/quiz-hub-screen-view';
import { useQuizHubScreen } from '@/features/quiz/hooks/use-quiz-hub-screen';

export default function QuizHubScreen() {
  const screen = useQuizHubScreen();

  return <QuizHubScreenView {...screen} />;
}

import { QuizPracticeScreenView } from '@/features/quiz/components/quiz-practice-screen-view';
import {
  type QuizPracticeRouteParams,
  usePracticeScreen,
} from '@/features/quiz/hooks/use-practice-screen';

export default function QuizPracticeScreen(params: QuizPracticeRouteParams) {
  const screen = usePracticeScreen(params);

  return <QuizPracticeScreenView {...screen} />;
}

import { QuizResultScreenView } from '@/features/quiz/components/quiz-result-screen-view';
import {
  type QuizResultRouteParams,
  useResultScreen,
} from '@/features/quiz/hooks/use-result-screen';

export default function QuizResultScreen(params: QuizResultRouteParams) {
  const screen = useResultScreen(params);

  return <QuizResultScreenView {...screen} />;
}

import { ExamSelectionScreenView } from '@/features/quiz/components/exam-selection-screen-view';
import { useExamSelectionScreen } from '@/features/quiz/hooks/use-exam-selection-screen';

export default function ExamSelectionScreen() {
  const screen = useExamSelectionScreen();

  return <ExamSelectionScreenView {...screen} />;
}

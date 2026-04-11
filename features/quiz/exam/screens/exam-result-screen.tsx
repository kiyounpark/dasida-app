import { ExamResultScreenView } from './exam-result-screen-view';
import { useExamResultScreen } from '../hooks/use-exam-result-screen';

export function ExamResultScreen() {
  const hook = useExamResultScreen();

  if (!hook.result) return null;

  return <ExamResultScreenView {...hook} result={hook.result} />;
}

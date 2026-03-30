import { ExamResultScreenView } from './exam-result-screen-view';
import { useExamResultScreen } from '../hooks/use-exam-result-screen';

export function ExamResultScreen() {
  const { result, examTitle, saveState, onStartDiagnostic, onReturnHome } =
    useExamResultScreen();

  if (!result) return null;

  return (
    <ExamResultScreenView
      result={result}
      examTitle={examTitle}
      saveState={saveState}
      onStartDiagnostic={onStartDiagnostic}
      onReturnHome={onReturnHome}
    />
  );
}

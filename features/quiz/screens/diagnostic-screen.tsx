import { DiagnosticScreenView } from '@/features/quiz/components/diagnostic-screen-view';
import { useDiagnosticScreen } from '@/features/quiz/hooks/use-diagnostic-screen';

type DiagnosticScreenProps = {
  shouldAutoStart: boolean;
  shouldResetOnMount: boolean;
};

export default function DiagnosticScreen({
  shouldAutoStart,
  shouldResetOnMount,
}: DiagnosticScreenProps) {
  const screen = useDiagnosticScreen({ shouldAutoStart, shouldResetOnMount });

  return <DiagnosticScreenView {...screen} />;
}

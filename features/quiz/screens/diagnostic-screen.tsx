import { DiagnosticScreenView } from '@/features/quiz/components/diagnostic-screen-view';
import { useDiagnosticScreen } from '@/features/quiz/hooks/use-diagnostic-screen';

type DiagnosticScreenProps = {
  shouldAutoStart: boolean;
};

export default function DiagnosticScreen({ shouldAutoStart }: DiagnosticScreenProps) {
  const screen = useDiagnosticScreen({ shouldAutoStart });

  return <DiagnosticScreenView {...screen} />;
}

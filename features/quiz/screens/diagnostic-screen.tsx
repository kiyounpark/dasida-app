import { DiagnosticScreenView } from '@/features/quiz/components/diagnostic-screen-view';

type DiagnosticScreenProps = {
  shouldAutoStart: boolean;
};

export default function DiagnosticScreen({ shouldAutoStart }: DiagnosticScreenProps) {
  return <DiagnosticScreenView shouldAutoStart={shouldAutoStart} />;
}

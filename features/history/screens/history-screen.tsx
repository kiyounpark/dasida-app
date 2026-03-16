import { HistoryScreenView } from '@/features/history/components/history-screen-view';
import { useHistoryScreen } from '@/features/history/hooks/use-history-screen';

export default function HistoryScreen() {
  const screen = useHistoryScreen();

  return <HistoryScreenView {...screen} />;
}

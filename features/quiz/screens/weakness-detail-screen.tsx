import { WeaknessDetailScreenView } from '@/features/quiz/components/weakness-detail-screen-view';
import { useWeaknessDetailScreen } from '@/features/quiz/hooks/use-weakness-detail-screen';

export default function WeaknessDetailScreen({
  weaknessId,
}: {
  weaknessId: string | undefined;
}) {
  const screen = useWeaknessDetailScreen({ weaknessId });
  return <WeaknessDetailScreenView {...screen} />;
}

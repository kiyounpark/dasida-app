import { useLocalSearchParams } from 'expo-router';

import WeaknessDetailScreen from '@/features/quiz/screens/weakness-detail-screen';
import { getSingleParam } from '@/utils/get-single-param';

export default function WeaknessDetailRoute() {
  const params = useLocalSearchParams();
  const weaknessId = getSingleParam(params.weaknessId);

  return <WeaknessDetailScreen weaknessId={weaknessId} />;
}

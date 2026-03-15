import { useLocalSearchParams } from 'expo-router';

import DiagnosticScreen from '@/features/quiz/screens/diagnostic-screen';
import { getSingleParam } from '@/utils/get-single-param';

export default function DiagnosticRoute() {
  const params = useLocalSearchParams();

  return <DiagnosticScreen shouldAutoStart={getSingleParam(params.autostart) === '1'} />;
}

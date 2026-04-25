import { useLocalSearchParams } from 'expo-router';

import QuizResultScreen from '@/features/quiz/screens/quiz-result-screen';
import { getSingleParam } from '@/utils/get-single-param';

export default function QuizResultRoute() {
  const params = useLocalSearchParams();

  return (
    <QuizResultScreen
      legacyNextStep={getSingleParam(params.nextStep)}
      requestedSource={getSingleParam(params.source)}
      legacyWeaknessKey={
        getSingleParam(params.weaknessId) ?? getSingleParam(params.weakTag)
      }
    />
  );
}

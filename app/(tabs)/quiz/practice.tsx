import { useLocalSearchParams } from 'expo-router';

import QuizPracticeScreen from '@/features/quiz/screens/quiz-practice-screen';
import { getSingleParam } from '@/utils/get-single-param';

export default function QuizPracticeRoute() {
  const params = useLocalSearchParams();

  return (
    <QuizPracticeScreen
      requestedMode={getSingleParam(params.mode)}
      fallbackWeaknessKey={
        getSingleParam(params.weaknessId) ?? getSingleParam(params.weakTag)
      }
    />
  );
}

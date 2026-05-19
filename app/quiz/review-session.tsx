// app/(tabs)/quiz/review-session.tsx
import { useLocalSearchParams } from 'expo-router';

import { ReviewSessionScreenView } from '@/features/quiz/components/review-session-screen-view';
import { useReviewSessionScreen } from '@/features/quiz/hooks/use-review-session-screen';
import { getSingleParam } from '@/utils/get-single-param';

function ReviewSessionInner() {
  const screen = useReviewSessionScreen();
  return <ReviewSessionScreenView {...screen} />;
}

export default function ReviewSessionRoute() {
  const params = useLocalSearchParams();
  const taskId = getSingleParam(params.taskId) ?? '';
  // taskId가 바뀌면 (체인 자동 진행) 전체를 리마운트해 세션 상태를 초기화한다.
  return <ReviewSessionInner key={taskId} />;
}

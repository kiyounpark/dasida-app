// app/(tabs)/quiz/review-session.tsx
import { ReviewSessionScreenView } from '@/features/quiz/components/review-session-screen-view';
import { useReviewSessionScreen } from '@/features/quiz/hooks/use-review-session-screen';

export default function ReviewSessionRoute() {
  const screen = useReviewSessionScreen();
  return <ReviewSessionScreenView {...screen} />;
}

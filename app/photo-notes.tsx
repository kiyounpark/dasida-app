import { useCurrentLearner } from '@/features/learner/provider';
import { PhotoNotesScreen } from '@/features/photo/screens/photo-notes-screen';

// 지난 오답노트 주소. app/photo.tsx와 같은 방식 — 계정 키를 여기서 집어 내려준다.
export default function PhotoNotesRoute() {
  const { session } = useCurrentLearner();

  return <PhotoNotesScreen accountKey={session?.accountKey ?? null} />;
}

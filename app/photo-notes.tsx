import { useCurrentLearner } from '@/features/learner/provider';
import { PhotoNotesScreen } from '@/features/photo/screens/photo-notes-screen';

// 지난 오답노트 주소. app/photo.tsx와 같은 방식 — 계정 키·헤더 함수를 여기서 집어 내려준다.
// 헤더 함수가 없으면 화면이 서버를 안 부른다(1.0.11 다른 기기 보기·올리기가 꺼진다).
export default function PhotoNotesRoute() {
  const { session, getRemoteAuthHeaders } = useCurrentLearner();

  return <PhotoNotesScreen accountKey={session?.accountKey ?? null} getRemoteAuthHeaders={getRemoteAuthHeaders} />;
}

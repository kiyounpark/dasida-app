import { useCurrentLearner } from '@/features/learner/provider';
import { PhotoFlowScreen } from '@/features/photo/screens/photo-flow-screen';

// 주소만. 화면은 features/photo/에 산다 — 나중에 홈으로 옮길 땐 이 줄만 옮긴다.
// 실기기로 저장까지 확인하려면 여기도 학생용과 같은 키를 내려줘야 한다.
export default function DevPhotoFlowRoute() {
  const { session, reviewTaskStore } = useCurrentLearner();

  return <PhotoFlowScreen accountKey={session?.accountKey ?? null} reviewTaskStore={reviewTaskStore} />;
}

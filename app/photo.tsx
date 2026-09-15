import { useCurrentLearner } from '@/features/learner/provider';
import { PhotoFlowScreen } from '@/features/photo/screens/photo-flow-screen';

// 학생용 주소. 화면은 features/photo/에 산다 (app/dev/photo-flow.tsx와 같은 화면).
// 계정 키를 여기서 집어 내려준다 — 화면·훅이 직접 집으면 프로바이더 없이 그리는 테스트가 전부 죽는다.
export default function PhotoRoute() {
  const { session } = useCurrentLearner();

  return <PhotoFlowScreen accountKey={session?.accountKey ?? null} />;
}

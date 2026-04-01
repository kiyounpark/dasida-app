import { Redirect } from 'expo-router';

import { useCurrentLearner } from '@/features/learner/provider';

export default function IndexRoute() {
  const { authGateState, isReady, profile } = useCurrentLearner();

  if (!isReady || authGateState === 'loading') {
    return null;
  }

  if (authGateState === 'required') {
    return <Redirect href="/sign-in" />;
  }

  // TODO: 개발 완료 후 아래 주석을 해제해 온보딩을 필수로 활성화하세요.
  // 현재는 Expo Go / 개발 환경에서 매번 온보딩을 거치지 않도록 비활성화 상태입니다.
  // if (profile?.grade === 'unknown' || !profile?.nickname) {
  //   return <Redirect href="/onboarding" />;
  // }

  return <Redirect href="/(tabs)/quiz" />;
}

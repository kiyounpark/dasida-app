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

  if (profile?.grade === 'unknown' || !profile?.nickname) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)/quiz" />;
}

import { Redirect } from 'expo-router';

import { useCurrentLearner } from '@/features/learner/provider';

export default function IndexRoute() {
  const { authGateState, isReady } = useCurrentLearner();

  if (!isReady || authGateState === 'loading') {
    return null;
  }

  if (authGateState === 'required') {
    return <Redirect href="/sign-in" />;
  }

  return <Redirect href="/(tabs)/quiz" />;
}

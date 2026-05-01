import { View } from 'react-native';
import { Redirect, Stack } from 'expo-router';

import { useCurrentLearner } from '@/features/learner/provider';

export default function IndexRoute() {
  const { authGateState, isReady, profile } = useCurrentLearner();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {renderContent()}
    </>
  );

  function renderContent() {
    if (!isReady || authGateState === 'loading') {
      return <View style={{ flex: 1, backgroundColor: '#F6F2E7' }} />;
    }
    if (authGateState === 'required') {
      return <Redirect href="/sign-in" />;
    }
    if (profile?.grade === 'unknown' || !profile?.nickname) {
      return <Redirect href="/onboarding" />;
    }
    return <Redirect href="/(tabs)/quiz" />;
  }
}

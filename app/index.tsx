import { View } from 'react-native';
import { Redirect } from 'expo-router';

import { useConsentGate } from '@/features/consent/consent-provider';
import { resolveEntryRoute } from '@/features/consent/consent-route';
import { useCurrentLearner } from '@/features/learner/provider';

export default function IndexRoute() {
  const { authGateState, isReady, profile } = useCurrentLearner();
  const { status: consentStatus } = useConsentGate();
  const target = resolveEntryRoute({ isReady, authGateState, profile, consentStatus });

  if (!target) {
    return <View style={{ flex: 1, backgroundColor: '#F6F2E7' }} />;
  }
  return <Redirect href={target} />;
}

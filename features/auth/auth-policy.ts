import type { SupportedAuthProvider } from './types';

export type AuthGateState = 'loading' | 'required' | 'authenticated' | 'guest-dev';
export type AuthBlockingReason = 'firebase_not_configured' | 'providers_unavailable' | null;

export function isMandatorySocialAuthEnabled() {
  return true;
}

export function canUseDevGuestAuth() {
  return __DEV__;
}

function getProviderOrder(): SupportedAuthProvider[] {
  if (process.env.EXPO_OS === 'ios') {
    return ['apple', 'google'];
  }

  return ['google'];
}

export function getRequiredAuthProviders(availableProviders: SupportedAuthProvider[]) {
  const orderedProviders = getProviderOrder();
  return orderedProviders.filter((provider) => availableProviders.includes(provider));
}

export function getAuthBlockingReason(params: {
  availableProviders: SupportedAuthProvider[];
  isFirebaseAuthConfigured: boolean;
}): AuthBlockingReason {
  if (getRequiredAuthProviders(params.availableProviders).length > 0) {
    return null;
  }

  return params.isFirebaseAuthConfigured ? 'providers_unavailable' : 'firebase_not_configured';
}

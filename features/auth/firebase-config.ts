import {
  expoPublicFirebaseApiKey,
  expoPublicFirebaseAppId,
  expoPublicFirebaseAuthDomain,
  expoPublicFirebaseMessagingSenderId,
  expoPublicFirebaseProjectId,
  expoPublicFirebaseStorageBucket,
  expoPublicGoogleAndroidClientId,
  expoPublicGoogleIosClientId,
  expoPublicGoogleWebClientId,
} from '@/constants/env';

export function isFirebaseAuthConfigured() {
  return Boolean(
    expoPublicFirebaseApiKey &&
      expoPublicFirebaseAppId &&
      expoPublicFirebaseProjectId &&
      expoPublicFirebaseAuthDomain &&
      expoPublicFirebaseMessagingSenderId,
  );
}

export function getFirebaseClientConfig() {
  if (!isFirebaseAuthConfigured()) {
    throw new Error('Firebase Auth is not configured for this build.');
  }

  return {
    apiKey: expoPublicFirebaseApiKey,
    authDomain: expoPublicFirebaseAuthDomain,
    projectId: expoPublicFirebaseProjectId,
    appId: expoPublicFirebaseAppId,
    messagingSenderId: expoPublicFirebaseMessagingSenderId,
    storageBucket: expoPublicFirebaseStorageBucket || undefined,
  };
}

export function getGoogleClientIdForCurrentPlatform() {
  const platform = process.env.EXPO_OS;

  if (platform === 'ios') {
    return expoPublicGoogleIosClientId;
  }

  if (platform === 'android') {
    return expoPublicGoogleAndroidClientId;
  }

  return expoPublicGoogleWebClientId;
}

export function isGoogleAuthConfigured() {
  return Boolean(getGoogleClientIdForCurrentPlatform());
}

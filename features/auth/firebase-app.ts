import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';

import { useFirebaseEmulator } from '@/constants/env';
import { getFirebaseClientConfig } from './firebase-config';

let cachedFirebaseAuth: Auth | null = null;

function getOrCreateFirebaseApp() {
  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(getFirebaseClientConfig());
}

export function getFirebaseAuthInstance() {
  if (cachedFirebaseAuth) {
    return cachedFirebaseAuth;
  }

  const app = getOrCreateFirebaseApp();

  try {
    cachedFirebaseAuth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage) as never,
    });
  } catch {
    cachedFirebaseAuth = getAuth(app);
  }

  // 에뮬레이터 연결 (한 번만 — cachedFirebaseAuth 생성 직후)
  if (useFirebaseEmulator) {
    connectAuthEmulator(cachedFirebaseAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }

  return cachedFirebaseAuth;
}

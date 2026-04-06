import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';

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

  return cachedFirebaseAuth;
}

import AsyncStorage from '@react-native-async-storage/async-storage';

import { StorageKeys } from '@/constants/storage-keys';

import type { AuthClient } from './auth-client';
import type { AuthSession, SupportedAuthProvider } from './types';

const supportedProviders: SupportedAuthProvider[] = ['apple', 'google', 'kakao'];

function createRandomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function createSessionSecret() {
  const cryptoApi = globalThis.crypto as
    | {
        randomUUID?: () => string;
      }
    | undefined;

  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID().replace(/-/g, '');
  }

  return Array.from({ length: 4 }, () => `${createRandomId()}${Math.random().toString(36).slice(2, 10)}`).join(
    '',
  );
}

function createAnonymousSession(subject = createRandomId()): AuthSession {
  const timestamp = new Date().toISOString();

  return {
    status: 'anonymous',
    identity: {
      provider: 'anonymous',
      subject,
    },
    accountKey: `anon:${subject}`,
    requestSecret: createSessionSecret(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export class LocalAnonymousAuthClient implements AuthClient {
  async loadSession(): Promise<AuthSession | null> {
    const rawValue = await AsyncStorage.getItem(StorageKeys.authSession);
    if (!rawValue) {
      return null;
    }

    try {
      const parsedSession = JSON.parse(rawValue) as Partial<AuthSession>;
      if (
        !parsedSession ||
        typeof parsedSession.accountKey !== 'string' ||
        !parsedSession.identity ||
        typeof parsedSession.identity.subject !== 'string'
      ) {
        return null;
      }

      if (typeof parsedSession.requestSecret === 'string' && parsedSession.requestSecret.length > 0) {
        return parsedSession as AuthSession;
      }

      const migratedSession: AuthSession = {
        ...(parsedSession as Omit<AuthSession, 'requestSecret'>),
        requestSecret: createSessionSecret(),
      };
      await AsyncStorage.setItem(StorageKeys.authSession, JSON.stringify(migratedSession));
      return migratedSession;
    } catch {
      return null;
    }
  }

  async ensureAnonymousSession(): Promise<AuthSession> {
    const existingSession = await this.loadSession();
    if (existingSession) {
      return existingSession;
    }

    const anonymousSession = createAnonymousSession();
    await AsyncStorage.setItem(StorageKeys.authSession, JSON.stringify(anonymousSession));
    return anonymousSession;
  }

  async signIn(): Promise<AuthSession> {
    throw new Error('Social sign-in is not implemented yet.');
  }

  async signOut(): Promise<AuthSession> {
    const nextSession = createAnonymousSession();
    await AsyncStorage.setItem(StorageKeys.authSession, JSON.stringify(nextSession));
    return nextSession;
  }

  getSupportedProviders(): SupportedAuthProvider[] {
    return supportedProviders;
  }
}

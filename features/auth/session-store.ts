import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { StorageKeys } from '@/constants/storage-keys';

import type {
  AnonymousAuthSession,
  AuthSession,
  AuthenticatedAuthSession,
  SupportedAuthProvider,
} from './types';

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

function getAnonymousSessionSecretAsyncStorageKey(accountKey: string) {
  return `${StorageKeys.authSessionSecretPrefix}${accountKey}`;
}

function encodeSecureStoreKeySegment(value: string) {
  return Array.from(value)
    .map((character) => character.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');
}

function getAnonymousSessionSecretSecureStoreKey(accountKey: string) {
  return `dasida.auth.session_secret.${encodeSecureStoreKeySegment(accountKey)}`;
}

async function readAnonymousSessionSecret(accountKey: string) {
  const secureStorageKey = getAnonymousSessionSecretSecureStoreKey(accountKey);
  const asyncStorageKey = getAnonymousSessionSecretAsyncStorageKey(accountKey);

  try {
    if (await SecureStore.isAvailableAsync()) {
      const secureValue = await SecureStore.getItemAsync(secureStorageKey);
      if (typeof secureValue === 'string' && secureValue.length > 0) {
        return secureValue;
      }
    }
  } catch {
    // Fall back to AsyncStorage if SecureStore access fails on a given platform or key format.
  }

  const fallbackValue = await AsyncStorage.getItem(asyncStorageKey);
  return typeof fallbackValue === 'string' && fallbackValue.length > 0 ? fallbackValue : null;
}

async function writeAnonymousSessionSecret(accountKey: string, requestSecret: string) {
  const secureStorageKey = getAnonymousSessionSecretSecureStoreKey(accountKey);
  const asyncStorageKey = getAnonymousSessionSecretAsyncStorageKey(accountKey);

  try {
    if (await SecureStore.isAvailableAsync()) {
      await SecureStore.setItemAsync(secureStorageKey, requestSecret);
      await AsyncStorage.removeItem(asyncStorageKey);
      return;
    }
  } catch {
    // Fall through to AsyncStorage if SecureStore access fails on a given platform or key format.
  }

  await AsyncStorage.setItem(asyncStorageKey, requestSecret);
}

function isSupportedProvider(value: unknown): value is SupportedAuthProvider {
  return value === 'apple' || value === 'google';
}

async function normalizeAnonymousSession(
  input: Partial<AnonymousAuthSession> & {
    accountKey?: unknown;
    createdAt?: unknown;
    provider?: unknown;
    requestSecret?: unknown;
    status?: unknown;
    subject?: unknown;
    updatedAt?: unknown;
  },
): Promise<AnonymousAuthSession | null> {
  if (input.status !== 'anonymous' || input.provider !== 'anonymous') {
    return null;
  }

  if (
    typeof input.accountKey !== 'string' ||
    typeof input.subject !== 'string'
  ) {
    return null;
  }

  const requestSecret =
    typeof input.requestSecret === 'string' && input.requestSecret.length > 0
      ? input.requestSecret
      : await readAnonymousSessionSecret(input.accountKey);
  if (!requestSecret) {
    return null;
  }

  const createdAt = typeof input.createdAt === 'string' ? input.createdAt : new Date().toISOString();
  const updatedAt = typeof input.updatedAt === 'string' ? input.updatedAt : createdAt;

  return {
    status: 'anonymous',
    provider: 'anonymous',
    accountKey: input.accountKey,
    subject: input.subject,
    requestSecret,
    createdAt,
    updatedAt,
  };
}

function normalizeAuthenticatedSession(
  input: Partial<AuthenticatedAuthSession> & {
    accountKey?: unknown;
    createdAt?: unknown;
    displayName?: unknown;
    email?: unknown;
    firebaseUid?: unknown;
    provider?: unknown;
    status?: unknown;
    updatedAt?: unknown;
  },
): AuthenticatedAuthSession | null {
  if (input.status !== 'authenticated' || !isSupportedProvider(input.provider)) {
    return null;
  }

  if (typeof input.accountKey !== 'string' || typeof input.firebaseUid !== 'string') {
    return null;
  }

  const createdAt = typeof input.createdAt === 'string' ? input.createdAt : new Date().toISOString();
  const updatedAt = typeof input.updatedAt === 'string' ? input.updatedAt : createdAt;

  return {
    status: 'authenticated',
    provider: input.provider,
    accountKey: input.accountKey,
    firebaseUid: input.firebaseUid,
    displayName: typeof input.displayName === 'string' ? input.displayName : undefined,
    email: typeof input.email === 'string' ? input.email : undefined,
    createdAt,
    updatedAt,
  };
}

async function migrateLegacyAnonymousSession(input: {
  accountKey?: unknown;
  createdAt?: unknown;
  identity?: {
    subject?: unknown;
  } | null;
  requestSecret?: unknown;
  status?: unknown;
  updatedAt?: unknown;
}): Promise<AnonymousAuthSession | null> {
  if (input.status !== 'anonymous' || typeof input.accountKey !== 'string') {
    return null;
  }

  const subject =
    input.identity && typeof input.identity.subject === 'string'
      ? input.identity.subject
      : input.accountKey.startsWith('anon:')
        ? input.accountKey.slice(5)
        : null;

  if (!subject) {
    return null;
  }

  return normalizeAnonymousSession({
    status: 'anonymous',
    provider: 'anonymous',
    subject,
    accountKey: input.accountKey,
    requestSecret:
      typeof input.requestSecret === 'string' && input.requestSecret.length > 0
        ? input.requestSecret
        : createSessionSecret(),
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : undefined,
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : undefined,
  });
}

export function createAnonymousSession(subject = createRandomId()): AnonymousAuthSession {
  const timestamp = new Date().toISOString();

  return {
    status: 'anonymous',
    provider: 'anonymous',
    subject,
    accountKey: `anon:${subject}`,
    requestSecret: createSessionSecret(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createAuthenticatedSession(params: {
  createdAt?: string;
  displayName?: string | null;
  email?: string | null;
  firebaseUid: string;
  provider: SupportedAuthProvider;
}): AuthenticatedAuthSession {
  const timestamp = new Date().toISOString();
  const createdAt = params.createdAt ?? timestamp;

  return {
    status: 'authenticated',
    provider: params.provider,
    firebaseUid: params.firebaseUid,
    accountKey: `user:${params.firebaseUid}`,
    displayName: params.displayName ?? undefined,
    email: params.email ?? undefined,
    createdAt,
    updatedAt: timestamp,
  };
}

export async function loadStoredAuthSession(): Promise<AuthSession | null> {
  const rawValue = await AsyncStorage.getItem(StorageKeys.authSession);
  if (!rawValue) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(rawValue) as Record<string, unknown>;
    const anonymousSession = await normalizeAnonymousSession(parsedSession);
    if (anonymousSession) {
      if ('requestSecret' in parsedSession) {
        await saveAuthSession(anonymousSession);
      }
      return anonymousSession;
    }

    const authenticatedSession = normalizeAuthenticatedSession(parsedSession);
    if (authenticatedSession) {
      return authenticatedSession;
    }

    const migratedLegacySession = await migrateLegacyAnonymousSession(parsedSession);
    if (migratedLegacySession) {
      await saveAuthSession(migratedLegacySession);
      return migratedLegacySession;
    }
  } catch {
    return null;
  }

  return null;
}

export async function saveAuthSession(session: AuthSession): Promise<void> {
  if (session.status === 'anonymous') {
    const { requestSecret, ...persistedSession } = session;
    await Promise.all([
      AsyncStorage.setItem(StorageKeys.authSession, JSON.stringify(persistedSession)),
      writeAnonymousSessionSecret(session.accountKey, requestSecret),
    ]);
    return;
  }

  await AsyncStorage.setItem(StorageKeys.authSession, JSON.stringify(session));
}

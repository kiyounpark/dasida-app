import { createHash, timingSafeEqual } from 'node:crypto';

import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const ACCOUNT_KEY_HEADER = 'x-dasida-account-key';
const SESSION_SECRET_HEADER = 'x-dasida-session-secret';
const AUTHORIZATION_HEADER = 'authorization';

export class LearningHistoryAuthError extends Error {
  constructor(message: string, public readonly status: 401 | 403 | 500) {
    super(message);
    this.name = 'LearningHistoryAuthError';
  }
}

export type LearningHistoryAuthContext =
  | {
      kind: 'firebase';
      accountKey: string;
      firebaseUid: string;
    }
  | {
      kind: 'anonymous';
      accountKey: string;
    };

function getHeaderValue(
  headers: Record<string, string | string[] | undefined>,
  headerName: string,
) {
  const value = headers[headerName];
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function hashSecret(secret: string) {
  return createHash('sha256').update(secret).digest('hex');
}

function getAuthRef(accountKey: string) {
  return getFirestore().collection('users').doc(accountKey).collection('private').doc('auth');
}

function compareSecretHash(storedSecretHash: string, requestSecret: string) {
  const expected = Buffer.from(storedSecretHash, 'hex');
  const actual = Buffer.from(hashSecret(requestSecret), 'hex');

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}

function getBearerToken(headers: Record<string, string | string[] | undefined>) {
  const authorizationHeader = getHeaderValue(headers, AUTHORIZATION_HEADER);
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

export function getLearningHistoryRequestAccountKey(
  headers: Record<string, string | string[] | undefined>,
) {
  return getHeaderValue(headers, ACCOUNT_KEY_HEADER);
}

export async function authenticateLearningHistoryRequest(
  headers: Record<string, string | string[] | undefined>,
  accountKey: string,
) : Promise<LearningHistoryAuthContext> {
  const headerAccountKey = getLearningHistoryRequestAccountKey(headers);
  const requestSecret = getHeaderValue(headers, SESSION_SECRET_HEADER);
  const bearerToken = getBearerToken(headers);

  if (!headerAccountKey) {
    throw new LearningHistoryAuthError('Missing account key', 401);
  }

  if (headerAccountKey !== accountKey) {
    throw new LearningHistoryAuthError('Unauthorized account access', 403);
  }

  if (bearerToken) {
    try {
      const decodedToken = await getAuth().verifyIdToken(bearerToken);
      if (accountKey !== `user:${decodedToken.uid}`) {
        throw new LearningHistoryAuthError('Unauthorized account access', 403);
      }

      return {
        kind: 'firebase',
        accountKey,
        firebaseUid: decodedToken.uid,
      };
    } catch (error) {
      if (error instanceof LearningHistoryAuthError) {
        throw error;
      }

      throw new LearningHistoryAuthError('Invalid Firebase ID token', 401);
    }
  }

  if (accountKey.startsWith('user:')) {
    throw new LearningHistoryAuthError('Missing Firebase ID token', 401);
  }

  if (!requestSecret) {
    throw new LearningHistoryAuthError('Missing session secret', 401);
  }

  const firestore = getFirestore();
  const authRef = getAuthRef(accountKey);
  const timestamp = new Date().toISOString();

  await firestore.runTransaction(async (transaction) => {
    const authSnapshot = await transaction.get(authRef);

    if (!authSnapshot.exists) {
      transaction.set(authRef, {
        accountKey,
        secretHash: hashSecret(requestSecret),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      return;
    }

    const authData = authSnapshot.data();
    if (!authData || typeof authData.secretHash !== 'string' || authData.secretHash.length === 0) {
      throw new LearningHistoryAuthError('Invalid auth state', 500);
    }

    if (!compareSecretHash(authData.secretHash, requestSecret)) {
      throw new LearningHistoryAuthError('Invalid session secret', 403);
    }

    transaction.set(
      authRef,
      {
        updatedAt: timestamp,
      },
      { merge: true },
    );
  });

  return {
    kind: 'anonymous',
    accountKey,
  };
}

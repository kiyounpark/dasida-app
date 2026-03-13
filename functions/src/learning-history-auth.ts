import { createHash, timingSafeEqual } from 'node:crypto';

import { getFirestore } from 'firebase-admin/firestore';

const ACCOUNT_KEY_HEADER = 'x-dasida-account-key';
const SESSION_SECRET_HEADER = 'x-dasida-session-secret';

export class LearningHistoryAuthError extends Error {
  constructor(message: string, public readonly status: 401 | 403 | 500) {
    super(message);
    this.name = 'LearningHistoryAuthError';
  }
}

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

export async function authenticateLearningHistoryRequest(
  headers: Record<string, string | string[] | undefined>,
  accountKey: string,
) {
  const headerAccountKey = getHeaderValue(headers, ACCOUNT_KEY_HEADER);
  const requestSecret = getHeaderValue(headers, SESSION_SECRET_HEADER);

  if (!headerAccountKey || headerAccountKey !== accountKey) {
    throw new LearningHistoryAuthError('Unauthorized account access', 403);
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
}

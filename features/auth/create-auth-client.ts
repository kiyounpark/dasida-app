import type { AuthClient } from './auth-client';
import { canUseDevGuestAuth } from './auth-policy';
import { DisabledAuthClient } from './disabled-auth-client';
import { FirebaseAuthClient } from './firebase-auth-client';
import { isFirebaseAuthConfigured } from './firebase-config';
import { LocalAnonymousAuthClient } from './local-anonymous-auth-client';

export function createAuthClient(): AuthClient {
  if (canUseDevGuestAuth()) {
    return new LocalAnonymousAuthClient();
  }

  if (isFirebaseAuthConfigured()) {
    return new FirebaseAuthClient();
  }

  return new DisabledAuthClient();
}

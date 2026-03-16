import type { AuthSession, SupportedAuthProvider } from './types';

export type SignInResult = {
  previousSession: AuthSession;
  nextSession: AuthSession;
  isNewAuthenticatedSession: boolean;
};

export type RemoteAuthContext =
  | {
      kind: 'firebase';
      accountKey: string;
      idToken: string;
    }
  | {
      kind: 'anonymous';
      accountKey: string;
      requestSecret: string;
    };

export class AuthFlowCancelledError extends Error {
  constructor(message = 'Authentication was cancelled.') {
    super(message);
    this.name = 'AuthFlowCancelledError';
  }
}

export type AuthClient = {
  loadSession(): Promise<AuthSession | null>;
  ensureAnonymousSession(): Promise<AuthSession>;
  signIn(provider: SupportedAuthProvider): Promise<SignInResult>;
  signOut(): Promise<AuthSession>;
  getSupportedProviders(): SupportedAuthProvider[];
  getRemoteAuthContext(
    accountKey?: string,
    options?: { forceRefresh?: boolean },
  ): Promise<RemoteAuthContext>;
};

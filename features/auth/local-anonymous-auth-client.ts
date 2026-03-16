import type { AuthClient } from './auth-client';
import { createAnonymousSession, loadStoredAuthSession, saveAuthSession } from './session-store';
import type { AuthSession, SupportedAuthProvider } from './types';

export class LocalAnonymousAuthClient implements AuthClient {
  async loadSession(): Promise<AuthSession | null> {
    return loadStoredAuthSession();
  }

  async ensureAnonymousSession(): Promise<AuthSession> {
    const existingSession = await this.loadSession();
    if (existingSession?.status === 'anonymous') {
      return existingSession;
    }

    const anonymousSession = createAnonymousSession();
    await saveAuthSession(anonymousSession);
    return anonymousSession;
  }

  async signIn(): Promise<never> {
    throw new Error('Social sign-in is not implemented yet.');
  }

  async signOut(): Promise<AuthSession> {
    const nextSession = createAnonymousSession();
    await saveAuthSession(nextSession);
    return nextSession;
  }

  getSupportedProviders(): SupportedAuthProvider[] {
    return [];
  }

  async getRemoteAuthContext(accountKey?: string) {
    const session = (await this.loadSession()) ?? (await this.ensureAnonymousSession());

    if (session.status !== 'anonymous') {
      throw new Error('Local anonymous auth client does not support authenticated remote access.');
    }

    if (accountKey && session.accountKey !== accountKey) {
      throw new Error('Anonymous auth context does not match requested account.');
    }

    return {
      kind: 'anonymous' as const,
      accountKey: session.accountKey,
      requestSecret: session.requestSecret,
    };
  }
}

import type { AuthClient } from './auth-client';
import type { AuthSession, SupportedAuthProvider } from './types';

export class DisabledAuthClient implements AuthClient {
  async loadSession(): Promise<AuthSession | null> {
    return null;
  }

  async ensureAnonymousSession(): Promise<AuthSession> {
    throw new Error('Anonymous auth is disabled for this build.');
  }

  async signIn(_provider: SupportedAuthProvider): Promise<never> {
    throw new Error('Social sign-in is unavailable for this build.');
  }

  async signOut(): Promise<null> {
    return null;
  }

  getSupportedProviders(): SupportedAuthProvider[] {
    return [];
  }

  async getRemoteAuthContext(): Promise<never> {
    throw new Error('Remote auth context is unavailable for this build.');
  }
}

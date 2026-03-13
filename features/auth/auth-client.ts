import type { AuthSession, SupportedAuthProvider } from './types';

export type AuthClient = {
  loadSession(): Promise<AuthSession | null>;
  ensureAnonymousSession(): Promise<AuthSession>;
  signIn(provider: SupportedAuthProvider): Promise<AuthSession>;
  signOut(): Promise<AuthSession>;
  getSupportedProviders(): SupportedAuthProvider[];
};


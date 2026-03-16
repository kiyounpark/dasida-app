export type AuthProviderId = 'anonymous' | 'apple' | 'google';
export type AuthStatus = 'anonymous' | 'authenticated';
export type SupportedAuthProvider = Exclude<AuthProviderId, 'anonymous'>;

type AuthSessionBase = {
  accountKey: string;
  createdAt: string;
  updatedAt: string;
};

export type AnonymousAuthSession = AuthSessionBase & {
  status: 'anonymous';
  provider: 'anonymous';
  subject: string;
  requestSecret: string;
};

export type AuthenticatedAuthSession = AuthSessionBase & {
  status: 'authenticated';
  provider: SupportedAuthProvider;
  firebaseUid: string;
  displayName?: string;
  email?: string;
};

export type AuthSession = AnonymousAuthSession | AuthenticatedAuthSession;

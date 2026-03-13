export type AuthProviderId = 'anonymous' | 'apple' | 'google' | 'kakao';
export type AuthStatus = 'anonymous' | 'authenticated';

export type AuthIdentity = {
  provider: AuthProviderId;
  subject: string;
  displayName?: string;
  email?: string;
};

export type AuthSession = {
  status: AuthStatus;
  identity: AuthIdentity;
  accountKey: string;
  requestSecret: string;
  createdAt: string;
  updatedAt: string;
};

export type SupportedAuthProvider = Exclude<AuthProviderId, 'anonymous'>;

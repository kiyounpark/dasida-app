import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import {
  AccessTokenRequest,
  AuthRequest,
  ResponseType,
  makeRedirectUri,
} from 'expo-auth-session';
import Constants from 'expo-constants';
import {
  GoogleAuthProvider,
  OAuthProvider,
  getAdditionalUserInfo,
  onIdTokenChanged,
  signInWithCredential,
  signOut as firebaseSignOut,
  type UserCredential,
  type User,
} from 'firebase/auth';

import type {
  AuthClient,
  RemoteAuthContext,
  SignInResult,
} from './auth-client';
import { AuthFlowCancelledError } from './auth-client';
import { getFirebaseAuthInstance } from './firebase-app';
import {
  getGoogleClientIdForCurrentPlatform,
  isFirebaseAuthConfigured,
  isGoogleAuthConfigured,
} from './firebase-config';
import {
  clearStoredAuthSession,
  createAnonymousSession,
  createAuthenticatedSession,
  loadStoredAuthSession,
  saveAuthSession,
} from './session-store';
import type { AuthSession, SupportedAuthProvider } from './types';

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};
const GOOGLE_SCOPES = ['openid', 'profile', 'email'];
const GOOGLE_WINDOW_FEATURES = {
  width: 515,
  height: 680,
};

WebBrowser.maybeCompleteAuthSession();

function getAppScheme() {
  const configuredScheme = Constants.expoConfig?.scheme;
  if (typeof configuredScheme === 'string' && configuredScheme.length > 0) {
    return configuredScheme;
  }

  return 'dasidaapp';
}

function mapProviderId(providerId: string | null | undefined): SupportedAuthProvider {
  if (providerId === 'apple.com') {
    return 'apple';
  }

  return 'google';
}

function createGoogleRedirectUri() {
  return makeRedirectUri({
    scheme: getAppScheme(),
    path: 'oauthredirect',
  });
}

async function createSha256(input: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}

async function createRandomNonce() {
  return Crypto.getRandomBytesAsync(16).then((bytes) =>
    Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join(''),
  );
}

type AppleSignInResult = {
  appleCredential: AppleAuthentication.AppleAuthenticationCredential;
  signInResult: UserCredential;
};

type GoogleSignInResult = {
  signInResult: UserCredential;
};

function isAppleSignInResult(
  result: AppleSignInResult | GoogleSignInResult,
): result is AppleSignInResult {
  return 'appleCredential' in result;
}

async function signInWithAppleCredential(): Promise<AppleSignInResult> {
  try {
    const rawNonce = await createRandomNonce();
    const hashedNonce = await createSha256(rawNonce);
    const appleCredential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!appleCredential.identityToken) {
      throw new Error('Apple identity token is missing.');
    }

    const provider = new OAuthProvider('apple.com');
    const firebaseCredential = provider.credential({
      idToken: appleCredential.identityToken,
      rawNonce,
    });

    const signInResult = await signInWithCredential(getFirebaseAuthInstance(), firebaseCredential);

    return {
      appleCredential,
      signInResult,
    };
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ERR_REQUEST_CANCELED'
    ) {
      throw new AuthFlowCancelledError();
    }

    throw error;
  }
}

async function signInWithGoogleCredential(): Promise<GoogleSignInResult> {
  const clientId = getGoogleClientIdForCurrentPlatform();
  if (!clientId) {
    throw new Error('Google sign-in is not configured for this platform.');
  }

  const isWeb = process.env.EXPO_OS === 'web';
  const request = new AuthRequest({
    clientId,
    redirectUri: createGoogleRedirectUri(),
    responseType: isWeb ? ResponseType.IdToken : ResponseType.Code,
    usePKCE: !isWeb,
    scopes: GOOGLE_SCOPES,
    extraParams: {
      prompt: 'select_account',
      ...(isWeb ? { nonce: await createRandomNonce() } : {}),
    },
  });

  await request.makeAuthUrlAsync(GOOGLE_DISCOVERY);
  const result = await request.promptAsync(GOOGLE_DISCOVERY, {
    windowFeatures: GOOGLE_WINDOW_FEATURES,
  });

  if (result.type === 'cancel' || result.type === 'dismiss' || result.type === 'locked') {
    throw new AuthFlowCancelledError();
  }

  if (result.type !== 'success') {
    throw new Error('Google sign-in failed to complete.');
  }

  let idToken: string | undefined = result.params.id_token;

  if (!idToken && result.params.code) {
    if (!request.codeVerifier) {
      throw new Error('Google PKCE verifier is missing.');
    }

    const tokenResponse = await new AccessTokenRequest({
      clientId,
      redirectUri: createGoogleRedirectUri(),
      code: result.params.code,
      extraParams: {
        code_verifier: request.codeVerifier,
      },
      scopes: GOOGLE_SCOPES,
    }).performAsync(GOOGLE_DISCOVERY);

    idToken = tokenResponse.idToken;
  }

  if (!idToken) {
    throw new Error('Google ID token is missing.');
  }

  return {
    signInResult: await signInWithCredential(
      getFirebaseAuthInstance(),
      GoogleAuthProvider.credential(idToken),
    ),
  };
}

async function waitForFirebaseAuthReady() {
  const auth = getFirebaseAuthInstance();

  await new Promise<void>((resolve) => {
    const unsubscribe = onIdTokenChanged(auth, () => {
      unsubscribe();
      resolve();
    });
  });
}

function formatAppleDisplayName(
  fullName: AppleAuthentication.AppleAuthenticationFullName | null | undefined,
) {
  const nameParts = [fullName?.familyName, fullName?.givenName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  return nameParts.length > 0 ? nameParts.join(' ') : undefined;
}

function buildAuthenticatedSessionFromUser(
  user: User,
  previousSession?: AuthSession | null,
  overrides?: {
    displayName?: string;
    email?: string | null;
  },
) {
  return createAuthenticatedSession({
    firebaseUid: user.uid,
    provider: mapProviderId(user.providerData[0]?.providerId ?? user.providerId),
    displayName: overrides?.displayName ?? user.displayName,
    email: overrides?.email ?? user.email,
    createdAt: previousSession?.status === 'authenticated' ? previousSession.createdAt : undefined,
  });
}

export class FirebaseAuthClient implements AuthClient {
  async loadSession(): Promise<AuthSession | null> {
    await waitForFirebaseAuthReady();

    const [storedSession, auth] = await Promise.all([
      loadStoredAuthSession(),
      Promise.resolve(getFirebaseAuthInstance()),
    ]);
    const currentUser = auth.currentUser;

    if (currentUser) {
      const authenticatedSession = buildAuthenticatedSessionFromUser(currentUser, storedSession);
      await saveAuthSession(authenticatedSession);
      return authenticatedSession;
    }

    return storedSession?.status === 'anonymous' ? storedSession : null;
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

  async signIn(provider: SupportedAuthProvider): Promise<SignInResult> {
    if (!isFirebaseAuthConfigured()) {
      throw new Error('Firebase Auth is not configured for this build.');
    }

    const previousSession = await this.loadSession();
    const credentialResult =
      provider === 'apple' ? await signInWithAppleCredential() : await signInWithGoogleCredential();
    const authResult = credentialResult.signInResult;
    const appleOverrides =
      isAppleSignInResult(credentialResult)
        ? {
            displayName: formatAppleDisplayName(credentialResult.appleCredential.fullName),
            email: credentialResult.appleCredential.email,
          }
        : undefined;

    const nextSession = buildAuthenticatedSessionFromUser(
      authResult.user,
      previousSession,
      appleOverrides,
    );
    await saveAuthSession(nextSession);

    return {
      previousSession,
      nextSession,
      isNewAuthenticatedSession:
        previousSession?.status !== 'authenticated' ||
        previousSession?.accountKey !== nextSession.accountKey ||
        Boolean(getAdditionalUserInfo(authResult)?.isNewUser),
    };
  }

  async signOut(): Promise<null> {
    await firebaseSignOut(getFirebaseAuthInstance()).catch(() => {
      return undefined;
    });

    await clearStoredAuthSession();
    return null;
  }

  getSupportedProviders(): SupportedAuthProvider[] {
    if (!isFirebaseAuthConfigured()) {
      return [];
    }

    const providers: SupportedAuthProvider[] = [];

    if (process.env.EXPO_OS === 'ios') {
      providers.push('apple');
    }

    if (isGoogleAuthConfigured()) {
      providers.push('google');
    }

    return providers;
  }

  async getRemoteAuthContext(
    accountKey?: string,
    options?: { forceRefresh?: boolean },
  ): Promise<RemoteAuthContext> {
    const session = await this.loadSession();
    if (!session) {
      throw new Error('Auth session is not available.');
    }

    if (accountKey && session.accountKey !== accountKey) {
      throw new Error('Remote auth context does not match the requested account.');
    }

    if (session.status === 'anonymous') {
      return {
        kind: 'anonymous',
        accountKey: session.accountKey,
        requestSecret: session.requestSecret,
      };
    }

    const currentUser = getFirebaseAuthInstance().currentUser;
    if (!currentUser || currentUser.uid !== session.firebaseUid) {
      throw new Error('Authenticated Firebase user is not available.');
    }

    return {
      kind: 'firebase',
      accountKey: session.accountKey,
      idToken: await currentUser.getIdToken(options?.forceRefresh ?? false),
    };
  }
}

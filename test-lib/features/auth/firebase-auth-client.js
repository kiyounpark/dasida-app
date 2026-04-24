"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirebaseAuthClient = void 0;
const AppleAuthentication = __importStar(require("expo-apple-authentication"));
const Crypto = __importStar(require("expo-crypto"));
const WebBrowser = __importStar(require("expo-web-browser"));
const expo_auth_session_1 = require("expo-auth-session");
const expo_constants_1 = __importDefault(require("expo-constants"));
const google_signin_1 = require("@react-native-google-signin/google-signin");
const auth_1 = require("firebase/auth");
const auth_client_1 = require("./auth-client");
const local_learning_history_storage_1 = require("../../features/learning/local-learning-history-storage");
const firebase_app_1 = require("./firebase-app");
const firebase_config_1 = require("./firebase-config");
const session_store_1 = require("./session-store");
const bootstrap_timeouts_1 = require("./bootstrap-timeouts");
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
    const configuredScheme = expo_constants_1.default.expoConfig?.scheme;
    if (typeof configuredScheme === 'string' && configuredScheme.length > 0) {
        return configuredScheme;
    }
    return 'dasidaapp';
}
function mapProviderId(providerId) {
    if (providerId === 'apple.com') {
        return 'apple';
    }
    return 'google';
}
function createGoogleRedirectUri() {
    if (process.env.EXPO_OS === 'ios') {
        const bundleIdentifier = expo_constants_1.default.expoConfig?.ios?.bundleIdentifier;
        return `${bundleIdentifier || 'com.dasida.app'}:/oauthredirect`;
    }
    return (0, expo_auth_session_1.makeRedirectUri)({
        scheme: getAppScheme(),
        path: 'oauthredirect',
    });
}
async function createSha256(input) {
    return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}
async function createRandomNonce() {
    return Crypto.getRandomBytesAsync(16).then((bytes) => Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join(''));
}
function isAppleSignInResult(result) {
    return 'appleCredential' in result;
}
async function signInWithAppleCredential() {
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
        const provider = new auth_1.OAuthProvider('apple.com');
        const firebaseCredential = provider.credential({
            idToken: appleCredential.identityToken,
            rawNonce,
        });
        const signInResult = await (0, auth_1.signInWithCredential)((0, firebase_app_1.getFirebaseAuthInstance)(), firebaseCredential);
        return {
            appleCredential,
            signInResult,
        };
    }
    catch (error) {
        if (typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 'ERR_REQUEST_CANCELED') {
            throw new auth_client_1.AuthFlowCancelledError();
        }
        throw error;
    }
}
async function signInWithGoogleNative() {
    await google_signin_1.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await google_signin_1.GoogleSignin.signIn();
    if (response.type === 'cancelled') {
        throw new auth_client_1.AuthFlowCancelledError();
    }
    const idToken = response.data?.idToken;
    if (!idToken) {
        throw new Error('Google ID token is missing.');
    }
    return {
        signInResult: await (0, auth_1.signInWithCredential)((0, firebase_app_1.getFirebaseAuthInstance)(), auth_1.GoogleAuthProvider.credential(idToken)),
    };
}
async function getGoogleIdTokenViaAuthSession() {
    const clientId = (0, firebase_config_1.getGoogleClientIdForCurrentPlatform)();
    if (!clientId) {
        throw new Error('Google sign-in is not configured for this platform.');
    }
    const isWeb = process.env.EXPO_OS === 'web';
    const request = new expo_auth_session_1.AuthRequest({
        clientId,
        redirectUri: createGoogleRedirectUri(),
        responseType: isWeb ? expo_auth_session_1.ResponseType.IdToken : expo_auth_session_1.ResponseType.Code,
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
        throw new auth_client_1.AuthFlowCancelledError();
    }
    if (result.type !== 'success') {
        throw new Error('Google sign-in failed to complete.');
    }
    let idToken = result.params.id_token;
    if (!idToken && result.params.code) {
        if (!request.codeVerifier) {
            throw new Error('Google PKCE verifier is missing.');
        }
        const tokenResponse = await new expo_auth_session_1.AccessTokenRequest({
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
    return idToken;
}
async function signInWithGoogleCredential() {
    const idToken = await getGoogleIdTokenViaAuthSession();
    return {
        signInResult: await (0, auth_1.signInWithCredential)((0, firebase_app_1.getFirebaseAuthInstance)(), auth_1.GoogleAuthProvider.credential(idToken)),
    };
}
async function waitForFirebaseAuthReady() {
    const auth = (0, firebase_app_1.getFirebaseAuthInstance)();
    let timeoutId;
    try {
        await Promise.race([
            auth.authStateReady(),
            new Promise((resolve) => {
                timeoutId = setTimeout(() => {
                    console.warn('[FirebaseAuthClient] authStateReady timed out — continuing with current auth snapshot.');
                    resolve();
                }, bootstrap_timeouts_1.FIREBASE_AUTH_READY_TIMEOUT_MS);
            }),
        ]);
    }
    finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}
function formatAppleDisplayName(fullName) {
    const nameParts = [fullName?.familyName, fullName?.givenName]
        .map((part) => part?.trim())
        .filter((part) => Boolean(part));
    return nameParts.length > 0 ? nameParts.join(' ') : undefined;
}
function buildAuthenticatedSessionFromUser(user, previousSession, overrides) {
    return (0, session_store_1.createAuthenticatedSession)({
        firebaseUid: user.uid,
        provider: mapProviderId(user.providerData[0]?.providerId ?? user.providerId),
        displayName: overrides?.displayName ?? user.displayName,
        email: overrides?.email ?? user.email,
        createdAt: previousSession?.status === 'authenticated' ? previousSession.createdAt : undefined,
    });
}
class FirebaseAuthClient {
    async loadSession() {
        await waitForFirebaseAuthReady();
        const [storedSession, auth] = await Promise.all([
            (0, session_store_1.loadStoredAuthSession)(),
            Promise.resolve((0, firebase_app_1.getFirebaseAuthInstance)()),
        ]);
        const currentUser = auth.currentUser;
        if (currentUser) {
            const authenticatedSession = buildAuthenticatedSessionFromUser(currentUser, storedSession);
            await (0, session_store_1.saveAuthSession)(authenticatedSession);
            return authenticatedSession;
        }
        return storedSession?.status === 'anonymous' ? storedSession : null;
    }
    async ensureAnonymousSession() {
        const existingSession = await this.loadSession();
        if (existingSession?.status === 'anonymous') {
            return existingSession;
        }
        const anonymousSession = (0, session_store_1.createAnonymousSession)();
        await (0, session_store_1.saveAuthSession)(anonymousSession);
        return anonymousSession;
    }
    async signIn(provider) {
        if (!(0, firebase_config_1.isFirebaseAuthConfigured)()) {
            throw new Error('Firebase Auth is not configured for this build.');
        }
        const previousSession = await this.loadSession();
        const credentialResult = provider === 'apple'
            ? await signInWithAppleCredential()
            : process.env.EXPO_OS === 'android'
                ? await signInWithGoogleNative()
                : await signInWithGoogleCredential();
        const authResult = credentialResult.signInResult;
        const appleOverrides = isAppleSignInResult(credentialResult)
            ? {
                displayName: formatAppleDisplayName(credentialResult.appleCredential.fullName),
                email: credentialResult.appleCredential.email,
            }
            : undefined;
        const nextSession = buildAuthenticatedSessionFromUser(authResult.user, previousSession, appleOverrides);
        await (0, session_store_1.saveAuthSession)(nextSession);
        return {
            previousSession,
            nextSession,
            isNewAuthenticatedSession: previousSession?.status !== 'authenticated' ||
                previousSession?.accountKey !== nextSession.accountKey ||
                Boolean((0, auth_1.getAdditionalUserInfo)(authResult)?.isNewUser),
        };
    }
    async signOut() {
        await (0, auth_1.signOut)((0, firebase_app_1.getFirebaseAuthInstance)()).catch(() => {
            return undefined;
        });
        await (0, session_store_1.clearStoredAuthSession)();
        return null;
    }
    async deleteAccount(accountKey, deleteAccountUrl) {
        const auth = (0, firebase_app_1.getFirebaseAuthInstance)();
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('No authenticated user found.');
        }
        const providerId = currentUser.providerData[0]?.providerId ?? '';
        // Step 1: Call Cloud Function to delete all Firestore data
        const context = await this.getRemoteAuthContext(accountKey);
        if (context.kind !== 'firebase') {
            throw new Error('Firebase auth context required for account deletion.');
        }
        const deleteResponse = await fetch(deleteAccountUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${context.idToken}`,
                'x-dasida-account-key': accountKey,
            },
            body: JSON.stringify({ accountKey }),
        });
        if (!deleteResponse.ok) {
            const errorBody = await deleteResponse.json().catch(() => ({}));
            throw new Error(errorBody.error ?? `deleteAccount failed with status ${deleteResponse.status}`);
        }
        // Step 2: Clear local AsyncStorage cache
        await (0, local_learning_history_storage_1.clearLearningHistoryStorage)(accountKey);
        // Step 3: Revoke OAuth token + delete Firebase Auth account
        // If Auth deletion fails after Firestore is already wiped, still clear local session
        // so the user lands on the sign-in screen rather than a broken empty state.
        try {
            await this.revokeAndDeleteUser(currentUser, providerId);
        }
        finally {
            await (0, session_store_1.clearStoredAuthSession)();
        }
    }
    async revokeAndDeleteUser(user, providerId) {
        try {
            await this.doRevokeAndDelete(user, providerId);
        }
        catch (error) {
            if (typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                error.code === 'auth/requires-recent-login') {
                // Re-authenticate then retry
                const reauthUser = await this.reauthenticateUser(user, providerId);
                await this.doRevokeAndDelete(reauthUser, providerId);
            }
            else {
                throw error;
            }
        }
    }
    async doRevokeAndDelete(user, providerId) {
        if (providerId === 'google.com' && process.env.EXPO_OS === 'android') {
            await google_signin_1.GoogleSignin.revokeAccess();
        }
        // Apple token revocation requires server-side client_secret — handled by
        // the Cloud Function (Firebase Auth deleteUser revokes active Firebase tokens).
        await (0, auth_1.deleteUser)(user);
    }
    async reauthenticateUser(user, providerId) {
        if (providerId === 'apple.com') {
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
                    throw new Error('Apple identity token is missing during reauthentication.');
                }
                const firebaseCredential = new auth_1.OAuthProvider('apple.com').credential({
                    idToken: appleCredential.identityToken,
                    rawNonce,
                });
                const result = await (0, auth_1.reauthenticateWithCredential)(user, firebaseCredential);
                return result.user;
            }
            catch (error) {
                if (typeof error === 'object' &&
                    error !== null &&
                    'code' in error &&
                    error.code === 'ERR_REQUEST_CANCELED') {
                    throw new auth_client_1.AuthFlowCancelledError();
                }
                throw error;
            }
        }
        // Google — mirror primary sign-in platform branch
        if (process.env.EXPO_OS === 'android') {
            await google_signin_1.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            const response = await google_signin_1.GoogleSignin.signIn();
            if (response.type === 'cancelled') {
                throw new auth_client_1.AuthFlowCancelledError();
            }
            const idToken = response.data?.idToken;
            if (!idToken) {
                throw new Error('Google ID token missing during reauthentication.');
            }
            const result = await (0, auth_1.reauthenticateWithCredential)(user, auth_1.GoogleAuthProvider.credential(idToken));
            return result.user;
        }
        // iOS/web: use expo-auth-session flow, but reauthenticate (not full sign-in)
        const idToken = await getGoogleIdTokenViaAuthSession();
        const result = await (0, auth_1.reauthenticateWithCredential)(user, auth_1.GoogleAuthProvider.credential(idToken));
        return result.user;
    }
    getSupportedProviders() {
        if (!(0, firebase_config_1.isFirebaseAuthConfigured)()) {
            return [];
        }
        const providers = [];
        if (process.env.EXPO_OS === 'ios') {
            providers.push('apple');
        }
        if ((0, firebase_config_1.isGoogleAuthConfigured)()) {
            providers.push('google');
        }
        return providers;
    }
    async getRemoteAuthContext(accountKey, options) {
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
        const currentUser = (0, firebase_app_1.getFirebaseAuthInstance)().currentUser;
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
exports.FirebaseAuthClient = FirebaseAuthClient;

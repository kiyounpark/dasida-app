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
exports.clearAnonymousSessionSecret = clearAnonymousSessionSecret;
exports.createAnonymousSession = createAnonymousSession;
exports.createAuthenticatedSession = createAuthenticatedSession;
exports.loadStoredAuthSession = loadStoredAuthSession;
exports.saveAuthSession = saveAuthSession;
exports.clearStoredAuthSession = clearStoredAuthSession;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const SecureStore = __importStar(require("expo-secure-store"));
const storage_keys_1 = require("../../constants/storage-keys");
function createRandomId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
function createSessionSecret() {
    const cryptoApi = globalThis.crypto;
    if (typeof cryptoApi?.randomUUID === 'function') {
        return cryptoApi.randomUUID().replace(/-/g, '');
    }
    return Array.from({ length: 4 }, () => `${createRandomId()}${Math.random().toString(36).slice(2, 10)}`).join('');
}
function getAnonymousSessionSecretAsyncStorageKey(accountKey) {
    return `${storage_keys_1.StorageKeys.authSessionSecretPrefix}${accountKey}`;
}
function encodeSecureStoreKeySegment(value) {
    return Array.from(value)
        .map((character) => character.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('');
}
function getAnonymousSessionSecretSecureStoreKey(accountKey) {
    return `dasida.auth.session_secret.${encodeSecureStoreKeySegment(accountKey)}`;
}
async function readAnonymousSessionSecret(accountKey) {
    const secureStorageKey = getAnonymousSessionSecretSecureStoreKey(accountKey);
    const asyncStorageKey = getAnonymousSessionSecretAsyncStorageKey(accountKey);
    try {
        if (await SecureStore.isAvailableAsync()) {
            const secureValue = await SecureStore.getItemAsync(secureStorageKey);
            if (typeof secureValue === 'string' && secureValue.length > 0) {
                return secureValue;
            }
        }
    }
    catch {
        // Fall back to AsyncStorage if SecureStore access fails on a given platform or key format.
    }
    const fallbackValue = await async_storage_1.default.getItem(asyncStorageKey);
    return typeof fallbackValue === 'string' && fallbackValue.length > 0 ? fallbackValue : null;
}
async function writeAnonymousSessionSecret(accountKey, requestSecret) {
    const secureStorageKey = getAnonymousSessionSecretSecureStoreKey(accountKey);
    const asyncStorageKey = getAnonymousSessionSecretAsyncStorageKey(accountKey);
    try {
        if (await SecureStore.isAvailableAsync()) {
            await SecureStore.setItemAsync(secureStorageKey, requestSecret);
            await async_storage_1.default.removeItem(asyncStorageKey);
            return;
        }
    }
    catch {
        // Fall through to AsyncStorage if SecureStore access fails on a given platform or key format.
    }
    await async_storage_1.default.setItem(asyncStorageKey, requestSecret);
}
async function clearAnonymousSessionSecret(accountKey) {
    const secureStorageKey = getAnonymousSessionSecretSecureStoreKey(accountKey);
    const asyncStorageKey = getAnonymousSessionSecretAsyncStorageKey(accountKey);
    try {
        if (await SecureStore.isAvailableAsync()) {
            await SecureStore.deleteItemAsync(secureStorageKey);
        }
    }
    catch {
        // Always fall through to AsyncStorage cleanup when SecureStore deletion fails.
    }
    await async_storage_1.default.removeItem(asyncStorageKey);
}
function isSupportedProvider(value) {
    return value === 'apple' || value === 'google';
}
async function normalizeAnonymousSession(input) {
    if (input.status !== 'anonymous' || input.provider !== 'anonymous') {
        return null;
    }
    if (typeof input.accountKey !== 'string' ||
        typeof input.subject !== 'string') {
        return null;
    }
    const requestSecret = typeof input.requestSecret === 'string' && input.requestSecret.length > 0
        ? input.requestSecret
        : await readAnonymousSessionSecret(input.accountKey);
    if (!requestSecret) {
        return null;
    }
    const createdAt = typeof input.createdAt === 'string' ? input.createdAt : new Date().toISOString();
    const updatedAt = typeof input.updatedAt === 'string' ? input.updatedAt : createdAt;
    return {
        status: 'anonymous',
        provider: 'anonymous',
        accountKey: input.accountKey,
        subject: input.subject,
        requestSecret,
        createdAt,
        updatedAt,
    };
}
function normalizeAuthenticatedSession(input) {
    if (input.status !== 'authenticated' || !isSupportedProvider(input.provider)) {
        return null;
    }
    if (typeof input.accountKey !== 'string' || typeof input.firebaseUid !== 'string') {
        return null;
    }
    const createdAt = typeof input.createdAt === 'string' ? input.createdAt : new Date().toISOString();
    const updatedAt = typeof input.updatedAt === 'string' ? input.updatedAt : createdAt;
    return {
        status: 'authenticated',
        provider: input.provider,
        accountKey: input.accountKey,
        firebaseUid: input.firebaseUid,
        displayName: typeof input.displayName === 'string' ? input.displayName : undefined,
        email: typeof input.email === 'string' ? input.email : undefined,
        createdAt,
        updatedAt,
    };
}
async function migrateLegacyAnonymousSession(input) {
    if (input.status !== 'anonymous' || typeof input.accountKey !== 'string') {
        return null;
    }
    const subject = input.identity && typeof input.identity.subject === 'string'
        ? input.identity.subject
        : input.accountKey.startsWith('anon:')
            ? input.accountKey.slice(5)
            : null;
    if (!subject) {
        return null;
    }
    return normalizeAnonymousSession({
        status: 'anonymous',
        provider: 'anonymous',
        subject,
        accountKey: input.accountKey,
        requestSecret: typeof input.requestSecret === 'string' && input.requestSecret.length > 0
            ? input.requestSecret
            : createSessionSecret(),
        createdAt: typeof input.createdAt === 'string' ? input.createdAt : undefined,
        updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : undefined,
    });
}
function createAnonymousSession(subject = createRandomId()) {
    const timestamp = new Date().toISOString();
    return {
        status: 'anonymous',
        provider: 'anonymous',
        subject,
        accountKey: `anon:${subject}`,
        requestSecret: createSessionSecret(),
        createdAt: timestamp,
        updatedAt: timestamp,
    };
}
function createAuthenticatedSession(params) {
    const timestamp = new Date().toISOString();
    const createdAt = params.createdAt ?? timestamp;
    return {
        status: 'authenticated',
        provider: params.provider,
        firebaseUid: params.firebaseUid,
        accountKey: `user:${params.firebaseUid}`,
        displayName: params.displayName ?? undefined,
        email: params.email ?? undefined,
        createdAt,
        updatedAt: timestamp,
    };
}
async function loadStoredAuthSession() {
    const rawValue = await async_storage_1.default.getItem(storage_keys_1.StorageKeys.authSession);
    if (!rawValue) {
        return null;
    }
    try {
        const parsedSession = JSON.parse(rawValue);
        const anonymousSession = await normalizeAnonymousSession(parsedSession);
        if (anonymousSession) {
            if ('requestSecret' in parsedSession) {
                await saveAuthSession(anonymousSession);
            }
            return anonymousSession;
        }
        const authenticatedSession = normalizeAuthenticatedSession(parsedSession);
        if (authenticatedSession) {
            return authenticatedSession;
        }
        const migratedLegacySession = await migrateLegacyAnonymousSession(parsedSession);
        if (migratedLegacySession) {
            await saveAuthSession(migratedLegacySession);
            return migratedLegacySession;
        }
    }
    catch {
        return null;
    }
    return null;
}
async function saveAuthSession(session) {
    if (session.status === 'anonymous') {
        const { requestSecret, ...persistedSession } = session;
        await Promise.all([
            async_storage_1.default.setItem(storage_keys_1.StorageKeys.authSession, JSON.stringify(persistedSession)),
            writeAnonymousSessionSecret(session.accountKey, requestSecret),
        ]);
        return;
    }
    await async_storage_1.default.setItem(storage_keys_1.StorageKeys.authSession, JSON.stringify(session));
}
async function clearStoredAuthSession() {
    const storedSession = await loadStoredAuthSession().catch(() => null);
    if (storedSession?.status === 'anonymous') {
        await Promise.all([
            async_storage_1.default.removeItem(storage_keys_1.StorageKeys.authSession),
            clearAnonymousSessionSecret(storedSession.accountKey),
        ]);
        return;
    }
    await async_storage_1.default.removeItem(storage_keys_1.StorageKeys.authSession);
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFirebaseAuthConfigured = isFirebaseAuthConfigured;
exports.getFirebaseClientConfig = getFirebaseClientConfig;
exports.getGoogleClientIdForCurrentPlatform = getGoogleClientIdForCurrentPlatform;
exports.isGoogleAuthConfigured = isGoogleAuthConfigured;
const env_1 = require("../../constants/env");
function isFirebaseAuthConfigured() {
    return Boolean(env_1.expoPublicFirebaseApiKey &&
        env_1.expoPublicFirebaseAppId &&
        env_1.expoPublicFirebaseProjectId &&
        env_1.expoPublicFirebaseAuthDomain &&
        env_1.expoPublicFirebaseMessagingSenderId);
}
function getFirebaseClientConfig() {
    if (!isFirebaseAuthConfigured()) {
        throw new Error('Firebase Auth is not configured for this build.');
    }
    return {
        apiKey: env_1.expoPublicFirebaseApiKey,
        authDomain: env_1.expoPublicFirebaseAuthDomain,
        projectId: env_1.expoPublicFirebaseProjectId,
        appId: env_1.expoPublicFirebaseAppId,
        messagingSenderId: env_1.expoPublicFirebaseMessagingSenderId,
        storageBucket: env_1.expoPublicFirebaseStorageBucket || undefined,
    };
}
function getGoogleClientIdForCurrentPlatform() {
    const platform = process.env.EXPO_OS;
    if (platform === 'ios') {
        return env_1.expoPublicGoogleIosClientId;
    }
    if (platform === 'android') {
        return env_1.expoPublicGoogleAndroidClientId;
    }
    return env_1.expoPublicGoogleWebClientId;
}
function isGoogleAuthConfigured() {
    return Boolean(getGoogleClientIdForCurrentPlatform());
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMandatorySocialAuthEnabled = isMandatorySocialAuthEnabled;
exports.canUseDevGuestAuth = canUseDevGuestAuth;
exports.getRequiredAuthProviders = getRequiredAuthProviders;
exports.getAuthBlockingReason = getAuthBlockingReason;
function isMandatorySocialAuthEnabled() {
    return true;
}
function canUseDevGuestAuth() {
    return __DEV__;
}
function getProviderOrder() {
    if (process.env.EXPO_OS === 'ios') {
        return ['apple', 'google'];
    }
    return ['google'];
}
function getRequiredAuthProviders(availableProviders) {
    const orderedProviders = getProviderOrder();
    return orderedProviders.filter((provider) => availableProviders.includes(provider));
}
function getAuthBlockingReason(params) {
    if (getRequiredAuthProviders(params.availableProviders).length > 0) {
        return null;
    }
    return params.isFirebaseAuthConfigured ? 'providers_unavailable' : 'firebase_not_configured';
}

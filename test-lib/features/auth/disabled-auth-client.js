"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisabledAuthClient = void 0;
class DisabledAuthClient {
    async loadSession() {
        return null;
    }
    async ensureAnonymousSession() {
        throw new Error('Anonymous auth is disabled for this build.');
    }
    async signIn(_provider) {
        throw new Error('Social sign-in is unavailable for this build.');
    }
    async signOut() {
        return null;
    }
    async deleteAccount() {
        throw new Error('Account deletion is unavailable for this build.');
    }
    getSupportedProviders() {
        return [];
    }
    async getRemoteAuthContext() {
        throw new Error('Remote auth context is unavailable for this build.');
    }
}
exports.DisabledAuthClient = DisabledAuthClient;

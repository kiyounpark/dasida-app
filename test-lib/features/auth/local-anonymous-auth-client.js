"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalAnonymousAuthClient = void 0;
const session_store_1 = require("./session-store");
class LocalAnonymousAuthClient {
    async loadSession() {
        return (0, session_store_1.loadStoredAuthSession)();
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
    async signIn(_provider) {
        throw new Error('Social sign-in is not implemented yet.');
    }
    async signOut() {
        await (0, session_store_1.clearStoredAuthSession)();
        return null;
    }
    async deleteAccount() {
        throw new Error('Account deletion is not supported for anonymous accounts.');
    }
    getSupportedProviders() {
        return [];
    }
    async getRemoteAuthContext(accountKey) {
        const session = await this.loadSession();
        if (!session) {
            throw new Error('Anonymous auth context is not available.');
        }
        if (session.status !== 'anonymous') {
            throw new Error('Local anonymous auth client does not support authenticated remote access.');
        }
        if (accountKey && session.accountKey !== accountKey) {
            throw new Error('Anonymous auth context does not match requested account.');
        }
        return {
            kind: 'anonymous',
            accountKey: session.accountKey,
            requestSecret: session.requestSecret,
        };
    }
}
exports.LocalAnonymousAuthClient = LocalAnonymousAuthClient;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnonymousAwareLearnerProfileStore = void 0;
class AnonymousAwareLearnerProfileStore {
    loadSession;
    authenticatedStore;
    anonymousStore;
    constructor(loadSession, authenticatedStore, anonymousStore) {
        this.loadSession = loadSession;
        this.authenticatedStore = authenticatedStore;
        this.anonymousStore = anonymousStore;
    }
    // 매 호출마다 최신 세션을 읽어 스토어를 선택합니다.
    // session이 null이거나 anonymous이면 anonymousStore로 위임합니다.
    // signIn 흐름 내부(buildSnapshotForSession)에서도 호출될 수 있으며,
    // 이 시점에는 Firebase 세션이 이미 authenticated 상태이므로 authenticatedStore가 선택됩니다.
    async selectStore() {
        const session = await this.loadSession();
        return session?.status === 'authenticated'
            ? this.authenticatedStore
            : this.anonymousStore;
    }
    async load(accountKey) {
        return (await this.selectStore()).load(accountKey);
    }
    async createInitial(accountKey) {
        return (await this.selectStore()).createInitial(accountKey);
    }
    async save(profile) {
        return (await this.selectStore()).save(profile);
    }
    async reset(accountKey) {
        return (await this.selectStore()).reset(accountKey);
    }
}
exports.AnonymousAwareLearnerProfileStore = AnonymousAwareLearnerProfileStore;

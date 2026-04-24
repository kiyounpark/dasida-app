"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirestoreLearnerProfileStore = void 0;
const app_1 = require("firebase/app");
const firestore_1 = require("firebase/firestore");
function createRandomId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
class FirestoreLearnerProfileStore {
    get db() {
        return (0, firestore_1.getFirestore)((0, app_1.getApp)());
    }
    profileRef(accountKey) {
        // accountKey는 "user:{firebaseUid}" 형태. Firestore 경로에는 순수 UID만 사용한다.
        const uid = accountKey.startsWith('user:') ? accountKey.slice(5) : accountKey;
        return (0, firestore_1.doc)(this.db, 'users', uid, 'profile', 'data');
    }
    async load(accountKey) {
        const snap = await (0, firestore_1.getDoc)(this.profileRef(accountKey));
        if (!snap.exists()) {
            return null;
        }
        return snap.data();
    }
    async createInitial(accountKey) {
        const timestamp = new Date().toISOString();
        const profile = {
            accountKey,
            learnerId: createRandomId(),
            nickname: '',
            grade: 'unknown',
            createdAt: timestamp,
            updatedAt: timestamp,
        };
        await this.save(profile);
        return profile;
    }
    async save(profile) {
        const data = Object.fromEntries(Object.entries({ ...profile, _updatedAt: (0, firestore_1.serverTimestamp)() }).filter(([, v]) => v !== undefined));
        // setDoc(full replace): undefined 필드는 filter로 제거되어 Firestore에서 삭제됨.
        // merge 모드나 updateDoc 전환 시 undefined 대신 deleteField() sentinel 필요.
        await (0, firestore_1.setDoc)(this.profileRef(profile.accountKey), data);
    }
    async reset(accountKey) {
        await (0, firestore_1.deleteDoc)(this.profileRef(accountKey));
    }
}
exports.FirestoreLearnerProfileStore = FirestoreLearnerProfileStore;

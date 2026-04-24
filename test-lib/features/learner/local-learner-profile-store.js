"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalLearnerProfileStore = void 0;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const storage_keys_1 = require("../../constants/storage-keys");
function createRandomId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
function getLearnerProfileStorageKey(accountKey) {
    return `${storage_keys_1.StorageKeys.learnerProfilePrefix}${accountKey}`;
}
class LocalLearnerProfileStore {
    async load(accountKey) {
        const rawValue = await async_storage_1.default.getItem(getLearnerProfileStorageKey(accountKey));
        if (!rawValue) {
            return null;
        }
        try {
            return JSON.parse(rawValue);
        }
        catch {
            return null;
        }
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
        await async_storage_1.default.setItem(getLearnerProfileStorageKey(profile.accountKey), JSON.stringify(profile));
    }
    async reset(accountKey) {
        await async_storage_1.default.removeItem(getLearnerProfileStorageKey(accountKey));
    }
}
exports.LocalLearnerProfileStore = LocalLearnerProfileStore;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalReviewTaskStore = void 0;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const storage_keys_1 = require("../../constants/storage-keys");
function getReviewTasksStorageKey(accountKey) {
    return `${storage_keys_1.StorageKeys.reviewTasksPrefix}${accountKey}`;
}
class LocalReviewTaskStore {
    async load(accountKey) {
        const rawValue = await async_storage_1.default.getItem(getReviewTasksStorageKey(accountKey));
        if (!rawValue) {
            return [];
        }
        try {
            return JSON.parse(rawValue);
        }
        catch {
            return [];
        }
    }
    async saveAll(accountKey, tasks) {
        await async_storage_1.default.setItem(getReviewTasksStorageKey(accountKey), JSON.stringify(tasks));
    }
    async reset(accountKey) {
        await async_storage_1.default.removeItem(getReviewTasksStorageKey(accountKey));
    }
}
exports.LocalReviewTaskStore = LocalReviewTaskStore;

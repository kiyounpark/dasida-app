"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAttemptsStorageKey = getAttemptsStorageKey;
exports.getAttemptResultsStorageKey = getAttemptResultsStorageKey;
exports.getReviewTasksStorageKey = getReviewTasksStorageKey;
exports.getSummaryStorageKey = getSummaryStorageKey;
exports.readLearningHistoryJson = readLearningHistoryJson;
exports.writeLearningHistoryJson = writeLearningHistoryJson;
exports.clearLearningHistoryStorage = clearLearningHistoryStorage;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const storage_keys_1 = require("../../constants/storage-keys");
function getAttemptsStorageKey(accountKey) {
    return `${storage_keys_1.StorageKeys.learningAttemptsPrefix}${accountKey}`;
}
function getAttemptResultsStorageKey(accountKey) {
    return `${storage_keys_1.StorageKeys.learningAttemptResultsPrefix}${accountKey}`;
}
function getReviewTasksStorageKey(accountKey) {
    return `${storage_keys_1.StorageKeys.reviewTasksPrefix}${accountKey}`;
}
function getSummaryStorageKey(accountKey) {
    return `${storage_keys_1.StorageKeys.learnerSummaryCurrentPrefix}${accountKey}`;
}
async function readLearningHistoryJson(key, fallback) {
    const rawValue = await async_storage_1.default.getItem(key);
    if (!rawValue) {
        return fallback;
    }
    try {
        return JSON.parse(rawValue);
    }
    catch {
        return fallback;
    }
}
async function writeLearningHistoryJson(key, value) {
    await async_storage_1.default.setItem(key, JSON.stringify(value));
}
async function clearLearningHistoryStorage(accountKey) {
    await Promise.all([
        async_storage_1.default.removeItem(getAttemptsStorageKey(accountKey)),
        async_storage_1.default.removeItem(getAttemptResultsStorageKey(accountKey)),
        async_storage_1.default.removeItem(getReviewTasksStorageKey(accountKey)),
        async_storage_1.default.removeItem(getSummaryStorageKey(accountKey)),
    ]);
}

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDiagnosisProgress = getDiagnosisProgress;
exports.markProblemDiagnosed = markProblemDiagnosed;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const storage_keys_1 = require("../../../constants/storage-keys");
function storageKey(examId) {
    return storage_keys_1.StorageKeys.examDiagnosisProgressPrefix + examId;
}
let pendingWrite = Promise.resolve();
async function getDiagnosisProgress(examId) {
    try {
        const raw = await async_storage_1.default.getItem(storageKey(examId));
        if (!raw)
            return {};
        return JSON.parse(raw);
    }
    catch {
        return {};
    }
}
async function markProblemDiagnosed(examId, problemNumber, weaknessId) {
    pendingWrite = pendingWrite.then(async () => {
        const current = await getDiagnosisProgress(examId);
        const updated = { ...current, [problemNumber]: weaknessId };
        await async_storage_1.default.setItem(storageKey(examId), JSON.stringify(updated));
    });
    await pendingWrite;
}

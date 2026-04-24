"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalLearningHistorySnapshotStore = void 0;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const storage_keys_1 = require("../../constants/storage-keys");
const history_repository_1 = require("./history-repository");
const local_learning_history_repository_1 = require("./local-learning-history-repository");
const timestamp_utils_1 = require("@/functions/shared/timestamp-utils");
const local_learning_history_storage_1 = require("./local-learning-history-storage");
function getSnapshotSortTimestamp(snapshot) {
    return snapshot.lastUpdatedAt ?? '';
}
function sortAttempts(attempts) {
    return [...attempts].sort((left, right) => (0, timestamp_utils_1.compareTimestampsDesc)(left.completedAt, right.completedAt));
}
function sortReviewTasks(reviewTasks) {
    return [...reviewTasks].sort((left, right) => (0, timestamp_utils_1.compareTimestampsAsc)(left.scheduledFor, right.scheduledFor));
}
function mergeAttempts(existingAttempts, importedAttempts) {
    return sortAttempts([
        ...importedAttempts,
        ...existingAttempts.filter((existingAttempt) => !importedAttempts.some((importedAttempt) => importedAttempt.id === existingAttempt.id)),
    ]);
}
function mergeReviewTasks(existingTasks, importedTasks) {
    return sortReviewTasks([
        ...importedTasks,
        ...existingTasks.filter((existingTask) => !importedTasks.some((importedTask) => importedTask.id === existingTask.id)),
    ]);
}
function mergeResultsByAttemptId(existingResultsByAttemptId, importedResultsByAttemptId) {
    return {
        ...existingResultsByAttemptId,
        ...importedResultsByAttemptId,
    };
}
function pickSummaryBase(existingSummary, importedSummary) {
    if (!existingSummary) {
        return importedSummary;
    }
    return (0, timestamp_utils_1.isTimestampOnOrAfter)(existingSummary.updatedAt, importedSummary.updatedAt)
        ? existingSummary
        : importedSummary;
}
function getLastUpdatedAt(params) {
    const timestamps = [
        params.summary?.updatedAt,
        params.featuredExamState.lastOpenedAt,
        ...params.attempts.map((attempt) => attempt.completedAt),
        ...params.reviewTasks.map((task) => task.completedAt ?? task.createdAt),
    ].filter((value) => Boolean(value));
    return timestamps.sort((left, right) => (0, timestamp_utils_1.compareTimestampsDesc)(left, right))[0];
}
function buildRecordCount(snapshot) {
    const resultCount = Object.values(snapshot.resultsByAttemptId).flat().length;
    const featuredExamCount = snapshot.featuredExamState.status === 'not_started' ? 0 : 1;
    return snapshot.attempts.length + resultCount + snapshot.reviewTasks.length + featuredExamCount;
}
function extractAccountKeyFromStorageKey(key) {
    const prefixes = [
        storage_keys_1.StorageKeys.learningAttemptsPrefix,
        storage_keys_1.StorageKeys.learningAttemptResultsPrefix,
        storage_keys_1.StorageKeys.reviewTasksPrefix,
        storage_keys_1.StorageKeys.learnerSummaryCurrentPrefix,
    ];
    const prefix = prefixes.find((candidate) => key.startsWith(candidate));
    if (!prefix) {
        return null;
    }
    return key.slice(prefix.length);
}
class LocalLearningHistorySnapshotStore {
    async loadSnapshot(sourceAccountKey) {
        const [attempts, resultsByAttemptId, reviewTasks, summary] = await Promise.all([
            (0, local_learning_history_storage_1.readLearningHistoryJson)((0, local_learning_history_storage_1.getAttemptsStorageKey)(sourceAccountKey), []),
            (0, local_learning_history_storage_1.readLearningHistoryJson)((0, local_learning_history_storage_1.getAttemptResultsStorageKey)(sourceAccountKey), {}),
            (0, local_learning_history_storage_1.readLearningHistoryJson)((0, local_learning_history_storage_1.getReviewTasksStorageKey)(sourceAccountKey), []),
            (0, local_learning_history_storage_1.readLearningHistoryJson)((0, local_learning_history_storage_1.getSummaryStorageKey)(sourceAccountKey), null),
        ]);
        const featuredExamState = summary?.featuredExamState ?? (0, history_repository_1.createDefaultFeaturedExamState)();
        const snapshotBase = {
            sourceAccountKey,
            attempts,
            resultsByAttemptId,
            reviewTasks,
            summary,
            featuredExamState,
        };
        const recordCount = buildRecordCount(snapshotBase);
        if (recordCount === 0) {
            return null;
        }
        return {
            ...snapshotBase,
            recordCount,
            lastUpdatedAt: getLastUpdatedAt({
                attempts,
                featuredExamState,
                reviewTasks,
                summary,
            }),
        };
    }
    async findLatestAnonymousSnapshot() {
        const keys = await async_storage_1.default.getAllKeys();
        const anonymousAccountKeys = Array.from(new Set(keys
            .map(extractAccountKeyFromStorageKey)
            .filter((accountKey) => Boolean(accountKey?.startsWith('anon:')))));
        const snapshots = (await Promise.all(anonymousAccountKeys.map((accountKey) => this.loadSnapshot(accountKey)))).filter((snapshot) => Boolean(snapshot));
        snapshots.sort((left, right) => (0, timestamp_utils_1.compareTimestampsDesc)(getSnapshotSortTimestamp(left), getSnapshotSortTimestamp(right)));
        return snapshots[0] ?? null;
    }
    async cacheImportedSnapshot(targetAccountKey, snapshot, summary) {
        const importedAttempts = snapshot.attempts.map((attempt) => ({
            ...attempt,
            accountKey: targetAccountKey,
        }));
        const importedResultsByAttemptId = Object.fromEntries(Object.entries(snapshot.resultsByAttemptId).map(([attemptId, results]) => [
            attemptId,
            results.map((result) => ({
                ...result,
                accountKey: targetAccountKey,
            })),
        ]));
        const importedReviewTasks = snapshot.reviewTasks.map((task) => ({
            ...task,
            accountKey: targetAccountKey,
        }));
        const [existingAttempts, existingResultsByAttemptId, existingReviewTasks, existingSummary] = await Promise.all([
            (0, local_learning_history_storage_1.readLearningHistoryJson)((0, local_learning_history_storage_1.getAttemptsStorageKey)(targetAccountKey), []),
            (0, local_learning_history_storage_1.readLearningHistoryJson)((0, local_learning_history_storage_1.getAttemptResultsStorageKey)(targetAccountKey), {}),
            (0, local_learning_history_storage_1.readLearningHistoryJson)((0, local_learning_history_storage_1.getReviewTasksStorageKey)(targetAccountKey), []),
            (0, local_learning_history_storage_1.readLearningHistoryJson)((0, local_learning_history_storage_1.getSummaryStorageKey)(targetAccountKey), null),
        ]);
        const nextAttempts = mergeAttempts(existingAttempts, importedAttempts);
        const nextResultsByAttemptId = mergeResultsByAttemptId(existingResultsByAttemptId, importedResultsByAttemptId);
        const nextReviewTasks = mergeReviewTasks(existingReviewTasks, importedReviewTasks);
        const nextSummary = (0, local_learning_history_repository_1.buildSummary)(targetAccountKey, nextAttempts, Object.values(nextResultsByAttemptId).flat(), nextReviewTasks, pickSummaryBase(existingSummary, summary));
        await Promise.all([
            (0, local_learning_history_storage_1.writeLearningHistoryJson)((0, local_learning_history_storage_1.getAttemptsStorageKey)(targetAccountKey), nextAttempts),
            (0, local_learning_history_storage_1.writeLearningHistoryJson)((0, local_learning_history_storage_1.getAttemptResultsStorageKey)(targetAccountKey), nextResultsByAttemptId),
            (0, local_learning_history_storage_1.writeLearningHistoryJson)((0, local_learning_history_storage_1.getReviewTasksStorageKey)(targetAccountKey), nextReviewTasks),
            (0, local_learning_history_storage_1.writeLearningHistoryJson)((0, local_learning_history_storage_1.getSummaryStorageKey)(targetAccountKey), nextSummary),
        ]);
    }
}
exports.LocalLearningHistorySnapshotStore = LocalLearningHistorySnapshotStore;

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearningHistoryMigrationService = void 0;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const Crypto = __importStar(require("expo-crypto"));
const env_1 = require("../../constants/env");
const storage_keys_1 = require("../../constants/storage-keys");
const firebase_learning_history_api_1 = require("./firebase-learning-history-api");
const timestamp_utils_1 = require("@/functions/shared/timestamp-utils");
const MAX_AUTOMATIC_RESUME_ATTEMPTS = 3;
const AUTOMATIC_RESUME_RETRY_DELAY_MINUTES = 30;
function getMigrationMarkerStorageKey(targetAccountKey, sourceAccountKeyHash) {
    return `${storage_keys_1.StorageKeys.learningHistoryMigrationPrefix}${targetAccountKey}/${sourceAccountKeyHash}`;
}
function getMigrationMarkerStoragePrefix(targetAccountKey) {
    return `${storage_keys_1.StorageKeys.learningHistoryMigrationPrefix}${targetAccountKey}/`;
}
async function createAccountKeyHash(accountKey) {
    return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, accountKey);
}
async function readMigrationMarker(markerKey) {
    const rawValue = await async_storage_1.default.getItem(markerKey);
    if (!rawValue) {
        return null;
    }
    try {
        const parsedMarker = JSON.parse(rawValue);
        if (typeof parsedMarker.sourceAccountKey !== 'string' ||
            typeof parsedMarker.sourceAccountKeyHash !== 'string' ||
            typeof parsedMarker.targetAccountKey !== 'string' ||
            (parsedMarker.status !== 'pending' && parsedMarker.status !== 'completed')) {
            return null;
        }
        return {
            sourceAccountKey: parsedMarker.sourceAccountKey,
            sourceAccountKeyHash: parsedMarker.sourceAccountKeyHash,
            targetAccountKey: parsedMarker.targetAccountKey,
            status: parsedMarker.status,
            retryCount: typeof parsedMarker.retryCount === 'number' ? parsedMarker.retryCount : 0,
            lastAttemptAt: typeof parsedMarker.lastAttemptAt === 'string'
                ? parsedMarker.lastAttemptAt
                : typeof parsedMarker.updatedAt === 'string'
                    ? parsedMarker.updatedAt
                    : new Date(0).toISOString(),
            updatedAt: typeof parsedMarker.updatedAt === 'string' ? parsedMarker.updatedAt : new Date(0).toISOString(),
            lastFailureAt: typeof parsedMarker.lastFailureAt === 'string' ? parsedMarker.lastFailureAt : undefined,
            lastErrorMessage: typeof parsedMarker.lastErrorMessage === 'string' ? parsedMarker.lastErrorMessage : undefined,
            nextRetryAt: typeof parsedMarker.nextRetryAt === 'string' ? parsedMarker.nextRetryAt : undefined,
        };
    }
    catch {
        return null;
    }
}
function createAutomaticRetryTimestamp(retryCount) {
    const retryDate = new Date();
    retryDate.setUTCMinutes(retryDate.getUTCMinutes() + retryCount * AUTOMATIC_RESUME_RETRY_DELAY_MINUTES);
    return retryDate.toISOString();
}
function canAutomaticallyResumeMarker(marker) {
    if (marker.retryCount >= MAX_AUTOMATIC_RESUME_ATTEMPTS) {
        return false;
    }
    if (!marker.nextRetryAt) {
        return true;
    }
    return (0, timestamp_utils_1.isTimestampOnOrBefore)(marker.nextRetryAt, new Date().toISOString());
}
async function listPendingMigrationMarkers(targetAccountKey) {
    const markerPrefix = getMigrationMarkerStoragePrefix(targetAccountKey);
    const markerKeys = (await async_storage_1.default.getAllKeys()).filter((key) => key.startsWith(markerPrefix));
    const markers = (await Promise.all(markerKeys.map(async (storageKey) => {
        const marker = await readMigrationMarker(storageKey);
        if (!marker || marker.status !== 'pending' || !canAutomaticallyResumeMarker(marker)) {
            return null;
        }
        return {
            ...marker,
            storageKey,
        };
    }))).filter((marker) => Boolean(marker));
    markers.sort((left, right) => (0, timestamp_utils_1.compareTimestampsAsc)(left.updatedAt, right.updatedAt));
    return markers;
}
class LearningHistoryMigrationService {
    dependencies;
    constructor(dependencies) {
        this.dependencies = dependencies;
    }
    async resolveAuthenticatedTargetAccountKey(targetAccountKey) {
        const session = await this.dependencies.authClient.loadSession();
        if (!session) {
            throw new Error('Authenticated session is required for learning history import.');
        }
        if (session.status !== 'authenticated') {
            throw new Error('Authenticated session is required for learning history import.');
        }
        if (targetAccountKey && session.accountKey !== targetAccountKey) {
            throw new Error('Migration target account does not match the current authenticated session.');
        }
        return session.accountKey;
    }
    async loadMarkerSummary(targetAccountKey) {
        return this.dependencies.cacheRepository.loadCurrentSummary(targetAccountKey);
    }
    async loadSnapshotForStatus(sourceAccountKey) {
        if (sourceAccountKey) {
            return this.dependencies.snapshotStore.loadSnapshot(sourceAccountKey);
        }
        return this.dependencies.snapshotStore.findLatestAnonymousSnapshot();
    }
    async createReadyStatus(targetAccountKey, snapshot) {
        if (!snapshot) {
            return {
                state: 'empty',
                targetAccountKey,
            };
        }
        const sourceAccountKeyHash = await createAccountKeyHash(snapshot.sourceAccountKey);
        const markerKey = getMigrationMarkerStorageKey(targetAccountKey, sourceAccountKeyHash);
        const existingMarker = await readMigrationMarker(markerKey);
        if (existingMarker?.status === 'completed') {
            return {
                state: 'already_imported',
                sourceAccountKey: snapshot.sourceAccountKey,
                targetAccountKey,
                recordCount: snapshot.recordCount,
                summary: await this.loadMarkerSummary(targetAccountKey),
            };
        }
        return {
            state: 'ready',
            sourceAccountKey: snapshot.sourceAccountKey,
            targetAccountKey,
            recordCount: snapshot.recordCount,
        };
    }
    async loadStatus(params) {
        const targetAccountKey = await this.resolveAuthenticatedTargetAccountKey(params?.targetAccountKey);
        const snapshot = await this.loadSnapshotForStatus(params?.sourceAnonymousAccountKey);
        if (!snapshot) {
            return {
                state: 'empty',
                targetAccountKey,
                sourceAccountKey: params?.sourceAnonymousAccountKey,
            };
        }
        return this.createReadyStatus(targetAccountKey, snapshot);
    }
    async resumePendingImports(targetAccountKey) {
        const resolvedTargetAccountKey = await this.resolveAuthenticatedTargetAccountKey(targetAccountKey);
        const pendingMarkers = await listPendingMigrationMarkers(resolvedTargetAccountKey);
        const resumedStatuses = [];
        for (const marker of pendingMarkers) {
            const snapshot = await this.dependencies.snapshotStore.loadSnapshot(marker.sourceAccountKey);
            if (!snapshot) {
                await async_storage_1.default.removeItem(marker.storageKey);
                continue;
            }
            resumedStatuses.push(await this.importAnonymousSnapshot(marker.sourceAccountKey, resolvedTargetAccountKey));
        }
        return resumedStatuses;
    }
    async importAnonymousSnapshot(sourceAnonymousAccountKey, targetAccountKey) {
        const resolvedTargetAccountKey = await this.resolveAuthenticatedTargetAccountKey(targetAccountKey);
        const snapshot = await this.dependencies.snapshotStore.loadSnapshot(sourceAnonymousAccountKey);
        if (!snapshot) {
            return {
                state: 'empty',
                sourceAccountKey: sourceAnonymousAccountKey,
                targetAccountKey: resolvedTargetAccountKey,
            };
        }
        const sourceAccountKeyHash = await createAccountKeyHash(sourceAnonymousAccountKey);
        const markerKey = getMigrationMarkerStorageKey(resolvedTargetAccountKey, sourceAccountKeyHash);
        const existingMarker = await readMigrationMarker(markerKey);
        if (existingMarker?.status === 'completed') {
            return {
                state: 'already_imported',
                sourceAccountKey: sourceAnonymousAccountKey,
                targetAccountKey: resolvedTargetAccountKey,
                recordCount: snapshot.recordCount,
                summary: await this.loadMarkerSummary(resolvedTargetAccountKey),
            };
        }
        if (!env_1.learningHistoryImportLocalSnapshotUrl) {
            throw new Error('Learning history import endpoint is not configured.');
        }
        const writeMarker = async (status, overrides) => {
            const now = new Date().toISOString();
            await async_storage_1.default.setItem(markerKey, JSON.stringify({
                sourceAccountKey: sourceAnonymousAccountKey,
                sourceAccountKeyHash,
                targetAccountKey: resolvedTargetAccountKey,
                status,
                retryCount: overrides?.retryCount ?? existingMarker?.retryCount ?? 0,
                lastAttemptAt: overrides?.lastAttemptAt ?? now,
                updatedAt: now,
                lastFailureAt: overrides?.lastFailureAt,
                lastErrorMessage: overrides?.lastErrorMessage,
                nextRetryAt: overrides?.nextRetryAt,
            }));
        };
        const runImport = async (forceRefresh = false) => {
            const authContext = await this.dependencies.authClient.getRemoteAuthContext(resolvedTargetAccountKey, {
                forceRefresh,
            });
            if (authContext.kind !== 'firebase') {
                throw new Error('Authenticated Firebase credentials are required for import.');
            }
            return (0, firebase_learning_history_api_1.readLearningHistoryApiJson)(env_1.learningHistoryImportLocalSnapshotUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(0, firebase_learning_history_api_1.createRemoteAuthHeaders)(authContext),
                },
                body: JSON.stringify({
                    sourceAnonymousAccountKey,
                    attempts: snapshot.attempts,
                    resultsByAttemptId: snapshot.resultsByAttemptId,
                    reviewTasks: snapshot.reviewTasks,
                    featuredExamState: snapshot.featuredExamState,
                }),
            }, 1);
        };
        await writeMarker('pending', {
            retryCount: existingMarker?.retryCount ?? 0,
            lastAttemptAt: new Date().toISOString(),
            lastFailureAt: undefined,
            lastErrorMessage: undefined,
            nextRetryAt: undefined,
        });
        const performImportWithRecovery = async () => {
            try {
                return await runImport();
            }
            catch (error) {
                if (error instanceof firebase_learning_history_api_1.LearningHistoryApiError && error.code === 'UNAUTHORIZED') {
                    return runImport(true);
                }
                if ((0, firebase_learning_history_api_1.shouldUseLearningHistoryCacheFallback)(error)) {
                    // Reconcile the import when the first response is lost after the server write succeeded.
                    return runImport();
                }
                throw error;
            }
        };
        let payload;
        try {
            payload = await performImportWithRecovery();
        }
        catch (error) {
            const nextRetryCount = (existingMarker?.retryCount ?? 0) + 1;
            await writeMarker('pending', {
                retryCount: nextRetryCount,
                lastAttemptAt: new Date().toISOString(),
                lastFailureAt: new Date().toISOString(),
                lastErrorMessage: error instanceof Error ? error.message : 'Unknown migration import error.',
                nextRetryAt: createAutomaticRetryTimestamp(nextRetryCount),
            });
            throw error;
        }
        await Promise.all([
            writeMarker('completed', {
                retryCount: 0,
                lastAttemptAt: new Date().toISOString(),
                lastFailureAt: undefined,
                lastErrorMessage: undefined,
                nextRetryAt: undefined,
            }),
            this.dependencies.snapshotStore.cacheImportedSnapshot(resolvedTargetAccountKey, snapshot, payload.summary),
        ]);
        return {
            state: payload.status === 'already_imported' ? 'already_imported' : 'completed',
            sourceAccountKey: sourceAnonymousAccountKey,
            targetAccountKey: resolvedTargetAccountKey,
            recordCount: snapshot.recordCount,
            summary: payload.summary,
        };
    }
}
exports.LearningHistoryMigrationService = LearningHistoryMigrationService;

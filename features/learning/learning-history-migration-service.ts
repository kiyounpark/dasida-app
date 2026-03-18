import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { learningHistoryImportLocalSnapshotUrl } from '@/constants/env';
import { StorageKeys } from '@/constants/storage-keys';
import type { AuthClient } from '@/features/auth/auth-client';

import {
  LearningHistoryApiError,
  createRemoteAuthHeaders,
  readLearningHistoryApiJson,
  shouldUseLearningHistoryCacheFallback,
} from './firebase-learning-history-api';
import type {
  HistoryMigrationStatus,
  LocalLearningHistorySnapshot,
} from './history-repository';
import { LocalLearningHistoryRepository } from './local-learning-history-repository';
import { LocalLearningHistorySnapshotStore } from './local-learning-history-snapshot-store';
import {
  compareTimestampsAsc,
  isTimestampOnOrBefore,
} from '@/functions/shared/timestamp-utils';
import type { LearnerSummaryCurrent } from './types';

type Dependencies = {
  authClient: AuthClient;
  cacheRepository: LocalLearningHistoryRepository;
  snapshotStore: LocalLearningHistorySnapshotStore;
};

type ImportLocalLearningHistoryResponse = {
  status: 'imported' | 'already_imported';
  summary: LearnerSummaryCurrent;
};

type MigrationMarker = {
  sourceAccountKey: string;
  sourceAccountKeyHash: string;
  targetAccountKey: string;
  status: 'pending' | 'completed';
  retryCount: number;
  lastAttemptAt: string;
  updatedAt: string;
  lastFailureAt?: string;
  lastErrorMessage?: string;
  nextRetryAt?: string;
};

const MAX_AUTOMATIC_RESUME_ATTEMPTS = 3;
const AUTOMATIC_RESUME_RETRY_DELAY_MINUTES = 30;

function getMigrationMarkerStorageKey(targetAccountKey: string, sourceAccountKeyHash: string) {
  return `${StorageKeys.learningHistoryMigrationPrefix}${targetAccountKey}/${sourceAccountKeyHash}`;
}

function getMigrationMarkerStoragePrefix(targetAccountKey: string) {
  return `${StorageKeys.learningHistoryMigrationPrefix}${targetAccountKey}/`;
}

async function createAccountKeyHash(accountKey: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, accountKey);
}

async function readMigrationMarker(markerKey: string): Promise<MigrationMarker | null> {
  const rawValue = await AsyncStorage.getItem(markerKey);
  if (!rawValue) {
    return null;
  }

  try {
    const parsedMarker = JSON.parse(rawValue) as Partial<MigrationMarker>;
    if (
      typeof parsedMarker.sourceAccountKey !== 'string' ||
      typeof parsedMarker.sourceAccountKeyHash !== 'string' ||
      typeof parsedMarker.targetAccountKey !== 'string' ||
      (parsedMarker.status !== 'pending' && parsedMarker.status !== 'completed')
    ) {
      return null;
    }

    return {
      sourceAccountKey: parsedMarker.sourceAccountKey,
      sourceAccountKeyHash: parsedMarker.sourceAccountKeyHash,
      targetAccountKey: parsedMarker.targetAccountKey,
      status: parsedMarker.status,
      retryCount: typeof parsedMarker.retryCount === 'number' ? parsedMarker.retryCount : 0,
      lastAttemptAt:
        typeof parsedMarker.lastAttemptAt === 'string'
          ? parsedMarker.lastAttemptAt
          : typeof parsedMarker.updatedAt === 'string'
            ? parsedMarker.updatedAt
            : new Date(0).toISOString(),
      updatedAt:
        typeof parsedMarker.updatedAt === 'string' ? parsedMarker.updatedAt : new Date(0).toISOString(),
      lastFailureAt:
        typeof parsedMarker.lastFailureAt === 'string' ? parsedMarker.lastFailureAt : undefined,
      lastErrorMessage:
        typeof parsedMarker.lastErrorMessage === 'string' ? parsedMarker.lastErrorMessage : undefined,
      nextRetryAt: typeof parsedMarker.nextRetryAt === 'string' ? parsedMarker.nextRetryAt : undefined,
    };
  } catch {
    return null;
  }
}

function createAutomaticRetryTimestamp(retryCount: number) {
  const retryDate = new Date();
  retryDate.setUTCMinutes(retryDate.getUTCMinutes() + retryCount * AUTOMATIC_RESUME_RETRY_DELAY_MINUTES);
  return retryDate.toISOString();
}

function canAutomaticallyResumeMarker(marker: MigrationMarker) {
  if (marker.retryCount >= MAX_AUTOMATIC_RESUME_ATTEMPTS) {
    return false;
  }

  if (!marker.nextRetryAt) {
    return true;
  }

  return isTimestampOnOrBefore(marker.nextRetryAt, new Date().toISOString());
}

async function listPendingMigrationMarkers(
  targetAccountKey: string,
): Promise<Array<MigrationMarker & { storageKey: string }>> {
  const markerPrefix = getMigrationMarkerStoragePrefix(targetAccountKey);
  const markerKeys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(markerPrefix));
  const markers = (
    await Promise.all(
      markerKeys.map(async (storageKey) => {
        const marker = await readMigrationMarker(storageKey);
        if (!marker || marker.status !== 'pending' || !canAutomaticallyResumeMarker(marker)) {
          return null;
        }

        return {
          ...marker,
          storageKey,
        };
      }),
    )
  ).filter((marker): marker is MigrationMarker & { storageKey: string } => Boolean(marker));

  markers.sort((left, right) => compareTimestampsAsc(left.updatedAt, right.updatedAt));
  return markers;
}

export class LearningHistoryMigrationService {
  constructor(private readonly dependencies: Dependencies) {}

  private async resolveAuthenticatedTargetAccountKey(targetAccountKey?: string) {
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

  private async loadMarkerSummary(targetAccountKey: string) {
    return this.dependencies.cacheRepository.loadCurrentSummary(targetAccountKey);
  }

  private async loadSnapshotForStatus(sourceAccountKey?: string) {
    if (sourceAccountKey) {
      return this.dependencies.snapshotStore.loadSnapshot(sourceAccountKey);
    }

    return this.dependencies.snapshotStore.findLatestAnonymousSnapshot();
  }

  private async createReadyStatus(
    targetAccountKey: string,
    snapshot: LocalLearningHistorySnapshot | null,
  ): Promise<HistoryMigrationStatus> {
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

  async loadStatus(params?: {
    sourceAnonymousAccountKey?: string;
    targetAccountKey?: string;
  }): Promise<HistoryMigrationStatus> {
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

  async resumePendingImports(targetAccountKey?: string): Promise<HistoryMigrationStatus[]> {
    const resolvedTargetAccountKey = await this.resolveAuthenticatedTargetAccountKey(targetAccountKey);
    const pendingMarkers = await listPendingMigrationMarkers(resolvedTargetAccountKey);

    const resumedStatuses: HistoryMigrationStatus[] = [];

    for (const marker of pendingMarkers) {
      const snapshot = await this.dependencies.snapshotStore.loadSnapshot(marker.sourceAccountKey);
      if (!snapshot) {
        await AsyncStorage.removeItem(marker.storageKey);
        continue;
      }

      resumedStatuses.push(
        await this.importAnonymousSnapshot(marker.sourceAccountKey, resolvedTargetAccountKey),
      );
    }

    return resumedStatuses;
  }

  async importAnonymousSnapshot(
    sourceAnonymousAccountKey: string,
    targetAccountKey?: string,
  ): Promise<HistoryMigrationStatus> {
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

    if (!learningHistoryImportLocalSnapshotUrl) {
      throw new Error('Learning history import endpoint is not configured.');
    }

    const writeMarker = async (
      status: MigrationMarker['status'],
      overrides?: Partial<
        Pick<
          MigrationMarker,
          'retryCount' | 'lastAttemptAt' | 'lastFailureAt' | 'lastErrorMessage' | 'nextRetryAt'
        >
      >,
    ) => {
      const now = new Date().toISOString();
      await AsyncStorage.setItem(
        markerKey,
        JSON.stringify({
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
        } satisfies MigrationMarker),
      );
    };

    const runImport = async (forceRefresh = false) => {
      const authContext = await this.dependencies.authClient.getRemoteAuthContext(
        resolvedTargetAccountKey,
        {
          forceRefresh,
        },
      );
      if (authContext.kind !== 'firebase') {
        throw new Error('Authenticated Firebase credentials are required for import.');
      }

      return readLearningHistoryApiJson<ImportLocalLearningHistoryResponse>(
        learningHistoryImportLocalSnapshotUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...createRemoteAuthHeaders(authContext),
          },
          body: JSON.stringify({
            sourceAnonymousAccountKey,
            attempts: snapshot.attempts,
            resultsByAttemptId: snapshot.resultsByAttemptId,
            reviewTasks: snapshot.reviewTasks,
            featuredExamState: snapshot.featuredExamState,
          }),
        },
        1,
      );
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
      } catch (error) {
        if (error instanceof LearningHistoryApiError && error.code === 'UNAUTHORIZED') {
          return runImport(true);
        }

        if (shouldUseLearningHistoryCacheFallback(error)) {
          // Reconcile the import when the first response is lost after the server write succeeded.
          return runImport();
        }

        throw error;
      }
    };

    let payload: ImportLocalLearningHistoryResponse;

    try {
      payload = await performImportWithRecovery();
    } catch (error) {
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
      this.dependencies.snapshotStore.cacheImportedSnapshot(
        resolvedTargetAccountKey,
        snapshot,
        payload.summary,
      ),
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

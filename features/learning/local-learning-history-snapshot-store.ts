import AsyncStorage from '@react-native-async-storage/async-storage';

import { StorageKeys } from '@/constants/storage-keys';

import {
  createDefaultFeaturedExamState,
  type LocalLearningHistorySnapshot,
} from './history-repository';
import { buildSummary } from './local-learning-history-repository';
import {
  compareTimestampsAsc,
  compareTimestampsDesc,
  isTimestampOnOrAfter,
} from '@/functions/shared/timestamp-utils';
import {
  getAttemptResultsStorageKey,
  getAttemptsStorageKey,
  getReviewTasksStorageKey,
  getSummaryStorageKey,
  readLearningHistoryJson,
  writeLearningHistoryJson,
} from './local-learning-history-storage';
import type {
  LearnerSummaryCurrent,
  LearningAttempt,
  LearningAttemptResult,
  ReviewTask,
} from './types';

function getSnapshotSortTimestamp(snapshot: LocalLearningHistorySnapshot) {
  return snapshot.lastUpdatedAt ?? '';
}

function sortAttempts(attempts: LearningAttempt[]) {
  return [...attempts].sort((left, right) => compareTimestampsDesc(left.completedAt, right.completedAt));
}

function sortReviewTasks(reviewTasks: ReviewTask[]) {
  return [...reviewTasks].sort((left, right) =>
    compareTimestampsAsc(left.scheduledFor, right.scheduledFor),
  );
}

function mergeAttempts(existingAttempts: LearningAttempt[], importedAttempts: LearningAttempt[]) {
  return sortAttempts([
    ...importedAttempts,
    ...existingAttempts.filter(
      (existingAttempt) => !importedAttempts.some((importedAttempt) => importedAttempt.id === existingAttempt.id),
    ),
  ]);
}

function mergeReviewTasks(existingTasks: ReviewTask[], importedTasks: ReviewTask[]) {
  return sortReviewTasks([
    ...importedTasks,
    ...existingTasks.filter(
      (existingTask) => !importedTasks.some((importedTask) => importedTask.id === existingTask.id),
    ),
  ]);
}

function mergeResultsByAttemptId(
  existingResultsByAttemptId: Record<string, LearningAttemptResult[]>,
  importedResultsByAttemptId: Record<string, LearningAttemptResult[]>,
) {
  return {
    ...existingResultsByAttemptId,
    ...importedResultsByAttemptId,
  };
}

function pickSummaryBase(
  existingSummary: LearnerSummaryCurrent | null,
  importedSummary: LearnerSummaryCurrent,
) {
  if (!existingSummary) {
    return importedSummary;
  }

  return isTimestampOnOrAfter(existingSummary.updatedAt, importedSummary.updatedAt)
    ? existingSummary
    : importedSummary;
}

function getLastUpdatedAt(params: {
  attempts: LearningAttempt[];
  featuredExamState: LocalLearningHistorySnapshot['featuredExamState'];
  reviewTasks: ReviewTask[];
  summary: LearnerSummaryCurrent | null;
}) {
  const timestamps = [
    params.summary?.updatedAt,
    params.featuredExamState.lastOpenedAt,
    ...params.attempts.map((attempt) => attempt.completedAt),
    ...params.reviewTasks.map((task) => task.completedAt ?? task.createdAt),
  ].filter((value): value is string => Boolean(value));

  return timestamps.sort((left, right) => compareTimestampsDesc(left, right))[0];
}

function buildRecordCount(snapshot: Omit<LocalLearningHistorySnapshot, 'lastUpdatedAt' | 'recordCount'>) {
  const resultCount = Object.values(snapshot.resultsByAttemptId).flat().length;
  const featuredExamCount = snapshot.featuredExamState.status === 'not_started' ? 0 : 1;

  return snapshot.attempts.length + resultCount + snapshot.reviewTasks.length + featuredExamCount;
}

function extractAccountKeyFromStorageKey(key: string) {
  const prefixes = [
    StorageKeys.learningAttemptsPrefix,
    StorageKeys.learningAttemptResultsPrefix,
    StorageKeys.reviewTasksPrefix,
    StorageKeys.learnerSummaryCurrentPrefix,
  ];

  const prefix = prefixes.find((candidate) => key.startsWith(candidate));
  if (!prefix) {
    return null;
  }

  return key.slice(prefix.length);
}

export class LocalLearningHistorySnapshotStore {
  async loadSnapshot(sourceAccountKey: string): Promise<LocalLearningHistorySnapshot | null> {
    const [attempts, resultsByAttemptId, reviewTasks, summary] = await Promise.all([
      readLearningHistoryJson<LearningAttempt[]>(getAttemptsStorageKey(sourceAccountKey), []),
      readLearningHistoryJson<Record<string, LearningAttemptResult[]>>(
        getAttemptResultsStorageKey(sourceAccountKey),
        {},
      ),
      readLearningHistoryJson<ReviewTask[]>(getReviewTasksStorageKey(sourceAccountKey), []),
      readLearningHistoryJson<LearnerSummaryCurrent | null>(getSummaryStorageKey(sourceAccountKey), null),
    ]);

    const featuredExamState = summary?.featuredExamState ?? createDefaultFeaturedExamState();
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

  async findLatestAnonymousSnapshot(): Promise<LocalLearningHistorySnapshot | null> {
    const keys = await AsyncStorage.getAllKeys();
    const anonymousAccountKeys = Array.from(
      new Set(
        keys
          .map(extractAccountKeyFromStorageKey)
          .filter((accountKey): accountKey is string => Boolean(accountKey?.startsWith('anon:'))),
      ),
    );

    const snapshots = (
      await Promise.all(anonymousAccountKeys.map((accountKey) => this.loadSnapshot(accountKey)))
    ).filter((snapshot): snapshot is LocalLearningHistorySnapshot => Boolean(snapshot));

    snapshots.sort((left, right) =>
      compareTimestampsDesc(getSnapshotSortTimestamp(left), getSnapshotSortTimestamp(right)),
    );

    return snapshots[0] ?? null;
  }

  async cacheImportedSnapshot(
    targetAccountKey: string,
    snapshot: LocalLearningHistorySnapshot,
    summary: LearnerSummaryCurrent,
  ): Promise<void> {
    const importedAttempts = snapshot.attempts.map((attempt) => ({
      ...attempt,
      accountKey: targetAccountKey,
    }));
    const importedResultsByAttemptId = Object.fromEntries(
      Object.entries(snapshot.resultsByAttemptId).map(([attemptId, results]) => [
        attemptId,
        results.map((result) => ({
          ...result,
          accountKey: targetAccountKey,
        })),
      ]),
    );
    const importedReviewTasks = snapshot.reviewTasks.map((task) => ({
      ...task,
      accountKey: targetAccountKey,
    }));
    const [existingAttempts, existingResultsByAttemptId, existingReviewTasks, existingSummary] =
      await Promise.all([
        readLearningHistoryJson<LearningAttempt[]>(getAttemptsStorageKey(targetAccountKey), []),
        readLearningHistoryJson<Record<string, LearningAttemptResult[]>>(
          getAttemptResultsStorageKey(targetAccountKey),
          {},
        ),
        readLearningHistoryJson<ReviewTask[]>(getReviewTasksStorageKey(targetAccountKey), []),
        readLearningHistoryJson<LearnerSummaryCurrent | null>(getSummaryStorageKey(targetAccountKey), null),
      ]);

    const nextAttempts = mergeAttempts(existingAttempts, importedAttempts);
    const nextResultsByAttemptId = mergeResultsByAttemptId(
      existingResultsByAttemptId,
      importedResultsByAttemptId,
    );
    const nextReviewTasks = mergeReviewTasks(existingReviewTasks, importedReviewTasks);
    const nextSummary = buildSummary(
      targetAccountKey,
      nextAttempts,
      Object.values(nextResultsByAttemptId).flat(),
      nextReviewTasks,
      pickSummaryBase(existingSummary, summary),
    );

    await Promise.all([
      writeLearningHistoryJson(getAttemptsStorageKey(targetAccountKey), nextAttempts),
      writeLearningHistoryJson(getAttemptResultsStorageKey(targetAccountKey), nextResultsByAttemptId),
      writeLearningHistoryJson(getReviewTasksStorageKey(targetAccountKey), nextReviewTasks),
      writeLearningHistoryJson(getSummaryStorageKey(targetAccountKey), nextSummary),
    ]);
  }
}

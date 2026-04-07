import {
  learningHistoryGetLearnerSummaryUrl,
  learningHistoryGetLearningAttemptResultsUrl,
  learningHistoryImportLocalSnapshotUrl,
  learningHistoryListLearningAttemptsUrl,
  learningHistoryListReviewTasksUrl,
  learningHistoryRecordAttemptUrl,
  learningHistorySaveFeaturedExamStateUrl,
} from '@/constants/env';
import type { AuthClient } from '@/features/auth/auth-client';

import { FirebaseLearningHistoryRepository } from './firebase-learning-history-repository';
import type { LearningHistoryRepository } from './history-repository';
import { LocalLearningHistoryRepository } from './local-learning-history-repository';
import { LearningHistoryRepositoryRouter } from './learning-history-repository-router';

export function isLearningHistoryRemoteCrudConfigured() {
  return Boolean(
    learningHistoryRecordAttemptUrl &&
      learningHistoryGetLearnerSummaryUrl &&
      learningHistorySaveFeaturedExamStateUrl &&
      learningHistoryListLearningAttemptsUrl &&
      learningHistoryGetLearningAttemptResultsUrl &&
      learningHistoryListReviewTasksUrl,
  );
}

export function isLearningHistoryImportConfigured() {
  return Boolean(learningHistoryImportLocalSnapshotUrl);
}

export function createLearningHistoryRepository(authClient: AuthClient): LearningHistoryRepository {
  const localRepository = new LocalLearningHistoryRepository();
  const remoteRepository = isLearningHistoryRemoteCrudConfigured()
    ? new FirebaseLearningHistoryRepository({
      authClient,
      recordLearningAttemptUrl: learningHistoryRecordAttemptUrl,
      getLearnerSummaryUrl: learningHistoryGetLearnerSummaryUrl,
      saveFeaturedExamStateUrl: learningHistorySaveFeaturedExamStateUrl,
      listLearningAttemptsUrl: learningHistoryListLearningAttemptsUrl,
      getLearningAttemptResultsUrl: learningHistoryGetLearningAttemptResultsUrl,
      listReviewTasksUrl: learningHistoryListReviewTasksUrl,
    })
    : null;

  return new LearningHistoryRepositoryRouter({
    authClient,
    localRepository,
    remoteRepository,
  });
}

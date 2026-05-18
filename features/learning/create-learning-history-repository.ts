import {
  learningHistoryGetLearnerSummaryUrl,
  learningHistoryGetLearningAttemptResultsUrl,
  learningHistoryImportLocalSnapshotUrl,
  learningHistoryListLearningAttemptsUrl,
  learningHistoryListReviewTasksUrl,
  learningHistoryRecordAttemptUrl,
  learningHistorySaveFeaturedExamStateUrl,
  learningHistorySaveReviewTasksUrl,
} from '@/constants/env';
import type { AuthClient } from '@/features/auth/auth-client';

import { FirebaseLearningHistoryRepository } from './firebase-learning-history-repository';
import type { LearningHistoryRepository } from './history-repository';
import { LocalLearningHistoryRepository } from './local-learning-history-repository';
import { LearningHistoryRepositoryRouter } from './learning-history-repository-router';
import { RemoteReviewTaskStore } from './remote-review-task-store';
import { LocalReviewTaskStore, type ReviewTaskStore } from './review-task-store';
import { ReviewTaskStoreRouter } from './review-task-store-router';

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

// 복습 task 전용 게이트 — 기존 isLearningHistoryRemoteCrudConfigured와 독립.
// save URL 미설정 시 학습기록 전체가 아니라 복습 동기화만 로컬 폴백.
export function isReviewTaskRemoteSyncConfigured() {
  return Boolean(learningHistoryListReviewTasksUrl && learningHistorySaveReviewTasksUrl);
}

export function createReviewTaskStore(authClient: AuthClient): ReviewTaskStore {
  const localStore = new LocalReviewTaskStore();
  const remoteStore = isReviewTaskRemoteSyncConfigured()
    ? new RemoteReviewTaskStore({
        authClient,
        listReviewTasksUrl: learningHistoryListReviewTasksUrl,
        saveReviewTasksUrl: learningHistorySaveReviewTasksUrl,
      })
    : null;

  return new ReviewTaskStoreRouter({ authClient, localStore, remoteStore });
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

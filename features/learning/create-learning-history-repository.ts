import {
  learningHistoryGetLearnerSummaryUrl,
  learningHistoryGetLearningAttemptResultsUrl,
  learningHistoryListLearningAttemptsUrl,
  learningHistoryRecordAttemptUrl,
  learningHistorySaveFeaturedExamStateUrl,
} from '@/constants/env';
import type { AuthClient } from '@/features/auth/auth-client';

import { FirebaseLearningHistoryRepository } from './firebase-learning-history-repository';
import type { LearningHistoryRepository } from './history-repository';
import { LocalLearningHistoryRepository } from './local-learning-history-repository';

export function createLearningHistoryRepository(authClient: AuthClient): LearningHistoryRepository {
  if (
    learningHistoryRecordAttemptUrl &&
    learningHistoryGetLearnerSummaryUrl &&
    learningHistorySaveFeaturedExamStateUrl &&
    learningHistoryListLearningAttemptsUrl &&
    learningHistoryGetLearningAttemptResultsUrl
  ) {
    return new FirebaseLearningHistoryRepository({
      authClient,
      recordLearningAttemptUrl: learningHistoryRecordAttemptUrl,
      getLearnerSummaryUrl: learningHistoryGetLearnerSummaryUrl,
      saveFeaturedExamStateUrl: learningHistorySaveFeaturedExamStateUrl,
      listLearningAttemptsUrl: learningHistoryListLearningAttemptsUrl,
      getLearningAttemptResultsUrl: learningHistoryGetLearningAttemptResultsUrl,
    });
  }

  return new LocalLearningHistoryRepository();
}

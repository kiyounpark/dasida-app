import {
  learningHistoryGetLearnerSummaryUrl,
  learningHistoryRecordAttemptUrl,
  learningHistorySaveFeaturedExamStateUrl,
} from '@/constants/env';

import { FirebaseLearningHistoryRepository } from './firebase-learning-history-repository';
import type { LearningHistoryRepository } from './history-repository';
import { LocalLearningHistoryRepository } from './local-learning-history-repository';

export function createLearningHistoryRepository(): LearningHistoryRepository {
  if (
    learningHistoryRecordAttemptUrl &&
    learningHistoryGetLearnerSummaryUrl &&
    learningHistorySaveFeaturedExamStateUrl
  ) {
    return new FirebaseLearningHistoryRepository({
      recordLearningAttemptUrl: learningHistoryRecordAttemptUrl,
      getLearnerSummaryUrl: learningHistoryGetLearnerSummaryUrl,
      saveFeaturedExamStateUrl: learningHistorySaveFeaturedExamStateUrl,
    });
  }

  return new LocalLearningHistoryRepository();
}

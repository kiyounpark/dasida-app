import { getApps, initializeApp } from 'firebase-admin/app';

if (getApps().length === 0) {
  initializeApp();
}

export { diagnoseMethod } from './diagnosis-method';
export { explainDiagnosisNode } from './explain-diagnosis-node';
export { getLearningAttemptResultsHandler as getLearningAttemptResults } from './get-learning-attempt-results';
export { getLearnerSummaryHandler as getLearnerSummary } from './get-learner-summary';
export { importLocalLearningHistoryHandler as importLocalLearningHistory } from './import-local-learning-history';
export { listLearningAttemptsHandler as listLearningAttempts } from './list-learning-attempts';
export { recordLearningAttemptHandler as recordLearningAttempt } from './record-learning-attempt';
export { saveFeaturedExamStateHandler as saveFeaturedExamState } from './save-featured-exam-state';

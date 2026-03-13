import { getApps, initializeApp } from 'firebase-admin/app';

if (getApps().length === 0) {
  initializeApp();
}

export { diagnoseMethod } from './diagnosis-method';
export { explainDiagnosisNode } from './explain-diagnosis-node';
export { getLearnerSummaryHandler as getLearnerSummary } from './get-learner-summary';
export { recordLearningAttemptHandler as recordLearningAttempt } from './record-learning-attempt';
export { saveFeaturedExamStateHandler as saveFeaturedExamState } from './save-featured-exam-state';

import { getApps, initializeApp } from 'firebase-admin/app';

if (getApps().length === 0) {
  initializeApp();
}

export { diagnoseMethod } from './diagnosis-method';
export { analyzePhoto } from './analyze-photo';
export { explainDiagnosisNode } from './explain-diagnosis-node';
export { verifyQuiz } from './verify-quiz';
export { getLearningAttemptResultsHandler as getLearningAttemptResults } from './get-learning-attempt-results';
export { getLearnerSummaryHandler as getLearnerSummary } from './get-learner-summary';
export { importLocalLearningHistoryHandler as importLocalLearningHistory } from './import-local-learning-history';
export { listLearningAttemptsHandler as listLearningAttempts } from './list-learning-attempts';
export { recordLearningAttemptHandler as recordLearningAttempt } from './record-learning-attempt';
export { saveFeaturedExamStateHandler as saveFeaturedExamState } from './save-featured-exam-state';
export { reviewFeedback } from './review-feedback';
export { deleteAccountHandler as deleteAccount } from './delete-account';
export { listReviewTasksHandler as listReviewTasks } from './list-review-tasks';
export { saveReviewTasksHandler as saveReviewTasks } from './save-review-tasks';
export { registerPushTokenHandler as registerPushToken } from './register-push-token';
// 1.0.11 사진 저장 (줄 0 껍데기 — 약속 파일 functions/src/photo-store-contract.ts)
export { saveConsentHandler as saveConsent } from './save-consent';
export { getConsentHandler as getConsent } from './get-consent';
export { savePhotoNoteHandler as savePhotoNote } from './save-photo-note';
export { listPhotoNotesHandler as listPhotoNotes } from './list-photo-notes';
export { getPhotoNoteImageHandler as getPhotoNoteImage } from './get-photo-note-image';
export {
  sendReviewRemindersMorning,
  sendReviewRemindersEvening,
} from './send-review-reminders';
export { reviewRouter } from './review-router';

export const diagnosisRouterUrl = (process.env.EXPO_PUBLIC_DIAGNOSIS_ROUTER_URL ?? '').trim();
export const diagnosisExplainUrl = (process.env.EXPO_PUBLIC_DIAGNOSIS_EXPLAIN_URL ?? '').trim();
export const expoPublicFirebaseApiKey = (process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '').trim();
export const expoPublicFirebaseAuthDomain = (process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '').trim();
export const expoPublicFirebaseProjectId = (process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '').trim();
export const expoPublicFirebaseAppId = (process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '').trim();
export const expoPublicFirebaseMessagingSenderId = (
  process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? ''
).trim();
export const expoPublicFirebaseStorageBucket = (
  process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? ''
).trim();
export const expoPublicGoogleIosClientId = (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '').trim();
export const expoPublicGoogleAndroidClientId = (
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? ''
).trim();
export const expoPublicGoogleWebClientId = (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '').trim();
export const learningHistoryRecordAttemptUrl = (
  process.env.EXPO_PUBLIC_RECORD_LEARNING_ATTEMPT_URL ?? ''
).trim();
export const learningHistoryGetLearnerSummaryUrl = (
  process.env.EXPO_PUBLIC_GET_LEARNER_SUMMARY_URL ?? ''
).trim();
export const learningHistorySaveFeaturedExamStateUrl = (
  process.env.EXPO_PUBLIC_SAVE_FEATURED_EXAM_STATE_URL ?? ''
).trim();
export const learningHistoryListLearningAttemptsUrl = (
  process.env.EXPO_PUBLIC_LIST_LEARNING_ATTEMPTS_URL ?? ''
).trim();
export const learningHistoryGetLearningAttemptResultsUrl = (
  process.env.EXPO_PUBLIC_GET_LEARNING_ATTEMPT_RESULTS_URL ?? ''
).trim();
export const learningHistoryImportLocalSnapshotUrl = (
  process.env.EXPO_PUBLIC_IMPORT_LOCAL_LEARNING_HISTORY_URL ?? ''
).trim();

export const diagnosisRouterTimeoutMs = 8000;
export const diagnosisExplainTimeoutMs = 12000;

export const reviewFeedbackUrl = (process.env.EXPO_PUBLIC_REVIEW_FEEDBACK_URL ?? '').trim();
export const reviewFeedbackTimeoutMs = 10000;

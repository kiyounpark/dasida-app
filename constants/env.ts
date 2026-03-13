export const diagnosisRouterUrl = (process.env.EXPO_PUBLIC_DIAGNOSIS_ROUTER_URL ?? '').trim();
export const diagnosisExplainUrl = (process.env.EXPO_PUBLIC_DIAGNOSIS_EXPLAIN_URL ?? '').trim();
export const learningHistoryRecordAttemptUrl = (
  process.env.EXPO_PUBLIC_RECORD_LEARNING_ATTEMPT_URL ?? ''
).trim();
export const learningHistoryGetLearnerSummaryUrl = (
  process.env.EXPO_PUBLIC_GET_LEARNER_SUMMARY_URL ?? ''
).trim();
export const learningHistorySaveFeaturedExamStateUrl = (
  process.env.EXPO_PUBLIC_SAVE_FEATURED_EXAM_STATE_URL ?? ''
).trim();

export const diagnosisRouterTimeoutMs = 8000;
export const diagnosisExplainTimeoutMs = 12000;

// features/quiz/exam/exam-result-navigation.ts
import { router } from 'expo-router';

// resumed=1: result 화면이 resume 흐름을 식별해 초기 recordAttempt(비멱등 POST)를 건너뛴다.
// 최초 채점 시 이미 recordAttempt가 호출됐기 때문이다.
export const RESUMED_PARAM_VALUE = '1';

export function navigateBackToExamResult(isResumed: boolean) {
  // fresh: result가 스택에 있어 back()으로 복원 → remount 없어 saveAttempted ref 유지.
  // resume: 스택에 result 없으므로 replace로 명시 navigate.
  if (isResumed) {
    router.replace(`/quiz/exam/result?resumed=${RESUMED_PARAM_VALUE}`);
  } else {
    router.back();
  }
}

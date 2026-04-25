// app/(tabs)/quiz/exam/diagnosis.tsx
import { Redirect, useLocalSearchParams } from 'expo-router';

import { getSingleParam } from '@/utils/get-single-param';

/**
 * 이전 라우트 (/quiz/exam/diagnosis) → 신규 라우트 (/quiz/exam/diagnosis-session)로 리다이렉트.
 * 파라미터 호환: 단일 problemNumber → wrongProblemNumbers=[problemNumber], startIndex=0
 */
export default function ExamDiagnosisRedirect() {
  const params = useLocalSearchParams();
  const examId = getSingleParam(params.examId) ?? '';
  const problemNumber = getSingleParam(params.problemNumber) ?? '1';

  return (
    <Redirect
      href={{
        pathname: '/quiz/exam/diagnosis-session',
        params: {
          examId,
          wrongProblemNumbers: JSON.stringify([Number(problemNumber)]),
          startIndex: '0',
        },
      }}
    />
  );
}

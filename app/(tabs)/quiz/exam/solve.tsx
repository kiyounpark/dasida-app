import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { ExamSolveScreen } from '@/features/quiz/exam/screens/exam-solve-screen';
import { getSingleParam } from '@/utils/get-single-param';

export default function ExamSolveRoute() {
  const params = useLocalSearchParams();
  const examId = getSingleParam(params.examId) ?? '';

  useEffect(() => {
    if (!examId) router.back();
  }, [examId]);

  if (!examId) return null;
  return <ExamSolveScreen examId={examId} />;
}

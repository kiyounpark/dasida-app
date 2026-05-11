import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { ExamSolveScreen } from '@/features/quiz/exam/screens/exam-solve-screen';
import type { ExamSource } from '@/features/analytics/event-types';
import { getSingleParam } from '@/utils/get-single-param';

const VALID_SOURCES: ExamSource[] = ['no_review_day_card', 'exam_selection', 'journey_hub', 'other'];

function toExamSource(raw: string | undefined): ExamSource {
  if (raw && (VALID_SOURCES as string[]).includes(raw)) return raw as ExamSource;
  return 'other';
}

export default function ExamSolveRoute() {
  const params = useLocalSearchParams();
  const examId = getSingleParam(params.examId) ?? '';
  const source = toExamSource(getSingleParam(params.source));

  useEffect(() => {
    if (!examId) router.back();
  }, [examId]);

  if (!examId) return null;
  return <ExamSolveScreen examId={examId} source={source} />;
}

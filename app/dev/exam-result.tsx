import { useEffect, useMemo } from 'react';
import { router } from 'expo-router';

import { EXAM_CATALOG_BY_ID } from '@/features/quiz/data/exam-catalog';
import { getExamProblems } from '@/features/quiz/data/exam-problems';
import { ExamSessionProvider, useExamSession } from '@/features/quiz/exam/exam-session';
import type { ProblemTile } from '@/features/quiz/exam/hooks/use-exam-result-screen';
import { ExamResultScreenView } from '@/features/quiz/exam/screens/exam-result-screen-view';

const EXAM_ID = 'g1-academic-2026-03';

/**
 * ExamResultScreen 대신 ExamResultScreenView를 직접 렌더링합니다.
 * → useExamResultScreen의 recordAttempt 호출을 건너뛰어 실제 Firebase 저장 방지
 */
function MockExamResultWrapper() {
  const { initExam, setAnswer, submitExam, state } = useExamSession();
  const examProblems = useMemo(() => getExamProblems(EXAM_ID), []);

  useEffect(() => {
    if (state.hasStarted) return;

    // 앞 10문제: 정답 / 다음 10문제: 오답 / 나머지: 미풀이
    initExam(EXAM_ID, examProblems);
    examProblems.forEach((p, i) => {
      if (i < 10) {
        setAnswer(i, p.answer);
      } else if (i < 20) {
        const wrong = (p.answer % 5) + 1;
        setAnswer(i, wrong === p.answer ? (wrong % 5) + 1 : wrong);
      }
    });
    submitExam();
    // 마운트 1회만 실행 — dispatch는 내부적으로 reducer만 호출하므로 stale closure 없음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const result = state.result;
  if (!result) return null;

  const wrongCount = result.perProblem.filter(
    (p) => !p.isCorrect && p.userAnswer !== null,
  ).length;

  const problemTiles: ProblemTile[] = result.perProblem
    .filter((p) => !p.isCorrect)
    .sort((a, b) => {
      const aBlank = a.userAnswer === null;
      const bBlank = b.userAnswer === null;
      if (aBlank !== bBlank) return aBlank ? 1 : -1;
      const aScore = examProblems.find((ep) => ep.number === a.number)?.score ?? 0;
      const bScore = examProblems.find((ep) => ep.number === b.number)?.score ?? 0;
      return bScore - aScore;
    })
    .map((p) => {
      const ep = examProblems.find((e) => e.number === p.number);
      return {
        number: p.number,
        topic: ep?.topic ?? '문제',
        score: ep?.score ?? 0,
        status: (p.userAnswer === null ? 'blank' : 'undone') satisfies ProblemTile['status'],
      };
    });

  return (
    <ExamResultScreenView
      diagnosedCount={0}
      examTitle={EXAM_CATALOG_BY_ID[result.examId]?.title ?? result.examId}
      onAnalyzeProblem={(n) =>
        router.push({
          pathname: '/quiz/exam/diagnosis',
          params: {
            examId: result.examId,
            problemNumber: String(n),
            wrongCount: String(wrongCount),
            diagnosedCount: '0',
          },
        })
      }
      onReturnHome={() => router.replace('/dev')}
      problemTiles={problemTiles}
      result={result}
      saveState="saved"
      wrongCount={wrongCount}
    />
  );
}

export default function DevExamResultScreen() {
  return (
    <ExamSessionProvider>
      <MockExamResultWrapper />
    </ExamSessionProvider>
  );
}

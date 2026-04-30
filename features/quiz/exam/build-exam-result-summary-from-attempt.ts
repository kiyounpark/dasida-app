import type { LearningAttempt, LearningAttemptResult } from '@/features/learning/types';

import { getExamProblems } from '@/features/quiz/data/exam-problems';

import type { ExamProblemResult, ExamResultSummary } from './types';

export function buildExamResultSummaryFromAttempt(input: {
  attempt: LearningAttempt;
  results: LearningAttemptResult[];
}): ExamResultSummary {
  const { attempt, results } = input;
  const examId = attempt.sourceEntityId ?? '';
  const problems = examId ? getExamProblems(examId) : [];
  const scoreByNumber = new Map(problems.map((p) => [p.number, p.score]));

  const sortedResults = [...results].sort((a, b) => a.questionNumber - b.questionNumber);

  let correct = 0;
  let wrong = 0;
  let unanswered = 0;
  let totalScore = 0;
  let maxScore = 0;

  const perProblem: ExamProblemResult[] = sortedResults.map((r) => {
    const score = scoreByNumber.get(r.questionNumber) ?? 0;
    maxScore += score;
    const userAnswer = r.selectedIndex ?? null;
    const earnedScore = r.isCorrect ? score : 0;
    if (r.isCorrect) {
      correct += 1;
      totalScore += score;
    } else if (userAnswer === null) {
      unanswered += 1;
    } else {
      wrong += 1;
    }
    return {
      number: r.questionNumber,
      userAnswer,
      correctAnswer:
        problems.find((p) => p.number === r.questionNumber)?.answer ?? 0,
      isCorrect: r.isCorrect,
      earnedScore,
    };
  });

  const total = sortedResults.length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return {
    attemptId: attempt.id,
    examId,
    startedAt: attempt.startedAt,
    completedAt: attempt.completedAt,
    total,
    correct,
    wrong,
    unanswered,
    accuracy,
    totalScore,
    maxScore,
    perProblem,
  };
}

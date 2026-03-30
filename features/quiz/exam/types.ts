import type { ExamProblem } from '@/features/quiz/data/exam-problems';

export type ExamAnswer = number | null; // null = 미답변, number = 선택/입력값

export type ExamProblemResult = {
  number: number;
  userAnswer: ExamAnswer;
  correctAnswer: number;
  isCorrect: boolean;
  earnedScore: number;
};

export type ExamResultSummary = {
  attemptId: string;
  examId: string;
  startedAt: string;
  completedAt: string;
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
  accuracy: number;   // 0-100 integer (correct / total * 100)
  totalScore: number; // 맞은 문제 배점 합계
  maxScore: number;   // 전체 배점 합계
  perProblem: ExamProblemResult[];
};

export type ExamSessionState = {
  examId: string;
  problems: ExamProblem[];
  currentIndex: number;          // 0-based
  answers: ExamAnswer[];         // answers[i] = answer for problems[i]
  hasStarted: boolean;
  startedAt: string | null;
  attemptId: string | null;
  isFinished: boolean;
  result: ExamResultSummary | null;
};

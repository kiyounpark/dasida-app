import type { SolveMethodId } from '@/data/diagnosisTree';
import type { WeaknessId } from '@/data/diagnosisMap';

export type QuizAnswer = {
  problemId: string;
  selectedIndex: number;
  isCorrect: boolean;
  methodId?: SolveMethodId;
  weaknessId?: WeaknessId;
};

export type QuizResultSummary = {
  total: number;
  correct: number;
  wrong: number;
  accuracy: number;
  allCorrect: boolean;
  topWeaknesses: WeaknessId[];
};

export type PracticeMode = 'weakness' | 'challenge';

export type QuizSessionState = {
  hasStarted: boolean;
  currentQuestionIndex: number;
  answers: QuizAnswer[];
  weaknessScores: Record<WeaknessId, number>;
  result?: QuizResultSummary;
  practiceMode?: PracticeMode;
  practiceQueue: WeaknessId[];
  practiceIndex: number;
  practiceCompleted: boolean;
  challengeCompleted: boolean;
};

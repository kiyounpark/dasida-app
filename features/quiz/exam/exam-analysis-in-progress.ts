import type { WeaknessId } from '@/data/diagnosisMap';
import type { ExamResultSummary } from './types';

export type LatestExamAttemptSummary = {
  examId: string;
  attemptId: string;
  attemptDateISO: string;
  wrongProblemNumbers: number[];
  result: ExamResultSummary | null;
};

export type AnalysisInProgressInput = {
  latestAttempt: LatestExamAttemptSummary | null;
  diagnosedProblems: Record<number, WeaknessId>;
};

export type DiagnosedNote = {
  problemNumber: number;
  weaknessId: WeaknessId;
};

export type AnalysisInProgressState =
  | { isInProgress: false }
  | {
      isInProgress: true;
      examId: string;
      attemptId: string;
      noteCount: number;
      totalNotes: number;
      diagnosedNotes: DiagnosedNote[];
    };

export function computeAnalysisInProgressState(
  input: AnalysisInProgressInput,
): AnalysisInProgressState {
  const { latestAttempt, diagnosedProblems } = input;

  if (!latestAttempt || latestAttempt.wrongProblemNumbers.length === 0) {
    return { isInProgress: false };
  }

  const totalNotes = latestAttempt.wrongProblemNumbers.length;
  const diagnosedNotes: DiagnosedNote[] = latestAttempt.wrongProblemNumbers
    .filter((n) => diagnosedProblems[n] !== undefined)
    .map((n) => ({ problemNumber: n, weaknessId: diagnosedProblems[n]! }));

  if (diagnosedNotes.length >= totalNotes) {
    return { isInProgress: false };
  }

  return {
    isInProgress: true,
    examId: latestAttempt.examId,
    attemptId: latestAttempt.attemptId,
    noteCount: diagnosedNotes.length,
    totalNotes,
    diagnosedNotes,
  };
}

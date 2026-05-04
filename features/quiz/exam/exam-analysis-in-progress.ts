import type { WeaknessId } from '@/data/diagnosisMap';
import type { ExamResultSummary } from './types';

export type LatestExamAttemptSummary = {
  examId: string;
  attemptId: string;
  attemptDateISO: string;
  wrongProblemNumbers: number[];
  result: ExamResultSummary | null;
};

export type DiagnosedNote = {
  problemNumber: number;
  weaknessId: WeaknessId;
};

export type AnalysisInProgressItem = {
  examId: string;
  attemptId: string;
  attemptDateISO: string;
  noteCount: number;
  totalNotes: number;
  diagnosedNotes: DiagnosedNote[];
};

export type AnalysisInProgressInput = {
  latestAttempts: LatestExamAttemptSummary[];
  diagnosedProblemsByAttempt: Record<string, Record<number, WeaknessId>>;
};

export type AnalysisInProgressState =
  | { isInProgress: false }
  | { isInProgress: true; items: AnalysisInProgressItem[] };

export function computeAnalysisInProgressState(
  input: AnalysisInProgressInput,
): AnalysisInProgressState {
  const { latestAttempts, diagnosedProblemsByAttempt } = input;

  const items: AnalysisInProgressItem[] = [];
  for (const attempt of latestAttempts) {
    if (attempt.result === null) continue;
    if (attempt.wrongProblemNumbers.length === 0) continue;

    const totalNotes = attempt.wrongProblemNumbers.length;
    const diagnosed = diagnosedProblemsByAttempt[attempt.attemptId] ?? {};
    const diagnosedNotes: DiagnosedNote[] = attempt.wrongProblemNumbers
      .filter((n) => diagnosed[n] !== undefined)
      .map((n) => ({ problemNumber: n, weaknessId: diagnosed[n]! }));

    if (diagnosedNotes.length >= totalNotes) continue;

    items.push({
      examId: attempt.examId,
      attemptId: attempt.attemptId,
      attemptDateISO: attempt.attemptDateISO,
      noteCount: diagnosedNotes.length,
      totalNotes,
      diagnosedNotes,
    });
  }

  if (items.length === 0) return { isInProgress: false };
  return { isInProgress: true, items };
}

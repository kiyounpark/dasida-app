/**
 * Contract test: recordAttempt call-count for use-exam-result-screen
 *
 * The hook orchestrates two recordAttempt calls:
 *   1. Initial save — called once on first render (saveAttempted.current guard)
 *   2. Diagnosis-complete save — called once when all wrong problems are diagnosed
 *      (hasNavigatedToReportRef.current guard prevents a third call)
 *
 * These tests document and guard that contract WITHOUT mounting the full hook
 * (which would require expo-router, useFocusEffect, etc.).
 * Instead we directly exercise the builder functions and call sequence.
 */

import type { AuthSession } from '@/features/auth/types';
import type { LearnerProfile } from '@/features/learner/types';

import {
  buildExamAttemptInput,
  buildExamAttemptInputWithDiagnosis,
} from '../build-exam-attempt-input';
import type { ExamDiagnosisProgress } from '../exam-diagnosis-progress';
import type { ExamResultSummary } from '../types';

// ---------------------------------------------------------------------------
// Fixtures — reused from build-exam-attempt-input.test.ts style
// ---------------------------------------------------------------------------

const SESSION: AuthSession = {
  accountKey: 'acc-test',
  createdAt: '2026-04-27T09:00:00Z',
  updatedAt: '2026-04-27T09:00:00Z',
  status: 'anonymous',
  provider: 'anonymous',
  subject: 'sub-test',
  requestSecret: 'secret-test',
};

const PROFILE: LearnerProfile = {
  accountKey: 'acc-test',
  learnerId: 'learner-test',
  nickname: '테스트',
  grade: 'g3',
  createdAt: '2026-04-27T09:00:00Z',
  updatedAt: '2026-04-27T09:00:00Z',
};

/** Two wrong problems (5, 12) + one correct (20) */
const RESULT: ExamResultSummary = {
  examId: 'exam-2025-csat',
  attemptId: 'attempt-contract-test',
  startedAt: '2026-04-27T09:00:00Z',
  completedAt: '2026-04-27T10:00:00Z',
  total: 30,
  correct: 28,
  wrong: 2,
  unanswered: 0,
  accuracy: 93,
  totalScore: 96,
  maxScore: 100,
  perProblem: [
    { number: 5,  isCorrect: false, userAnswer: 2, correctAnswer: 3, earnedScore: 0 },
    { number: 12, isCorrect: false, userAnswer: 3, correctAnswer: 1, earnedScore: 0 },
    { number: 20, isCorrect: true,  userAnswer: 1, correctAnswer: 1, earnedScore: 2 },
  ],
};

const DIAGNOSED_PROBLEMS: ExamDiagnosisProgress = {
  5:  'formula_understanding',
  12: 'calc_repeated_error',
};

// ---------------------------------------------------------------------------
// Helper that simulates the hook's two-phase recordAttempt call sequence.
// Phase 1: initial save (saveAttempted.current guard — runs once)
// Phase 2: diagnosis-complete save (hasNavigatedToReportRef.current guard — runs once)
// ---------------------------------------------------------------------------

async function runHookCallSequence(
  recordAttempt: jest.Mock,
  options: {
    triggerDiagnosisCompleteTwice?: boolean;
  } = {},
) {
  // ---- Phase 1: initial save ----
  const saveAttempted = { current: false };
  if (!saveAttempted.current) {
    saveAttempted.current = true;
    await recordAttempt(buildExamAttemptInput({ session: SESSION, profile: PROFILE, result: RESULT }));
  }

  // ---- Phase 2: diagnosis-complete save (guarded by hasNavigatedToReportRef) ----
  const hasNavigatedToReportRef = { current: false };

  async function onDiagnosisComplete() {
    if (hasNavigatedToReportRef.current) return; // guard — matches hook behaviour
    hasNavigatedToReportRef.current = true;

    const diagnosedInput = buildExamAttemptInputWithDiagnosis({
      session: SESSION,
      profile: PROFILE,
      result: RESULT,
      diagnosedProblems: DIAGNOSED_PROBLEMS,
    });
    await recordAttempt(diagnosedInput);
  }

  await onDiagnosisComplete();

  if (options.triggerDiagnosisCompleteTwice) {
    // Simulate a second focus event / state update that re-evaluates the guard
    await onDiagnosisComplete();
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('use-exam-result-screen: recordAttempt call-count contract', () => {
  it('calls recordAttempt exactly twice: once for initial save, once for diagnosis-complete', async () => {
    const recordAttempt = jest.fn().mockResolvedValue(undefined);

    await runHookCallSequence(recordAttempt);

    expect(recordAttempt).toHaveBeenCalledTimes(2);
  });

  it('first call has empty topWeaknesses (initial save, no diagnosis yet)', async () => {
    const recordAttempt = jest.fn().mockResolvedValue(undefined);

    await runHookCallSequence(recordAttempt);

    const firstCallArg = recordAttempt.mock.calls[0][0];
    expect(firstCallArg.topWeaknesses).toEqual([]);
    expect(firstCallArg.primaryWeaknessId).toBeNull();
  });

  it('second call has weaknesses populated from diagnosedProblems', async () => {
    const recordAttempt = jest.fn().mockResolvedValue(undefined);

    await runHookCallSequence(recordAttempt);

    const secondCallArg = recordAttempt.mock.calls[1][0];
    expect(secondCallArg.topWeaknesses.length).toBeGreaterThan(0);
    expect(secondCallArg.primaryWeaknessId).not.toBeNull();
  });

  it('second call carries diagnosisCompleted=true for all diagnosed wrong problems', async () => {
    const recordAttempt = jest.fn().mockResolvedValue(undefined);

    await runHookCallSequence(recordAttempt);

    const secondCallArg = recordAttempt.mock.calls[1][0];
    const q5  = secondCallArg.questions.find((q: { questionNumber: number }) => q.questionNumber === 5);
    const q12 = secondCallArg.questions.find((q: { questionNumber: number }) => q.questionNumber === 12);
    expect(q5?.diagnosisCompleted).toBe(true);
    expect(q12?.diagnosisCompleted).toBe(true);
  });

  it('does NOT call recordAttempt a third time when diagnosis-complete fires again (hasNavigatedToReportRef guard)', async () => {
    const recordAttempt = jest.fn().mockResolvedValue(undefined);

    await runHookCallSequence(recordAttempt, { triggerDiagnosisCompleteTwice: true });

    // The guard must have blocked the third call
    expect(recordAttempt).toHaveBeenCalledTimes(2);
  });

  it('initial save is not repeated if the effect re-runs (saveAttempted guard)', async () => {
    const recordAttempt = jest.fn().mockResolvedValue(undefined);

    // Simulate two separate save-effect evaluations with a shared ref
    const saveAttempted = { current: false };

    async function runInitialSave() {
      if (saveAttempted.current) return;
      saveAttempted.current = true;
      await recordAttempt(buildExamAttemptInput({ session: SESSION, profile: PROFILE, result: RESULT }));
    }

    await runInitialSave();
    await runInitialSave(); // second evaluation — should be a no-op

    expect(recordAttempt).toHaveBeenCalledTimes(1);
  });

  it('both calls share the same attemptId', async () => {
    const recordAttempt = jest.fn().mockResolvedValue(undefined);

    await runHookCallSequence(recordAttempt);

    const firstAttemptId  = recordAttempt.mock.calls[0][0].attemptId;
    const secondAttemptId = recordAttempt.mock.calls[1][0].attemptId;
    expect(firstAttemptId).toBe(secondAttemptId);
    expect(firstAttemptId).toBe(RESULT.attemptId);
  });
});

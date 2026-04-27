import type { AuthSession } from '@/features/auth/types';
import type { LearnerProfile } from '@/features/learner/types';
import { buildExamAttemptInput, buildExamAttemptInputWithDiagnosis } from '../build-exam-attempt-input';
import type { ExamDiagnosisProgress } from '../exam-diagnosis-progress';
import type { ExamResultSummary } from '../types';

const SESSION: AuthSession = {
  accountKey: 'acc-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  status: 'anonymous',
  provider: 'anonymous',
  subject: 'sub-1',
  requestSecret: 'secret-1',
};

const PROFILE: LearnerProfile = {
  accountKey: 'acc-1',
  learnerId: 'learner-1',
  nickname: '테스트',
  grade: 'g2',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const RESULT: ExamResultSummary = {
  examId: 'exam-2025-csat',
  attemptId: 'attempt-abc',
  startedAt: '2026-04-27T09:00:00Z',
  completedAt: '2026-04-27T10:00:00Z',
  total: 30,
  correct: 27,
  wrong: 2,
  unanswered: 1,
  accuracy: 90,
  totalScore: 88,
  maxScore: 100,
  perProblem: [
    { number: 5, isCorrect: false, userAnswer: 2, correctAnswer: 3, earnedScore: 0 },
    { number: 12, isCorrect: false, userAnswer: 3, correctAnswer: 1, earnedScore: 0 },
    { number: 20, isCorrect: true, userAnswer: 1, correctAnswer: 1, earnedScore: 2 },
  ],
};

describe('buildExamAttemptInputWithDiagnosis', () => {
  it('finalWeaknessId를 diagnosedProblems에서 채운다', () => {
    const diagnosedProblems: ExamDiagnosisProgress = {
      5: 'formula_understanding',
      12: 'calc_repeated_error',
    };
    const input = buildExamAttemptInputWithDiagnosis({
      session: SESSION,
      profile: PROFILE,
      result: RESULT,
      diagnosedProblems,
    });

    const q5 = input.questions.find((q) => q.questionNumber === 5);
    const q12 = input.questions.find((q) => q.questionNumber === 12);
    const q20 = input.questions.find((q) => q.questionNumber === 20);

    expect(q5?.finalWeaknessId).toBe('formula_understanding');
    expect(q5?.diagnosisCompleted).toBe(true);
    expect(q12?.finalWeaknessId).toBe('calc_repeated_error');
    expect(q12?.diagnosisCompleted).toBe(true);
    expect(q20?.finalWeaknessId).toBeNull(); // 정답 문제 — 진단 없음
    expect(q20?.diagnosisCompleted).toBe(false);
  });

  it('topWeaknesses를 빈도순으로 채운다', () => {
    const diagnosedProblems: ExamDiagnosisProgress = {
      5: 'formula_understanding',
      12: 'formula_understanding',
      15: 'calc_repeated_error',
    };
    const input = buildExamAttemptInputWithDiagnosis({
      session: SESSION,
      profile: PROFILE,
      result: RESULT,
      diagnosedProblems,
    });

    expect(input.topWeaknesses[0]).toBe('formula_understanding'); // 2회
    expect(input.topWeaknesses[1]).toBe('calc_repeated_error'); // 1회
  });

  it('primaryWeaknessId는 topWeaknesses[0]이다', () => {
    const diagnosedProblems: ExamDiagnosisProgress = {
      5: 'calc_repeated_error',
      12: 'formula_understanding',
    };
    const input = buildExamAttemptInputWithDiagnosis({
      session: SESSION,
      profile: PROFILE,
      result: RESULT,
      diagnosedProblems,
    });

    expect(input.primaryWeaknessId).toBe(input.topWeaknesses[0]);
  });

  it('diagnosedProblems가 비어 있으면 topWeaknesses는 빈 배열, primaryWeaknessId는 null', () => {
    const input = buildExamAttemptInputWithDiagnosis({
      session: SESSION,
      profile: PROFILE,
      result: RESULT,
      diagnosedProblems: {},
    });

    expect(input.topWeaknesses).toEqual([]);
    expect(input.primaryWeaknessId).toBeNull();
  });

  it('attemptId, source 등 기본 필드는 buildExamAttemptInput과 동일하다', () => {
    const base = buildExamAttemptInput({ session: SESSION, profile: PROFILE, result: RESULT });
    const withDiag = buildExamAttemptInputWithDiagnosis({
      session: SESSION,
      profile: PROFILE,
      result: RESULT,
      diagnosedProblems: {},
    });

    expect(withDiag.attemptId).toBe(base.attemptId);
    expect(withDiag.source).toBe(base.source);
    expect(withDiag.accountKey).toBe(base.accountKey);
  });
});

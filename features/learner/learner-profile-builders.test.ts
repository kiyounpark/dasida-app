import { buildProfileForPendingResume } from './learner-profile-builders';
import type { LearnerProfile, PendingDiagnosisResumeState } from './types';

function makeProfile(overrides: Partial<LearnerProfile> = {}): LearnerProfile {
  return {
    accountKey: 'test-account',
    learnerId: 'test-learner',
    nickname: '테스트',
    grade: 'g2',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const RESUME_STATE: PendingDiagnosisResumeState = {
  schemaVersion: 1,
  attemptId: 'attempt-1',
  startedAt: '2026-04-24T10:00:00.000Z',
  savedAt: '2026-04-24T10:05:00.000Z',
  totalQuestions: 10,
  answers: [],
  weaknessScores: {} as any,
  diagnosisQueue: [0, 1, 2],
};

describe('buildProfileForPendingResume', () => {
  it('sets pendingDiagnosisResume on the returned profile', () => {
    const result = buildProfileForPendingResume(makeProfile(), RESUME_STATE);
    expect(result.pendingDiagnosisResume).toEqual(RESUME_STATE);
  });

  it('clears pendingDiagnosticStartedAt to enforce mutual exclusion invariant', () => {
    // pendingDiagnosticStartedAt(퀴즈 진행 중)과 pendingDiagnosisResume(분석 재개)은
    // 동시에 존재해서는 안 된다 — setPendingDiagnosisResume이 이 invariant를 보장한다.
    const profile = makeProfile({ pendingDiagnosticStartedAt: '2026-04-24T00:00:00Z' });
    const result = buildProfileForPendingResume(profile, RESUME_STATE);
    expect(result.pendingDiagnosticStartedAt).toBeUndefined();
  });

  it('does not mutate the original profile', () => {
    const profile = makeProfile({ pendingDiagnosticStartedAt: '2026-04-24T00:00:00Z' });
    buildProfileForPendingResume(profile, RESUME_STATE);
    expect(profile.pendingDiagnosticStartedAt).toBe('2026-04-24T00:00:00Z');
  });
});

import { getCurrentState } from './home-journey-state';
import type { DiagnosticSummarySnapshot, LearnerProfile, PendingDiagnosisResumeState } from '@/features/learner/types';
import type { LearnerSummaryCurrent } from '@/features/learning/types';

// ── 픽스처 헬퍼 ──────────────────────────────────────────────────
// 각 테스트는 해당 state를 만드는 데 필요한 필드만 overrides로 지정한다.

function makeSummary(overrides: Partial<LearnerSummaryCurrent> = {}): LearnerSummaryCurrent {
  return {
    accountKey: 'test-account',
    updatedAt: '2026-01-01T00:00:00Z',
    repeatedWeaknesses: [],
    dueReviewTasks: [],
    featuredExamState: { examId: 'test-exam', status: 'not_started' },
    totals: { diagnosticAttempts: 0, featuredExamAttempts: 0, reviewAttempts: 0 },
    recentActivity: [],
    ...overrides,
  };
}

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

// 재사용 픽스처 상수 — 타임스탬프 기준: completedAt = 09:00
const COMPLETED_DIAGNOSTIC: DiagnosticSummarySnapshot = {
  attemptId: 'attempt-1',
  completedAt: '2026-04-01T09:00:00Z',
  topWeaknesses: [],
  accuracy: 0.7,
  weaknessAccuracies: {},
};

// savedAt = 10:05 (COMPLETED_DIAGNOSTIC.completedAt 이후) → hasValidPendingResume = true
const PENDING_RESUME: PendingDiagnosisResumeState = {
  schemaVersion: 1,
  attemptId: 'resume-attempt',
  startedAt: '2026-04-01T10:00:00Z',
  savedAt: '2026-04-01T10:05:00Z',
  totalQuestions: 10,
  answers: [],
  weaknessScores: {} as any,
  diagnosisQueue: [1, 2, 3],
};

// ── 테스트 케이스 ─────────────────────────────────────────────────
describe('getCurrentState', () => {
  // 8개 state 전수

  it('1: returns journey_graduated when practiceGraduatedAt is set', () => {
    const state = getCurrentState(
      makeSummary(),
      makeProfile({ practiceGraduatedAt: '2026-04-01T00:00:00Z' })
    );
    expect(state).toBe('journey_graduated');
  });

  it('2: returns diagnostic_analysis_pending when pendingDiagnosisResume is valid and no completed attempt', () => {
    const state = getCurrentState(
      makeSummary(), // latestDiagnosticSummary 없음 → attemptId 충돌 없음
      makeProfile({ pendingDiagnosisResume: PENDING_RESUME })
    );
    expect(state).toBe('diagnostic_analysis_pending');
  });

  it('3: returns diagnostic_in_progress when pendingDiagnosticStartedAt is after latestDiagnosticSummary.completedAt', () => {
    const state = getCurrentState(
      makeSummary({ latestDiagnosticSummary: COMPLETED_DIAGNOSTIC }),
      // 10:00 > COMPLETED_DIAGNOSTIC.completedAt(09:00) → isPendingDiagnosticFresh = true
      makeProfile({ pendingDiagnosticStartedAt: '2026-04-01T10:00:00Z' })
    );
    expect(state).toBe('diagnostic_in_progress');
  });

  it('4: returns journey_not_started when latestDiagnosticSummary is absent', () => {
    const state = getCurrentState(makeSummary(), makeProfile());
    expect(state).toBe('journey_not_started');
  });

  it('5: returns journey_complete_pending when recentActivity has review entry after latest diagnostic', () => {
    const state = getCurrentState(
      makeSummary({
        latestDiagnosticSummary: COMPLETED_DIAGNOSTIC,
        recentActivity: [{
          id: 'act-1',
          kind: 'review',
          title: '연습',
          subtitle: '',
          occurredAt: '2026-04-01T12:00:00Z', // 09:00 이후
        }],
      }),
      makeProfile()
    );
    expect(state).toBe('journey_complete_pending');
  });

  it('6: returns practice_in_progress when viewedAt is set and pendingPracticeStartedAt is after latest diagnostic completedAt', () => {
    const state = getCurrentState(
      makeSummary({ latestDiagnosticSummary: COMPLETED_DIAGNOSTIC }),
      makeProfile({
        latestDiagnosticResultViewedAt: '2026-04-01T10:00:00Z',
        pendingPracticeStartedAt: '2026-04-01T11:00:00Z', // 09:00 이후 → isPendingPracticeFresh = true
      })
    );
    expect(state).toBe('practice_in_progress');
  });

  it('7: returns viewed_pre_practice when latestDiagnosticResultViewedAt is set and no fresh pending practice', () => {
    const state = getCurrentState(
      makeSummary({ latestDiagnosticSummary: COMPLETED_DIAGNOSTIC }),
      makeProfile({ latestDiagnosticResultViewedAt: '2026-04-01T10:00:00Z' })
      // pendingPracticeStartedAt 없음 → isPendingPracticeFresh = false
    );
    expect(state).toBe('viewed_pre_practice');
  });

  it('8: returns result_pending (default) when diagnostic is complete but result not viewed', () => {
    const state = getCurrentState(
      makeSummary({ latestDiagnosticSummary: COMPLETED_DIAGNOSTIC }),
      makeProfile() // latestDiagnosticResultViewedAt 없음
    );
    expect(state).toBe('result_pending');
  });

  // 우선순위 회귀

  it('9: journey_graduated wins over diagnostic_analysis_pending (priority 1 > 2)', () => {
    const state = getCurrentState(
      makeSummary(),
      makeProfile({
        practiceGraduatedAt: '2026-04-01T00:00:00Z',
        pendingDiagnosisResume: PENDING_RESUME, // 둘 다 존재해도 1번이 먼저
      })
    );
    expect(state).toBe('journey_graduated');
  });

  it('10: diagnostic_analysis_pending wins over diagnostic_in_progress (priority 2 > 3)', () => {
    const state = getCurrentState(
      makeSummary(), // latestDiagnosticSummary 없음
      makeProfile({
        pendingDiagnosisResume: PENDING_RESUME,
        pendingDiagnosticStartedAt: '2026-04-01T11:00:00Z', // 둘 다 fresh여도 2번이 먼저
      })
    );
    expect(state).toBe('diagnostic_analysis_pending');
  });
});

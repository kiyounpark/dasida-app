// tests/home-journey-state.test.ts
//
// Unit tests for buildHomeJourneyState() / getCurrentState() logic.
// Focus: edge cases around pendingDiagnosisResume + pendingDiagnosticStartedAt.
//
// Run via: npm run test:pure

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Use relative import to avoid @/ alias runtime issues in compiled JS.
// tsc-alias rewrites @/ after compilation, but relative imports are simpler here.
import { buildHomeJourneyState } from '../features/learning/home-journey-state.js';
import { buildProfileForPendingResume } from '../features/learner/learner-profile-builders.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeProfile(overrides: Partial<any> = {}): any {
  return {
    accountKey: 'user:test',
    learnerId: 'test-id',
    nickname: 'test',
    grade: 'g1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeSummary(overrides: Partial<any> = {}): any {
  return {
    accountKey: 'user:test',
    updatedAt: '2026-01-01T00:00:00.000Z',
    repeatedWeaknesses: [],
    dueReviewTasks: [],
    featuredExamState: { examId: '', status: 'not_started' },
    totals: { diagnosticAttempts: 0, featuredExamAttempts: 0, reviewAttempts: 0 },
    recentActivity: [],
    ...overrides,
  };
}

function makePendingResume(attemptId = 'attempt-1'): any {
  return {
    schemaVersion: 1 as const,
    attemptId,
    startedAt: '2026-04-24T10:00:00.000Z',
    savedAt: '2026-04-24T10:05:00.000Z',
    totalQuestions: 10,
    answers: [],
    weaknessScores: {},
    diagnosisQueue: [0, 1, 2],
  };
}

// ─── tests ───────────────────────────────────────────────────────────────────

test('시나리오 1: pendingDiagnosisResume(유효) + pendingDiagnosticStartedAt 동시 존재 → diagnostic_analysis_pending', () => {
  // pendingDiagnosisResume is valid: diagnosisQueue is non-empty and attemptId
  // does not match any completed diagnostic summary.
  const profile = makeProfile({
    pendingDiagnosisResume: makePendingResume('attempt-1'),
    pendingDiagnosticStartedAt: '2026-04-24T09:00:00.000Z',
  });
  const summary = makeSummary();

  const result = buildHomeJourneyState(summary, profile);

  assert.equal(
    result.currentStateKey,
    'diagnostic_analysis_pending',
    '두 플래그가 동시에 존재할 때 pendingDiagnosisResume이 우선되어야 한다',
  );
});

test('시나리오 2: pendingDiagnosticStartedAt만 존재 (resume 없음, 완료 진단 없음) → diagnostic_in_progress', () => {
  const profile = makeProfile({
    pendingDiagnosticStartedAt: '2026-04-24T09:00:00.000Z',
  });
  const summary = makeSummary();

  const result = buildHomeJourneyState(summary, profile);

  assert.equal(
    result.currentStateKey,
    'diagnostic_in_progress',
    '진행 중 진단만 있을 때 diagnostic_in_progress여야 한다',
  );
});

test('시나리오 3: 유효한 pendingDiagnosisResume만 존재 (pendingDiagnosticStartedAt 없음) → diagnostic_analysis_pending', () => {
  const profile = makeProfile({
    pendingDiagnosisResume: makePendingResume('attempt-2'),
  });
  const summary = makeSummary();

  const result = buildHomeJourneyState(summary, profile);

  assert.equal(
    result.currentStateKey,
    'diagnostic_analysis_pending',
    '유효한 resume만 존재할 때 diagnostic_analysis_pending이어야 한다',
  );
});

test('시나리오 4: 아무 플래그도 없고 진단 기록도 없음 → journey_not_started', () => {
  const profile = makeProfile();
  const summary = makeSummary();

  const result = buildHomeJourneyState(summary, profile);

  assert.equal(
    result.currentStateKey,
    'journey_not_started',
    '아무 기록 없을 때 journey_not_started여야 한다',
  );
});

test('시나리오 5: 아무 플래그도 없고 완료된 진단이 있음 → result_pending', () => {
  const profile = makeProfile();
  const summary = makeSummary({
    latestDiagnosticSummary: {
      attemptId: 'attempt-done',
      completedAt: '2026-04-20T10:00:00.000Z',
      topWeaknesses: ['formula_understanding'],
      accuracy: 0.7,
      weaknessAccuracies: { formula_understanding: 0.5 },
    },
  });

  const result = buildHomeJourneyState(summary, profile);

  assert.equal(
    result.currentStateKey,
    'result_pending',
    '완료된 진단이 있고 결과를 안 봤으면 result_pending이어야 한다',
  );
});

test('setPendingDiagnosisResume 후 프로필: pendingDiagnosticStartedAt이 제거되어야 한다 (컨트롤러 fix 회귀 방지)', () => {
  const profileBeforeExit: any = makeProfile({
    pendingDiagnosticStartedAt: '2026-04-24T00:00:00.000Z',
  });

  const resumeState = makePendingResume('attempt-regression-test');

  // 실제 컨트롤러가 사용하는 함수를 직접 호출 — fix 제거 시 아래 assert 실패
  const nextProfile = buildProfileForPendingResume(profileBeforeExit, resumeState);

  assert.equal(
    nextProfile.pendingDiagnosticStartedAt,
    undefined,
    'setPendingDiagnosisResume 후 pendingDiagnosticStartedAt이 남아있으면 안 된다',
  );
  assert.deepEqual(nextProfile.pendingDiagnosisResume, resumeState);

  // 상태 머신도 올바른 상태를 반환하는지 확인
  const summary = makeSummary();
  const result = buildHomeJourneyState(summary, nextProfile);
  assert.equal(result.currentStateKey, 'diagnostic_analysis_pending');
});

test('보너스: pendingDiagnosisResume.attemptId === latestDiagnosticSummary.attemptId → 무효 resume, diagnostic_in_progress 아님', () => {
  // If the same attemptId is already completed, the resume is considered stale.
  // With no pendingDiagnosticStartedAt set and the diagnostic already done,
  // we expect result_pending (not diagnostic_analysis_pending).
  const sharedAttemptId = 'attempt-already-done';
  const profile = makeProfile({
    pendingDiagnosisResume: makePendingResume(sharedAttemptId),
  });
  const summary = makeSummary({
    latestDiagnosticSummary: {
      attemptId: sharedAttemptId,
      completedAt: '2026-04-20T10:00:00.000Z',
      topWeaknesses: ['formula_understanding'],
      accuracy: 0.8,
      weaknessAccuracies: { formula_understanding: 0.6 },
    },
  });

  const result = buildHomeJourneyState(summary, profile);

  assert.notEqual(
    result.currentStateKey,
    'diagnostic_analysis_pending',
    '이미 완료된 attemptId의 resume은 무효로 처리되어야 한다',
  );
  assert.equal(
    result.currentStateKey,
    'result_pending',
    '무효 resume + 완료된 진단 → result_pending이어야 한다',
  );
});

test('current-learner-controller: setPendingDiagnosisResume은 buildProfileForPendingResume을 사용한다 (인라인 재도입 방지)', () => {
  // 컨트롤러 소스를 직접 읽어 call site를 검증한다.
  // Firebase 의존성 때문에 컨트롤러를 직접 인스턴스화할 수 없으므로 소스 텍스트로 확인한다.
  const source = readFileSync(
    resolve(process.cwd(), 'features/learner/current-learner-controller.ts'),
    'utf-8',
  );

  // import 선언 확인
  assert.ok(
    source.includes('buildProfileForPendingResume'),
    'current-learner-controller가 buildProfileForPendingResume을 import하지 않음 — ' +
    'setPendingDiagnosisResume에 pendingDiagnosticStartedAt: undefined 없는 인라인 객체 구성이 재도입됐을 수 있음',
  );

  // setPendingDiagnosisResume 메서드 내에서 호출 확인
  const methodMatch = source.match(
    /setPendingDiagnosisResume[\s\S]{0,500}?buildProfileForPendingResume/,
  );
  assert.ok(
    methodMatch !== null,
    'setPendingDiagnosisResume 메서드 내에서 buildProfileForPendingResume을 호출하지 않음 — ' +
    'invariant 보장 없는 인라인 객체 구성으로 되돌아갔을 수 있음',
  );
});

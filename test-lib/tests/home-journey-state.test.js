"use strict";
// tests/home-journey-state.test.ts
//
// Unit tests for buildHomeJourneyState() / getCurrentState() logic.
// Focus: edge cases around pendingDiagnosisResume + pendingDiagnosticStartedAt.
//
// Run via: npm run test:pure
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
// Use relative import to avoid @/ alias runtime issues in compiled JS.
// tsc-alias rewrites @/ after compilation, but relative imports are simpler here.
const home_journey_state_js_1 = require("../features/learning/home-journey-state.js");
// ─── helpers ─────────────────────────────────────────────────────────────────
function makeProfile(overrides = {}) {
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
function makeSummary(overrides = {}) {
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
function makePendingResume(attemptId = 'attempt-1') {
    return {
        schemaVersion: 1,
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
(0, node_test_1.default)('시나리오 1: pendingDiagnosisResume(유효) + pendingDiagnosticStartedAt 동시 존재 → diagnostic_analysis_pending', () => {
    // pendingDiagnosisResume is valid: diagnosisQueue is non-empty and attemptId
    // does not match any completed diagnostic summary.
    const profile = makeProfile({
        pendingDiagnosisResume: makePendingResume('attempt-1'),
        pendingDiagnosticStartedAt: '2026-04-24T09:00:00.000Z',
    });
    const summary = makeSummary();
    const result = (0, home_journey_state_js_1.buildHomeJourneyState)(summary, profile);
    strict_1.default.equal(result.currentStateKey, 'diagnostic_analysis_pending', '두 플래그가 동시에 존재할 때 pendingDiagnosisResume이 우선되어야 한다');
});
(0, node_test_1.default)('시나리오 2: pendingDiagnosticStartedAt만 존재 (resume 없음, 완료 진단 없음) → diagnostic_in_progress', () => {
    const profile = makeProfile({
        pendingDiagnosticStartedAt: '2026-04-24T09:00:00.000Z',
    });
    const summary = makeSummary();
    const result = (0, home_journey_state_js_1.buildHomeJourneyState)(summary, profile);
    strict_1.default.equal(result.currentStateKey, 'diagnostic_in_progress', '진행 중 진단만 있을 때 diagnostic_in_progress여야 한다');
});
(0, node_test_1.default)('시나리오 3: 유효한 pendingDiagnosisResume만 존재 (pendingDiagnosticStartedAt 없음) → diagnostic_analysis_pending', () => {
    const profile = makeProfile({
        pendingDiagnosisResume: makePendingResume('attempt-2'),
    });
    const summary = makeSummary();
    const result = (0, home_journey_state_js_1.buildHomeJourneyState)(summary, profile);
    strict_1.default.equal(result.currentStateKey, 'diagnostic_analysis_pending', '유효한 resume만 존재할 때 diagnostic_analysis_pending이어야 한다');
});
(0, node_test_1.default)('시나리오 4: 아무 플래그도 없고 진단 기록도 없음 → journey_not_started', () => {
    const profile = makeProfile();
    const summary = makeSummary();
    const result = (0, home_journey_state_js_1.buildHomeJourneyState)(summary, profile);
    strict_1.default.equal(result.currentStateKey, 'journey_not_started', '아무 기록 없을 때 journey_not_started여야 한다');
});
(0, node_test_1.default)('시나리오 5: 아무 플래그도 없고 완료된 진단이 있음 → result_pending', () => {
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
    const result = (0, home_journey_state_js_1.buildHomeJourneyState)(summary, profile);
    strict_1.default.equal(result.currentStateKey, 'result_pending', '완료된 진단이 있고 결과를 안 봤으면 result_pending이어야 한다');
});
(0, node_test_1.default)('보너스: pendingDiagnosisResume.attemptId === latestDiagnosticSummary.attemptId → 무효 resume, diagnostic_in_progress 아님', () => {
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
    const result = (0, home_journey_state_js_1.buildHomeJourneyState)(summary, profile);
    strict_1.default.notEqual(result.currentStateKey, 'diagnostic_analysis_pending', '이미 완료된 attemptId의 resume은 무효로 처리되어야 한다');
    strict_1.default.equal(result.currentStateKey, 'result_pending', '무효 resume + 완료된 진단 → result_pending이어야 한다');
});

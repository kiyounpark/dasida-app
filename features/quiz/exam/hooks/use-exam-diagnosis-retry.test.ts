/**
 * useExamDiagnosis 재시도(retry) 루프 동작 검증
 *
 * - 3회 연속 실패 시 saveError=true
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';

// ── 모듈 모킹 (jest.mock은 파일 상단으로 호이스팅됨) ──────────────────────────

jest.mock('@/features/quiz/diagnosis-flow-engine', () => ({
  createDiagnosisFlowDraft: jest.fn(() => ({
    methodId: 'formula_application',
    currentNodeId: 'final-node',
    visitedNodeIds: ['final-node'],
  })),
  getDiagnosisFlow: jest.fn(() => ({
    methodId: 'formula_application',
    nodes: {
      'final-node': { kind: 'final', weaknessId: 'lack_of_review' },
    },
  })),
  getNode: jest.fn((flow: { nodes: Record<string, unknown> }, nodeId: string) =>
    flow.nodes[nodeId] ?? null,
  ),
  advanceFromCheck: jest.fn(),
  advanceFromChoice: jest.fn(),
  advanceFromExplain: jest.fn(),
}));

jest.mock('@/data/diagnosisTree', () => ({
  methodOptions: [{ id: 'formula_application', labelKo: '공식 적용' }],
}));

jest.mock('@/data/diagnosis-method-routing', () => ({
  diagnosisMethodRoutingCatalog: {
    formula_application: { summary: '공식 적용', exampleUtterances: [] },
  },
}));

jest.mock('@/features/quiz/data/exam-problems', () => ({
  getExamProblems: jest.fn(() => [
    {
      number: 1,
      answer: 3,
      type: 'multiple_choice',
      topic: 'algebra',
      score: 5,
      diagnosisMethods: ['formula_application'],
    },
  ]),
}));

jest.mock('@/features/learner/provider');
jest.mock('@/features/quiz/exam/exam-session');
jest.mock('@/features/quiz/exam/exam-diagnosis-progress');
jest.mock('@/features/quiz/exam/exam-milestone-resolver');
jest.mock('@/features/analytics/diagnosis-analytics');
jest.mock('@/features/quiz/exam/diagnosis-mini-card-text');
jest.mock('@/features/quiz/diagnosis-router');
jest.mock('@/features/quiz/exam/diagnosis-milestone-progress');

// ── 모킹된 모듈 참조 ───────────────────────────────────────────────────────────

import { useCurrentLearner } from '@/features/learner/provider';
import { useExamSession } from '@/features/quiz/exam/exam-session';
import { markProblemDiagnosed } from '@/features/quiz/exam/exam-diagnosis-progress';
import { resolveMilestoneToShow } from '@/features/quiz/exam/exam-milestone-resolver';
import { buildMiniCardText } from '@/features/quiz/exam/diagnosis-mini-card-text';
import { useExamDiagnosis } from './use-exam-diagnosis';

const mockedUseCurrentLearner = jest.mocked(useCurrentLearner);
const mockedUseExamSession = jest.mocked(useExamSession);
const mockedMarkProblemDiagnosed = jest.mocked(markProblemDiagnosed);
const mockedResolveMilestoneToShow = jest.mocked(resolveMilestoneToShow);
const mockedBuildMiniCardText = jest.mocked(buildMiniCardText);

// ── 픽스처 ────────────────────────────────────────────────────────────────────

const MOCK_SESSION = { accountKey: 'account-1' };
const MOCK_PROFILE = { accountKey: 'account-1', learnerId: 'learner-1', grade: 11 };

const defaultHookArgs = {
  examId: 'exam-001',
  problemNumber: 1,
  userAnswer: 2,
  totalNotes: 5,
  currentNoteCountBeforeThis: 0,
  isLastProblem: false,
  onPauseRequested: jest.fn(),
  onComplete: jest.fn(),
};

function setupBaselineMocks(recordAttempt: jest.Mock) {
  mockedUseCurrentLearner.mockReturnValue({
    session: MOCK_SESSION,
    profile: MOCK_PROFILE,
    recordAttempt,
  } as unknown as ReturnType<typeof useCurrentLearner>);

  mockedUseExamSession.mockReturnValue({
    state: {
      result: {
        attemptId: 'attempt-abc',
        completedAt: '2026-04-27T00:00:00.000Z',
      },
    },
  } as ReturnType<typeof useExamSession>);

  mockedResolveMilestoneToShow.mockResolvedValue(null);
  mockedBuildMiniCardText.mockReturnValue({
    patternName: '패턴',
    patternDescription: '설명',
  });
}

// ── 테스트 ────────────────────────────────────────────────────────────────────

describe('useExamDiagnosis — 재시도(retry) 루프', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('3회 모두 실패하면 saveError=true이고 에러 버블이 추가됨', async () => {
    const mockRecordAttempt = jest.fn().mockResolvedValue(undefined);
    mockedMarkProblemDiagnosed.mockRejectedValue(new Error('storage full'));
    setupBaselineMocks(mockRecordAttempt);

    const { result } = renderHook(() => useExamDiagnosis(defaultHookArgs));

    // draft를 final 노드로 이동시킨다
    await act(async () => {
      result.current.onManualSelect('formula_application' as Parameters<typeof result.current.onManualSelect>[0]);
    });

    // 3회 실패 후 saveError=true를 기다린다
    await waitFor(
      () => {
        expect(result.current.saveError).toBe(true);
      },
      { timeout: 5000 },
    );

    // 에러 버블이 entries에 추가됨
    const errorBubble = result.current.entries.find(
      (e) => e.kind === 'bubble' && e.id.startsWith('save-error-'),
    );
    expect(errorBubble).toBeDefined();

    // markProblemDiagnosed는 재시도마다 diagnosedRef=false이므로 정확히 3번 호출됨
    expect(mockedMarkProblemDiagnosed).toHaveBeenCalledTimes(3);
    // recordAttempt는 한 번도 호출되지 않음 (markProblemDiagnosed가 먼저 실패)
    expect(mockRecordAttempt).not.toHaveBeenCalled();
  });

});

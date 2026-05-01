/**
 * currentLearnerController의 featured-exam 쿼리 over-fetch + filter + slice 조합 검증.
 *
 * filterLegacyPerProblemAttempts의 단위 테스트는
 * filter-legacy-per-problem-attempts.test.ts에서 다룬다.
 * 여기서는 controller가 (1) limit: 200으로 over-fetch하고,
 * (2) 필터 후 caller의 limit으로 slice하는지 확인한다.
 */

import { createCurrentLearnerController } from '../current-learner-controller';
import { createEmptyLearnerSummary } from '@/features/learning/history-repository';
import type { LearningAttempt } from '@/features/learning/types';

// home-state 빌더는 학습 상태 집계 전체를 요구한다 — controller 구성 테스트 범위 밖.
jest.mock('@/features/learning/home-state', () => ({
  buildHomeLearningState: jest.fn().mockReturnValue(null),
}));

// firebase-config는 env var를 읽는다 — 테스트 환경에서는 false 반환.
jest.mock('@/features/auth/firebase-config', () => ({
  isFirebaseAuthConfigured: jest.fn().mockReturnValue(false),
}));

function makeAttempt(id: string): LearningAttempt {
  return {
    id,
    accountKey: 'test-account',
    learnerId: 'learner-1',
    source: 'featured-exam',
    sourceEntityId: 'exam-1',
    gradeSnapshot: 'g3',
    startedAt: '2026-05-02T10:00:00.000Z',
    completedAt: '2026-05-02T10:30:00.000Z',
    questionCount: 1,
    correctCount: 0,
    wrongCount: 1,
    accuracy: 0,
    primaryWeaknessId: null,
    topWeaknesses: [],
  } as unknown as LearningAttempt;
}

const MOCK_SESSION = {
  accountKey: 'test-account',
  status: 'authenticated' as const,
  provider: 'apple' as const,
  firebaseUid: 'uid-123',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const MOCK_PROFILE = {
  accountKey: 'test-account',
  learnerId: 'learner-1',
  nickname: '테스트',
  grade: 'g3' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('createCurrentLearnerController — loadRecentAttempts (featured-exam)', () => {
  let mockListAttempts: jest.Mock;
  let controller: ReturnType<typeof createCurrentLearnerController>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockListAttempts = jest.fn().mockResolvedValue([]);

    // 의존성 최소 mock — loadRecentAttempts에 필요한 것만 구성.
    const deps = {
      authClient: {
        loadSession: jest.fn().mockResolvedValue(MOCK_SESSION),
        getSupportedProviders: jest.fn().mockReturnValue([]),
      },
      profileStore: {
        load: jest.fn().mockResolvedValue(MOCK_PROFILE),
        createInitial: jest.fn().mockResolvedValue(MOCK_PROFILE),
      },
      learningHistoryRepository: {
        loadCurrentSummary: jest
          .fn()
          .mockResolvedValue(createEmptyLearnerSummary('test-account')),
        listAttempts: mockListAttempts,
        listAttemptResults: jest.fn().mockResolvedValue([]),
        recordAttempt: jest.fn(),
        saveFeaturedExamState: jest.fn(),
        listReviewTasks: jest.fn().mockResolvedValue([]),
      },
      localLearningHistoryRepository: {
        reset: jest.fn(),
      },
      migrationService: {
        resumePendingImports: jest.fn(),
        loadStatus: jest.fn().mockResolvedValue({ state: 'empty', targetAccountKey: '' }),
        importFromLocal: jest.fn(),
      },
      peerPresenceStore: {
        load: jest.fn().mockResolvedValue(null),
        clearPreviewSnapshot: jest.fn(),
      },
      reviewTaskStore: {
        load: jest.fn().mockResolvedValue([]),
        saveAll: jest.fn(),
      },
      deleteAccountUrl: 'https://example.com/delete',
    };

    controller = createCurrentLearnerController(deps as any);
  });

  it('exam-diag-* 레코드를 필터하고 caller limit으로 slice한다', async () => {
    // 10 legacy + 8 real records → 요청 limit 5 → 5개 real records만 반환
    const legacyAttempts = Array.from({ length: 10 }, (_, i) =>
      makeAttempt(`exam-diag-exam-1-p${i}-abc`),
    );
    const realAttempts = Array.from({ length: 8 }, (_, i) =>
      makeAttempt(`exam-attempt-${i}`),
    );

    mockListAttempts.mockImplementation((_accountKey: string, options?: { source?: string }) => {
      if (options?.source === 'featured-exam') {
        return Promise.resolve([...legacyAttempts, ...realAttempts]);
      }
      return Promise.resolve([]);
    });

    const result = await controller.loadRecentAttempts({ source: 'featured-exam', limit: 5 });

    expect(result).toHaveLength(5);
    expect(result.every((a) => !a.id.startsWith('exam-diag-'))).toBe(true);
    expect(result.map((a) => a.id)).toEqual([
      'exam-attempt-0',
      'exam-attempt-1',
      'exam-attempt-2',
      'exam-attempt-3',
      'exam-attempt-4',
    ]);
  });

  it('내부 listAttempts는 caller limit이 아닌 FEATURED_EXAM_OVERFETCH_LIMIT(200)으로 fetch한다', async () => {
    mockListAttempts.mockResolvedValue([]);

    await controller.loadRecentAttempts({ source: 'featured-exam', limit: 5 });

    // featured-exam으로 호출된 listAttempts 전체가 limit: 200을 사용해야 함.
    // (buildSnapshot 내부 호출 + loadRecentAttempts 직접 호출 모두 포함)
    const featuredExamCalls = mockListAttempts.mock.calls.filter(
      ([, options]: [string, { source?: string; limit?: number }]) =>
        options?.source === 'featured-exam',
    );

    expect(featuredExamCalls.length).toBeGreaterThanOrEqual(1);
    featuredExamCalls.forEach(([, options]: [string, { source?: string; limit?: number }]) => {
      expect(options.limit).toBe(200);
    });

    // caller의 limit: 5로 호출된 적이 없어야 함
    const smallLimitCalls = mockListAttempts.mock.calls.filter(
      ([, options]: [string, { source?: string; limit?: number }]) =>
        options?.source === 'featured-exam' && options?.limit === 5,
    );
    expect(smallLimitCalls).toHaveLength(0);
  });

  it('diagnostic source는 필터 없이 그대로 반환한다', async () => {
    // exam-diag-* ID를 가진 attempt가 diagnostic source로 섞여있어도 필터 안 함
    const mixedAttempts = [
      makeAttempt('exam-diag-exam-1-p1-abc'),
      makeAttempt('attempt-regular-1'),
    ].map((a) => ({ ...a, source: 'diagnostic' as const }));

    mockListAttempts.mockImplementation((_accountKey: string, options?: { source?: string }) => {
      if (options?.source === 'diagnostic') {
        return Promise.resolve(mixedAttempts);
      }
      return Promise.resolve([]);
    });

    const result = await controller.loadRecentAttempts({ source: 'diagnostic' });

    // diagnostic은 필터 적용 없으므로 2개 모두 반환
    expect(result).toHaveLength(2);
  });
});

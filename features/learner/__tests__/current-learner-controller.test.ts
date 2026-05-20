/**
 * currentLearnerController의 featured-exam 쿼리 over-fetch + filter + slice 조합 검증.
 *
 * filterLegacyPerProblemAttempts의 단위 테스트는
 * filter-legacy-per-problem-attempts.test.ts에서 다룬다.
 * 여기서는 controller가 (1) limit: FEATURED_EXAM_OVERFETCH_LIMIT으로 over-fetch하고,
 * (2) 필터 후 caller의 limit으로 slice하는지 확인한다.
 */

import {
  createCurrentLearnerController,
  FEATURED_EXAM_OVERFETCH_LIMIT,
} from '../current-learner-controller';
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

type ListAttemptsCall = [
  accountKey: string,
  options?: { source?: string; limit?: number },
];

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

/**
 * loadRecentAttempts에 필요한 최소 의존성만 mock한다.
 * Dependencies 타입이 확장되면 `as any` 가드가 새 키를 silently 통과시키지만,
 * 그 비용은 controller 내부에서 곧 실패(undefined.method)로 surface되므로 감수.
 *
 * `mockListAttempts`는 호출자가 `mockImplementation`로 source별 응답을 주입한다.
 */
function makeMockDeps(mockListAttempts: jest.Mock) {
  return {
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
      flushPendingAttempts: jest.fn().mockResolvedValue(undefined),
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
}

describe('createCurrentLearnerController — loadRecentAttempts (featured-exam)', () => {
  let mockListAttempts: jest.Mock;
  let controller: ReturnType<typeof createCurrentLearnerController>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockListAttempts = jest.fn().mockResolvedValue([]);
    controller = createCurrentLearnerController(makeMockDeps(mockListAttempts) as any);
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

  it(`내부 listAttempts는 caller limit이 아닌 FEATURED_EXAM_OVERFETCH_LIMIT(${FEATURED_EXAM_OVERFETCH_LIMIT})으로 fetch한다`, async () => {
    mockListAttempts.mockResolvedValue([]);

    await controller.loadRecentAttempts({ source: 'featured-exam', limit: 5 });

    // featured-exam 호출 limit 수집 — buildSnapshot 내부 호출 + loadRecentAttempts 직접 호출 둘 다 포함
    const featuredExamLimits = (mockListAttempts.mock.calls as ListAttemptsCall[])
      .filter(([, options]) => options?.source === 'featured-exam')
      .map(([, options]) => options?.limit);

    // buildSnapshot 1회 + loadRecentAttempts 1회 = 정확히 2번 호출되어야 함
    // (한 쪽이 사라지면 회귀이므로 정확한 카운트로 잠금)
    expect(featuredExamLimits).toHaveLength(2);
    // 모든 호출이 over-fetch limit 사용 — caller의 5는 절대 repository에 도달하지 않음
    expect(featuredExamLimits.every((l) => l === FEATURED_EXAM_OVERFETCH_LIMIT)).toBe(true);
  });

  it('limit이 undefined이면 slice 없이 필터 결과 전체 반환', async () => {
    // controller line 419의 분기 (`requestedLimit !== undefined ? slice : filtered`) 검증
    const realAttempts = Array.from({ length: 12 }, (_, i) => makeAttempt(`exam-attempt-${i}`));
    mockListAttempts.mockImplementation((_accountKey: string, options?: { source?: string }) => {
      if (options?.source === 'featured-exam') {
        return Promise.resolve(realAttempts);
      }
      return Promise.resolve([]);
    });

    const result = await controller.loadRecentAttempts({ source: 'featured-exam' });

    expect(result).toHaveLength(12);
  });

  it('repository가 빈 배열을 반환하면 빈 배열을 그대로 반환', async () => {
    // 회귀 보호: slice/filter가 undefined나 throw 되지 않도록
    mockListAttempts.mockResolvedValue([]);

    const result = await controller.loadRecentAttempts({ source: 'featured-exam', limit: 5 });

    expect(result).toEqual([]);
  });

  it('diagnostic source는 필터 없이 그대로 반환한다 — exam-diag-* ID도 보존', async () => {
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

    // diagnostic은 필터 미적용 — 2개 모두 반환되며, 특히 legacy-prefix ID도 보존되어야 함
    expect(result).toHaveLength(2);
    expect(result.map((a) => a.id)).toContain('exam-diag-exam-1-p1-abc');
    expect(result.map((a) => a.id)).toContain('attempt-regular-1');
  });

  it('weakness-practice source는 controller의 early return 경로를 사용한다', async () => {
    // controller line 421의 비-featured-exam early return 분기 검증
    const reviewAttempt = makeAttempt('review-attempt-1');
    mockListAttempts.mockImplementation((_accountKey: string, options?: { source?: string }) => {
      if (options?.source === 'weakness-practice') {
        return Promise.resolve([reviewAttempt]);
      }
      return Promise.resolve([]);
    });

    const result = await controller.loadRecentAttempts({ source: 'weakness-practice', limit: 10 });

    expect(result).toEqual([reviewAttempt]);
    // weakness-practice 호출은 caller의 limit를 그대로 전달해야 함 (over-fetch 분기 진입 안 함)
    const weaknessCalls = (mockListAttempts.mock.calls as ListAttemptsCall[]).filter(
      ([, options]) => options?.source === 'weakness-practice',
    );
    // buildSnapshot이 limit: 20으로 호출 + loadRecentAttempts가 limit: 10으로 호출
    expect(weaknessCalls.map(([, o]) => o?.limit)).toEqual(expect.arrayContaining([20, 10]));
  });
});

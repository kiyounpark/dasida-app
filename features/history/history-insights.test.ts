import type { LearningAttempt } from '@/features/learning/types';
import type { LearnerSummaryCurrent } from '@/features/learning/types';
import type { WeaknessId } from '@/data/diagnosisMap';
import type { AnalysisInProgressState } from '@/features/quiz/exam/exam-analysis-in-progress';

const w = (s: string) => s as unknown as WeaknessId;

function makeSummary(overrides: Partial<LearnerSummaryCurrent> = {}): LearnerSummaryCurrent {
  return {
    accountKey: 'acc1',
    updatedAt: '2026-04-30T00:00:00.000Z',
    repeatedWeaknesses: [],
    dueReviewTasks: [],
    featuredExamState: { examId: '', status: 'not_started' } as LearnerSummaryCurrent['featuredExamState'],
    totals: { diagnosticAttempts: 0, featuredExamAttempts: 0, reviewAttempts: 0 },
    recentActivity: [],
    ...overrides,
  };
}

function makeExamAttempt(overrides: Partial<LearningAttempt> = {}): LearningAttempt {
  return {
    id: 'att1',
    accountKey: 'acc1',
    learnerId: 'learner1',
    source: 'featured-exam',
    sourceEntityId: 'g3-calc-mock-2025-09',
    gradeSnapshot: 'g3' as LearningAttempt['gradeSnapshot'],
    startedAt: '2026-04-29T10:00:00.000Z',
    completedAt: '2026-04-29T11:00:00.000Z',
    questionCount: 30,
    correctCount: 25,
    wrongCount: 5,
    accuracy: 83,
    primaryWeaknessId: null,
    topWeaknesses: [],
    schemaVersion: 1,
    createdAt: '2026-04-29T11:00:00.000Z',
    ...overrides,
  };
}

const NOT_IN_PROGRESS: AnalysisInProgressState = { isInProgress: false };

import { buildHero, buildExamHistoryItems, buildHistoryInsights } from './history-insights';

describe('buildHero', () => {
  it('응시 0회: examAttempts 0, averageAccuracyValue "—", topWeaknesses [], cta null', () => {
    const hero = buildHero({
      summary: makeSummary({ totals: { diagnosticAttempts: 0, featuredExamAttempts: 0, reviewAttempts: 0 } }),
      recentExamAttempts: [],
      analysisState: NOT_IN_PROGRESS,
    });

    expect(hero.examAttempts).toBe(0);
    expect(hero.averageAccuracyValue).toBe('—');
    expect(hero.topWeaknesses).toEqual([]);
    expect(hero.ctaKind).toBeNull();
    expect(hero.ctaLabel).toBeNull();
  });

  it('1회 응시: averageAccuracyValue "83%"', () => {
    const hero = buildHero({
      summary: makeSummary({
        totals: { diagnosticAttempts: 0, featuredExamAttempts: 1, reviewAttempts: 0 },
      }),
      recentExamAttempts: [makeExamAttempt({ accuracy: 83 })],
      analysisState: NOT_IN_PROGRESS,
    });

    expect(hero.examAttempts).toBe(1);
    expect(hero.averageAccuracyValue).toBe('83%');
  });

  it('3회 응시: 정답률 평균을 반올림하여 표시 (84+74+90 → 83%)', () => {
    const hero = buildHero({
      summary: makeSummary({
        totals: { diagnosticAttempts: 0, featuredExamAttempts: 3, reviewAttempts: 0 },
      }),
      recentExamAttempts: [
        makeExamAttempt({ id: 'a1', accuracy: 84 }),
        makeExamAttempt({ id: 'a2', accuracy: 74 }),
        makeExamAttempt({ id: 'a3', accuracy: 90 }),
      ],
      analysisState: NOT_IN_PROGRESS,
    });

    // 248 / 3 = 82.67 → Math.round = 83 (Math.floor would give 82)
    expect(hero.averageAccuracyValue).toBe('83%');
  });

  it('repeatedWeaknesses 상위 3개를 label과 함께 노출', () => {
    const hero = buildHero({
      summary: makeSummary({
        totals: { diagnosticAttempts: 0, featuredExamAttempts: 5, reviewAttempts: 0 },
        repeatedWeaknesses: [
          { weaknessId: w('w_calc_def'), count: 8, lastSeenAt: '2026-04-29T00:00:00.000Z' },
          { weaknessId: w('w_calc_chain'), count: 5, lastSeenAt: '2026-04-28T00:00:00.000Z' },
          { weaknessId: w('w_calc_int'), count: 3, lastSeenAt: '2026-04-27T00:00:00.000Z' },
          { weaknessId: w('w_calc_lim'), count: 2, lastSeenAt: '2026-04-26T00:00:00.000Z' },
        ],
      }),
      recentExamAttempts: [makeExamAttempt({ accuracy: 80 })],
      analysisState: NOT_IN_PROGRESS,
    });

    expect(hero.topWeaknesses).toHaveLength(3);
    expect(hero.topWeaknesses[0]).toMatchObject({ count: 8 });
    expect(hero.topWeaknesses[1]).toMatchObject({ count: 5 });
    expect(hero.topWeaknesses[2]).toMatchObject({ count: 3 });
    expect(typeof hero.topWeaknesses[0].label).toBe('string');
  });

  it('analysisState.isInProgress === true: ctaKind "resume_analysis", ctaLabel 노출', () => {
    const hero = buildHero({
      summary: makeSummary({
        totals: { diagnosticAttempts: 0, featuredExamAttempts: 1, reviewAttempts: 0 },
      }),
      recentExamAttempts: [makeExamAttempt()],
      analysisState: {
        isInProgress: true,
        items: [
          {
            examId: 'g3-calc-mock-2025-09',
            attemptId: 'att1',
            attemptDateISO: '2026-04-29T11:00:00.000Z',
            noteCount: 2,
            totalNotes: 5,
            diagnosedNotes: [
              { problemNumber: 1, weaknessId: w('w_calc_def') },
              { problemNumber: 2, weaknessId: w('w_calc_chain') },
            ],
          },
        ],
      },
    });

    expect(hero.ctaKind).toBe('resume_analysis');
    expect(hero.ctaLabel).toBe('이어서 분석하기 →');
  });

  it('analysisState.isInProgress === false: cta null', () => {
    const hero = buildHero({
      summary: makeSummary({
        totals: { diagnosticAttempts: 0, featuredExamAttempts: 1, reviewAttempts: 0 },
      }),
      recentExamAttempts: [makeExamAttempt()],
      analysisState: NOT_IN_PROGRESS,
    });

    expect(hero.ctaKind).toBeNull();
    expect(hero.ctaLabel).toBeNull();
  });
});

describe('buildExamHistoryItems', () => {
  it('빈 attempts → 빈 배열', () => {
    expect(
      buildExamHistoryItems({
        recentExamAttempts: [],
        latestAttemptId: null,
        analysisState: NOT_IN_PROGRESS,
      }),
    ).toEqual([]);
  });

  it('1건 attempt: examTitle/accuracyLabel/occurredAtLabel/isLatest 매핑', () => {
    const items = buildExamHistoryItems({
      recentExamAttempts: [
        makeExamAttempt({
          id: 'att1',
          sourceEntityId: 'g3-calc-mock-2025-09',
          accuracy: 73,
          completedAt: '2025-09-04T13:00:00.000Z',
          primaryWeaknessId: null,
          wrongCount: 5,
        }),
      ],
      latestAttemptId: 'att1',
      analysisState: NOT_IN_PROGRESS,
    });

    expect(items).toHaveLength(1);
    expect(items[0].attemptId).toBe('att1');
    expect(items[0].examId).toBe('g3-calc-mock-2025-09');
    expect(items[0].examTitle).toContain('미적분');
    expect(items[0].accuracyLabel).toBe('정답률 73%');
    expect(items[0].isLatest).toBe(true);
    expect(typeof items[0].occurredAtLabel).toBe('string');
  });

  it('latest attempt + analysisInProgress: status "in_progress", "진행 중 N/M"', () => {
    const items = buildExamHistoryItems({
      recentExamAttempts: [
        makeExamAttempt({ id: 'att-latest', wrongCount: 5, primaryWeaknessId: null }),
      ],
      latestAttemptId: 'att-latest',
      analysisState: {
        isInProgress: true,
        items: [
          {
            examId: 'g3-calc-mock-2025-09',
            attemptId: 'att-latest',
            attemptDateISO: '2026-04-29T11:00:00.000Z',
            noteCount: 2,
            totalNotes: 5,
            diagnosedNotes: [],
          },
        ],
      },
    });

    expect(items[0].status).toBe('in_progress');
    expect(items[0].statusLabel).toBe('진행 중 2/5');
  });

  it('primaryWeaknessId 있음: status "completed", "분석 완료"', () => {
    const items = buildExamHistoryItems({
      recentExamAttempts: [
        makeExamAttempt({ id: 'att1', primaryWeaknessId: w('w_calc_def'), wrongCount: 3 }),
      ],
      latestAttemptId: 'att1',
      analysisState: NOT_IN_PROGRESS,
    });

    expect(items[0].status).toBe('completed');
    expect(items[0].statusLabel).toBe('분석 완료');
  });

  it('wrongCount 0 (만점): status "completed", "만점"', () => {
    const items = buildExamHistoryItems({
      recentExamAttempts: [
        makeExamAttempt({ id: 'att1', primaryWeaknessId: null, wrongCount: 0, accuracy: 100 }),
      ],
      latestAttemptId: null,
      analysisState: NOT_IN_PROGRESS,
    });

    expect(items[0].status).toBe('completed');
    expect(items[0].statusLabel).toBe('만점');
  });

  it('primaryWeaknessId null + wrongCount > 0 + not latest: status "not_started"', () => {
    const items = buildExamHistoryItems({
      recentExamAttempts: [
        makeExamAttempt({ id: 'att-old', primaryWeaknessId: null, wrongCount: 4 }),
        makeExamAttempt({ id: 'att-latest', primaryWeaknessId: null, wrongCount: 4 }),
      ],
      latestAttemptId: 'att-latest',
      analysisState: NOT_IN_PROGRESS,
    });

    expect(items[0].status).toBe('not_started');
    expect(items[0].statusLabel).toBe('분석 미시작');
    expect(items[1].status).toBe('not_started');
  });
});

describe('buildHistoryInsights', () => {
  it('응시 0회: isEmpty true', () => {
    const insights = buildHistoryInsights({
      summary: makeSummary({
        totals: { diagnosticAttempts: 0, featuredExamAttempts: 0, reviewAttempts: 0 },
      }),
      recentExamAttempts: [],
      latestAttemptId: null,
      analysisState: NOT_IN_PROGRESS,
    });

    expect(insights.isEmpty).toBe(true);
  });

  it('응시 1회 이상: isEmpty false, hero/weaknessProgress/examHistory 채워짐', () => {
    const insights = buildHistoryInsights({
      summary: makeSummary({
        totals: { diagnosticAttempts: 0, featuredExamAttempts: 1, reviewAttempts: 0 },
      }),
      recentExamAttempts: [makeExamAttempt({ accuracy: 80 })],
      latestAttemptId: 'att1',
      analysisState: NOT_IN_PROGRESS,
    });

    expect(insights.isEmpty).toBe(false);
    expect(insights.hero.examAttempts).toBe(1);
    expect(insights.examHistory).toHaveLength(1);
    expect(Array.isArray(insights.weaknessProgress)).toBe(true);
  });
});

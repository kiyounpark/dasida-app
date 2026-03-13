import AsyncStorage from '@react-native-async-storage/async-storage';

import { StorageKeys } from '@/constants/storage-keys';
import { diagnosisMap, weaknessOrder, type WeaknessId } from '@/data/diagnosisMap';
import type { ActiveReviewTaskSummary, FeaturedExamState } from '@/features/learner/types';

import type { LearningSource, ReviewStage } from './history-types';
import {
  createDefaultFeaturedExamState,
  createEmptyLearnerSummary,
  type FinalizedAttemptInput,
  type LearningHistoryRepository,
} from './history-repository';
import type {
  LearnerSummaryCurrent,
  LearningAttempt,
  LearningAttemptResult,
  ReviewTask,
} from './types';

const REVIEW_STAGE_OFFSETS: Record<ReviewStage, number> = {
  day1: 1,
  day3: 3,
  day7: 7,
};

function getAttemptsStorageKey(accountKey: string) {
  return `${StorageKeys.learningAttemptsPrefix}${accountKey}`;
}

function getAttemptResultsStorageKey(accountKey: string) {
  return `${StorageKeys.learningAttemptResultsPrefix}${accountKey}`;
}

function getReviewTasksStorageKey(accountKey: string) {
  return `${StorageKeys.reviewTasksPrefix}${accountKey}`;
}

function getSummaryStorageKey(accountKey: string) {
  return `${StorageKeys.learnerSummaryCurrentPrefix}${accountKey}`;
}

function createTaskId(stage: ReviewStage, weaknessId: WeaknessId, sourceId: string) {
  return `${sourceId}__${weaknessId}__${stage}`;
}

function addDays(timestamp: string, days: number) {
  const nextDate = new Date(timestamp);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate.toISOString();
}

function sortAttempts(attempts: LearningAttempt[]) {
  return [...attempts].sort((left, right) => right.completedAt.localeCompare(left.completedAt));
}

function sortReviewTasks(tasks: ReviewTask[]) {
  return [...tasks].sort((left, right) => left.scheduledFor.localeCompare(right.scheduledFor));
}

function toReviewTaskSummary(task: ReviewTask): ActiveReviewTaskSummary {
  return {
    id: task.id,
    weaknessId: task.weaknessId,
    stage: task.stage,
    scheduledFor: task.scheduledFor,
    source: task.source,
    sourceId: task.sourceId,
  };
}

function buildRepeatedWeaknesses(
  results: LearningAttemptResult[],
): LearnerSummaryCurrent['repeatedWeaknesses'] {
  const orderIndex = weaknessOrder.reduce((acc, weaknessId, index) => {
    acc[weaknessId] = index;
    return acc;
  }, {} as Record<WeaknessId, number>);
  const counts = new Map<
    WeaknessId,
    {
      weaknessId: WeaknessId;
      count: number;
      lastSeenAt: string;
    }
  >();

  results
    .filter((result) => result.finalWeaknessId !== null)
    .sort((left, right) => right.resolvedAt.localeCompare(left.resolvedAt))
    .slice(0, 20)
    .forEach((result) => {
      const weaknessId = result.finalWeaknessId;
      if (!weaknessId) {
        return;
      }

      const previous = counts.get(weaknessId);
      if (!previous) {
        counts.set(weaknessId, {
          weaknessId,
          count: 1,
          lastSeenAt: result.resolvedAt,
        });
        return;
      }

      counts.set(weaknessId, {
        weaknessId,
        count: previous.count + 1,
        lastSeenAt:
          previous.lastSeenAt.localeCompare(result.resolvedAt) >= 0
            ? previous.lastSeenAt
            : result.resolvedAt,
      });
    });

  return Array.from(counts.values()).sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    const seenAtOrder = right.lastSeenAt.localeCompare(left.lastSeenAt);
    if (seenAtOrder !== 0) {
      return seenAtOrder;
    }

    return orderIndex[left.weaknessId] - orderIndex[right.weaknessId];
  });
}

function buildRecentActivity(
  attempts: LearningAttempt[],
  reviewTasks: ReviewTask[],
  featuredExamState: FeaturedExamState,
): LearnerSummaryCurrent['recentActivity'] {
  const activity: LearnerSummaryCurrent['recentActivity'] = [
    ...attempts.map((attempt) => {
      const kind: 'diagnostic' | 'exam' =
        attempt.source === 'featured-exam' ? 'exam' : 'diagnostic';

      return {
        id: attempt.id,
        kind,
        title: attempt.source === 'featured-exam' ? '대표 모의고사 완료' : '진단 완료',
        subtitle:
          attempt.topWeaknesses[0] !== undefined
            ? diagnosisMap[attempt.topWeaknesses[0]].labelKo
            : `정답률 ${attempt.accuracy}%`,
        occurredAt: attempt.completedAt,
      };
    }),
    ...reviewTasks
      .filter((task) => task.completed && task.completedAt)
      .map((task) => ({
        id: `review-${task.id}`,
        kind: 'review' as const,
        title: '복습 완료',
        subtitle: diagnosisMap[task.weaknessId].labelKo,
        occurredAt: task.completedAt!,
      })),
  ];

  if (featuredExamState.status !== 'not_started') {
    activity.push({
      id: `featured-exam-${featuredExamState.examId}`,
      kind: 'exam',
      title: '대표 모의고사 상태',
      subtitle:
        featuredExamState.status === 'completed'
          ? '완료'
          : featuredExamState.status === 'in_progress'
            ? '진행 중'
            : '미시작',
      occurredAt: featuredExamState.lastOpenedAt ?? attempts[0]?.completedAt ?? new Date().toISOString(),
    });
  }

  return activity
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
    .slice(0, 5);
}

function buildSummary(
  accountKey: string,
  attempts: LearningAttempt[],
  results: LearningAttemptResult[],
  reviewTasks: ReviewTask[],
  currentSummary: LearnerSummaryCurrent | null,
): LearnerSummaryCurrent {
  const sortedAttempts = sortAttempts(attempts);
  const latestDiagnosticAttempt = sortedAttempts.find((attempt) => attempt.source === 'diagnostic');
  const featuredExamState =
    currentSummary?.featuredExamState ?? createDefaultFeaturedExamState();
  const nextReviewTask = sortReviewTasks(reviewTasks.filter((task) => !task.completed))[0];

  return {
    accountKey,
    updatedAt: new Date().toISOString(),
    lastAttemptAt: sortedAttempts[0]?.completedAt,
    latestDiagnosticSummary: latestDiagnosticAttempt
      ? {
          attemptId: latestDiagnosticAttempt.id,
          completedAt: latestDiagnosticAttempt.completedAt,
          topWeaknesses: latestDiagnosticAttempt.topWeaknesses,
          accuracy: latestDiagnosticAttempt.accuracy,
        }
      : undefined,
    repeatedWeaknesses: buildRepeatedWeaknesses(results),
    nextReviewTask: nextReviewTask ? toReviewTaskSummary(nextReviewTask) : undefined,
    featuredExamState,
    totals: {
      diagnosticAttempts: attempts.filter((attempt) => attempt.source === 'diagnostic').length,
      featuredExamAttempts: attempts.filter((attempt) => attempt.source === 'featured-exam').length,
    },
    recentActivity: buildRecentActivity(sortedAttempts, reviewTasks, featuredExamState),
  };
}

function buildAttempt(input: FinalizedAttemptInput, createdAt: string): LearningAttempt {
  return {
    id: input.attemptId,
    accountKey: input.accountKey,
    learnerId: input.learnerId,
    source: input.source,
    sourceEntityId: input.sourceEntityId,
    gradeSnapshot: input.gradeSnapshot,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    questionCount: input.questionCount,
    correctCount: input.correctCount,
    wrongCount: input.wrongCount,
    accuracy: input.accuracy,
    primaryWeaknessId: input.primaryWeaknessId,
    topWeaknesses: input.topWeaknesses,
    schemaVersion: 1,
    createdAt,
  };
}

function buildAttemptResults(input: FinalizedAttemptInput): LearningAttemptResult[] {
  return input.questions.map((question) => ({
    id: `${input.attemptId}__${question.questionId}`,
    attemptId: input.attemptId,
    accountKey: input.accountKey,
    source: input.source,
    sourceEntityId: input.sourceEntityId,
    questionId: question.questionId,
    questionNumber: question.questionNumber,
    topic: question.topic,
    selectedIndex: question.selectedIndex,
    isCorrect: question.isCorrect,
    finalWeaknessId: question.finalWeaknessId,
    methodId: question.methodId,
    diagnosisSource: question.diagnosisSource,
    finalMethodSource: question.finalMethodSource,
    diagnosisCompleted: question.diagnosisCompleted,
    usedDontKnow: question.usedDontKnow,
    usedAiHelp: question.usedAiHelp,
    schemaVersion: 1,
    resolvedAt: input.completedAt,
  }));
}

function buildReviewTasks(
  input: FinalizedAttemptInput,
  existingTasks: ReviewTask[],
): ReviewTask[] {
  const sourceId = input.sourceEntityId ?? input.attemptId;
  const nextTasks = [...existingTasks];
  const weaknessId = input.primaryWeaknessId;

  if (!weaknessId) {
    return sortReviewTasks(nextTasks);
  }

  (Object.keys(REVIEW_STAGE_OFFSETS) as ReviewStage[]).forEach((stage) => {
    const hasExisting = nextTasks.some(
      (task) =>
        task.source === input.source &&
        task.sourceId === sourceId &&
        task.weaknessId === weaknessId &&
        task.stage === stage,
    );

    if (hasExisting) {
      return;
    }

    nextTasks.push({
      id: createTaskId(stage, weaknessId, sourceId),
      accountKey: input.accountKey,
      weaknessId,
      source: input.source,
      sourceId,
      scheduledFor: addDays(input.completedAt, REVIEW_STAGE_OFFSETS[stage]),
      stage,
      completed: false,
      createdAt: input.completedAt,
    });
  });

  return sortReviewTasks(nextTasks);
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const rawValue = await AsyncStorage.getItem(key);
  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export class LocalLearningHistoryRepository implements LearningHistoryRepository {
  async recordAttempt(input: FinalizedAttemptInput) {
    const [attempts, resultsByAttemptId, reviewTasks, currentSummary] = await Promise.all([
      readJson<LearningAttempt[]>(getAttemptsStorageKey(input.accountKey), []),
      readJson<Record<string, LearningAttemptResult[]>>(
        getAttemptResultsStorageKey(input.accountKey),
        {},
      ),
      readJson<ReviewTask[]>(getReviewTasksStorageKey(input.accountKey), []),
      this.loadCurrentSummary(input.accountKey),
    ]);

    const existingAttempt = attempts.find((attempt) => attempt.id === input.attemptId);
    const attempt = buildAttempt(input, existingAttempt?.createdAt ?? input.completedAt);
    const nextAttempts = sortAttempts([
      attempt,
      ...attempts.filter((existing) => existing.id !== input.attemptId),
    ]);
    const nextResults = buildAttemptResults(input);
    const nextResultsByAttemptId = {
      ...resultsByAttemptId,
      [input.attemptId]: nextResults,
    };
    const flatResults = Object.values(nextResultsByAttemptId).flat();
    const nextReviewTasks = buildReviewTasks(input, reviewTasks);
    const nextSummary = buildSummary(
      input.accountKey,
      nextAttempts,
      flatResults,
      nextReviewTasks,
      currentSummary,
    );

    if (attempt.source === 'featured-exam') {
      nextSummary.featuredExamState = {
        examId: attempt.sourceEntityId ?? nextSummary.featuredExamState.examId,
        status: 'completed',
        lastOpenedAt: attempt.completedAt,
      };
      nextSummary.recentActivity = buildRecentActivity(
        nextAttempts,
        nextReviewTasks,
        nextSummary.featuredExamState,
      );
    }

    await Promise.all([
      writeJson(getAttemptsStorageKey(input.accountKey), nextAttempts),
      writeJson(getAttemptResultsStorageKey(input.accountKey), nextResultsByAttemptId),
      writeJson(getReviewTasksStorageKey(input.accountKey), nextReviewTasks),
      writeJson(getSummaryStorageKey(input.accountKey), nextSummary),
    ]);

    return {
      attempt,
      results: nextResults,
      summary: nextSummary,
      reviewTasks: nextReviewTasks,
    };
  }

  async loadCurrentSummary(accountKey: string): Promise<LearnerSummaryCurrent | null> {
    return readJson<LearnerSummaryCurrent | null>(getSummaryStorageKey(accountKey), null);
  }

  async saveFeaturedExamState(
    accountKey: string,
    state: FeaturedExamState,
  ): Promise<LearnerSummaryCurrent> {
    const attempts = await readJson<LearningAttempt[]>(getAttemptsStorageKey(accountKey), []);
    const resultsByAttemptId = await readJson<Record<string, LearningAttemptResult[]>>(
      getAttemptResultsStorageKey(accountKey),
      {},
    );
    const reviewTasks = await readJson<ReviewTask[]>(getReviewTasksStorageKey(accountKey), []);
    const currentSummary = (await this.loadCurrentSummary(accountKey)) ?? createEmptyLearnerSummary(accountKey);

    const nextSummary = buildSummary(
      accountKey,
      attempts,
      Object.values(resultsByAttemptId).flat(),
      reviewTasks,
      {
        ...currentSummary,
        featuredExamState: state,
      },
    );

    nextSummary.featuredExamState = state;
    nextSummary.recentActivity = buildRecentActivity(attempts, reviewTasks, state);

    await writeJson(getSummaryStorageKey(accountKey), nextSummary);
    return nextSummary;
  }

  async listAttempts(
    accountKey: string,
    options?: { source?: LearningSource; limit?: number },
  ): Promise<LearningAttempt[]> {
    const attempts = await readJson<LearningAttempt[]>(getAttemptsStorageKey(accountKey), []);
    const filteredAttempts = options?.source
      ? attempts.filter((attempt) => attempt.source === options.source)
      : attempts;

    return typeof options?.limit === 'number'
      ? filteredAttempts.slice(0, options.limit)
      : filteredAttempts;
  }

  async listAttemptResults(accountKey: string, attemptId: string): Promise<LearningAttemptResult[]> {
    const resultsByAttemptId = await readJson<Record<string, LearningAttemptResult[]>>(
      getAttemptResultsStorageKey(accountKey),
      {},
    );
    return resultsByAttemptId[attemptId] ?? [];
  }

  async reset(accountKey: string): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(getAttemptsStorageKey(accountKey)),
      AsyncStorage.removeItem(getAttemptResultsStorageKey(accountKey)),
      AsyncStorage.removeItem(getReviewTasksStorageKey(accountKey)),
      AsyncStorage.removeItem(getSummaryStorageKey(accountKey)),
    ]);
  }

  async seedPreview(
    accountKey: string,
    state: LearnerSummaryCurrent,
    reviewTasks: ReviewTask[],
  ): Promise<void> {
    await Promise.all([
      writeJson(getSummaryStorageKey(accountKey), state),
      writeJson(getReviewTasksStorageKey(accountKey), reviewTasks),
    ]);
  }
}

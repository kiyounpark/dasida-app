import { diagnosisMap, weaknessOrder, type WeaknessId } from '@/data/diagnosisMap';
import type { ActiveReviewTaskSummary, FeaturedExamState } from '@/features/learner/types';

import type { LearningSource, ReviewStage } from './history-types';
import {
  createDefaultFeaturedExamState,
  createEmptyLearnerSummary,
  type FinalizedAttemptInput,
  type LearningHistoryRepository,
} from './history-repository';
import {
  getNextReviewStage,
  REVIEW_STAGE_OFFSETS,
} from './review-stage';
import {
  compareTimestampsAsc,
  compareTimestampsDesc,
  isTimestampOnOrBefore,
} from '@/functions/shared/timestamp-utils';
import type {
  LearnerSummaryCurrent,
  LearningAttempt,
  LearningAttemptResult,
  ReviewTask,
} from './types';
import {
  clearLearningHistoryStorage,
  getAttemptResultsStorageKey,
  getAttemptsStorageKey,
  getReviewTasksStorageKey,
  getSummaryStorageKey,
  readLearningHistoryJson,
  writeLearningHistoryJson,
} from './local-learning-history-storage';

function createTaskId(stage: ReviewStage, weaknessId: WeaknessId, sourceId: string) {
  return `${sourceId}__${weaknessId}__${stage}`;
}

function addDays(timestamp: string, days: number) {
  const nextDate = new Date(timestamp);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate.toISOString();
}

function sortAttempts(attempts: LearningAttempt[]) {
  return [...attempts].sort((left, right) => compareTimestampsDesc(left.completedAt, right.completedAt));
}

function sortReviewTasks(tasks: ReviewTask[]) {
  return [...tasks].sort((left, right) => compareTimestampsAsc(left.scheduledFor, right.scheduledFor));
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

function buildReviewTaskState(reviewTasks: ReviewTask[]) {
  const pendingReviewTasks = sortReviewTasks(reviewTasks.filter((task) => !task.completed));
  const nextReviewTask = pendingReviewTasks[0];
  const now = new Date().toISOString();
  const dueReviewTasks = pendingReviewTasks.filter((task) =>
    isTimestampOnOrBefore(task.scheduledFor, now),
  );

  return {
    nextReviewTask: nextReviewTask ? toReviewTaskSummary(nextReviewTask) : undefined,
    dueReviewTasks: dueReviewTasks.map(toReviewTaskSummary),
  };
}

function applyReviewTaskState(
  summary: LearnerSummaryCurrent,
  reviewTasks: ReviewTask[],
): LearnerSummaryCurrent {
  const reviewTaskState = buildReviewTaskState(reviewTasks);

  return {
    ...summary,
    ...reviewTaskState,
  };
}

function createReviewTask(params: {
  accountKey: string;
  weaknessId: WeaknessId;
  source: LearningSource;
  sourceId: string;
  scheduledFor: string;
  stage: ReviewStage;
  createdAt: string;
}): ReviewTask {
  return {
    id: createTaskId(params.stage, params.weaknessId, params.sourceId),
    accountKey: params.accountKey,
    weaknessId: params.weaknessId,
    source: params.source,
    sourceId: params.sourceId,
    scheduledFor: params.scheduledFor,
    stage: params.stage,
    completed: false,
    createdAt: params.createdAt,
  };
}

function buildWeaknessAccuracies(
  diagnosticAttemptId: string,
  results: LearningAttemptResult[],
): Partial<Record<WeaknessId, number>> {
  const diagnosticResults = results.filter(
    (r) => r.attemptId === diagnosticAttemptId && r.finalWeaknessId !== null,
  );

  const grouped = new Map<WeaknessId, { correct: number; total: number }>();
  for (const r of diagnosticResults) {
    const id = r.finalWeaknessId as WeaknessId;
    const existing = grouped.get(id) ?? { correct: 0, total: 0 };
    grouped.set(id, {
      correct: existing.correct + (r.isCorrect ? 1 : 0),
      total: existing.total + 1,
    });
  }

  const accuracies: Partial<Record<WeaknessId, number>> = {};
  for (const [id, { correct, total }] of grouped) {
    if (total > 0) {
      accuracies[id] = Math.round((correct / total) * 100);
    }
  }
  return accuracies;
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
    .filter(
      (result) => result.source !== 'weakness-practice' && result.finalWeaknessId !== null,
    )
    .sort((left, right) => compareTimestampsDesc(left.resolvedAt, right.resolvedAt))
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
          compareTimestampsDesc(previous.lastSeenAt, result.resolvedAt) <= 0
            ? previous.lastSeenAt
            : result.resolvedAt,
      });
    });

  return Array.from(counts.values()).sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    const seenAtOrder = compareTimestampsDesc(left.lastSeenAt, right.lastSeenAt);
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
    ...attempts
      .filter((attempt) => attempt.source !== 'weakness-practice')
      .map((attempt) => {
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
    .sort((left, right) => compareTimestampsDesc(left.occurredAt, right.occurredAt))
    .slice(0, 5);
}

export function buildSummary(
  accountKey: string,
  attempts: LearningAttempt[],
  results: LearningAttemptResult[],
  reviewTasks: ReviewTask[],
  currentSummary: LearnerSummaryCurrent | null,
): LearnerSummaryCurrent {
  const sortedAttempts = sortAttempts(attempts);
  const latestDiagnosticAttempt = sortedAttempts.find((attempt) => attempt.source === 'diagnostic');
  const latestFeaturedExamAttempt = sortedAttempts.find(
    (attempt) => attempt.source === 'featured-exam',
  );
  let featuredExamState = currentSummary?.featuredExamState ?? createDefaultFeaturedExamState();
  const reviewTaskState = buildReviewTaskState(reviewTasks);

  if (
    latestFeaturedExamAttempt &&
    (featuredExamState.status !== 'in_progress' ||
      !featuredExamState.lastOpenedAt ||
      isTimestampOnOrBefore(featuredExamState.lastOpenedAt, latestFeaturedExamAttempt.completedAt))
  ) {
    featuredExamState = {
      examId: latestFeaturedExamAttempt.sourceEntityId ?? featuredExamState.examId,
      status: 'completed',
      lastOpenedAt: latestFeaturedExamAttempt.completedAt,
    };
  }

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
          weaknessAccuracies: buildWeaknessAccuracies(latestDiagnosticAttempt.id, results),
        }
      : undefined,
    repeatedWeaknesses: buildRepeatedWeaknesses(results),
    nextReviewTask: reviewTaskState.nextReviewTask,
    dueReviewTasks: reviewTaskState.dueReviewTasks,
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
    reviewStage: input.reviewContext?.reviewStage,
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
    firstSelectedIndex: question.firstSelectedIndex,
    selectedIndex: question.selectedIndex,
    isCorrect: question.isCorrect,
    finalWeaknessId: question.finalWeaknessId,
    methodId: question.methodId,
    diagnosisSource: question.diagnosisSource,
    finalMethodSource: question.finalMethodSource,
    diagnosisCompleted: question.diagnosisCompleted,
    usedDontKnow: question.usedDontKnow,
    usedAiHelp: question.usedAiHelp,
    wrongAttempts: question.wrongAttempts,
    usedCoaching: question.usedCoaching,
    resolvedBy: question.resolvedBy,
    schemaVersion: 1,
    resolvedAt: input.completedAt,
  }));
}

function buildReviewTasks(
  input: FinalizedAttemptInput,
  existingTasks: ReviewTask[],
): ReviewTask[] {
  if (input.source === 'weakness-practice') {
    if (!input.reviewContext) {
      return sortReviewTasks(existingTasks);
    }

    const activeTask = existingTasks.find((task) => task.id === input.reviewContext?.reviewTaskId);
    if (!activeTask) {
      return sortReviewTasks(existingTasks);
    }

    const nextTasks = existingTasks.map((task) =>
      task.id === activeTask.id
        ? {
            ...task,
            completed: true,
            completedAt: input.completedAt,
          }
        : task,
    );

    const nextStage = getNextReviewStage(activeTask.stage);
    if (!nextStage) {
      return sortReviewTasks(nextTasks);
    }

    const nextTaskId = createTaskId(nextStage, activeTask.weaknessId, activeTask.sourceId);
    if (nextTasks.some((task) => task.id === nextTaskId)) {
      return sortReviewTasks(nextTasks);
    }

    nextTasks.push(
      createReviewTask({
        accountKey: input.accountKey,
        weaknessId: activeTask.weaknessId,
        source: activeTask.source,
        sourceId: activeTask.sourceId,
        scheduledFor: addDays(input.completedAt, REVIEW_STAGE_OFFSETS[nextStage]),
        stage: nextStage,
        createdAt: input.completedAt,
      }),
    );

    return sortReviewTasks(nextTasks);
  }

  if (input.source !== 'diagnostic') {
    return sortReviewTasks(existingTasks);
  }

  const reviewWeaknesses = Array.from(new Set(input.topWeaknesses.slice(0, 3)));
  if (reviewWeaknesses.length === 0) {
    return sortReviewTasks(existingTasks);
  }

  const sourceId = input.sourceEntityId ?? input.attemptId;
  const nextTasks = existingTasks.filter(
    (task) => task.completed || !reviewWeaknesses.includes(task.weaknessId),
  );

  reviewWeaknesses.forEach((weaknessId) => {
    const taskId = createTaskId('day1', weaknessId, sourceId);
    if (nextTasks.some((task) => task.id === taskId)) {
      return;
    }

    nextTasks.push(
      createReviewTask({
        accountKey: input.accountKey,
        weaknessId,
        source: input.source,
        sourceId,
        scheduledFor: addDays(input.completedAt, REVIEW_STAGE_OFFSETS.day1),
        stage: 'day1',
        createdAt: input.completedAt,
      }),
    );
  });

  return sortReviewTasks(nextTasks);
}

export class LocalLearningHistoryRepository implements LearningHistoryRepository {
  async recordAttempt(input: FinalizedAttemptInput) {
    const [attempts, resultsByAttemptId, reviewTasks, currentSummary] = await Promise.all([
      readLearningHistoryJson<LearningAttempt[]>(getAttemptsStorageKey(input.accountKey), []),
      readLearningHistoryJson<Record<string, LearningAttemptResult[]>>(
        getAttemptResultsStorageKey(input.accountKey),
        {},
      ),
      readLearningHistoryJson<ReviewTask[]>(getReviewTasksStorageKey(input.accountKey), []),
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
      writeLearningHistoryJson(getAttemptsStorageKey(input.accountKey), nextAttempts),
      writeLearningHistoryJson(getAttemptResultsStorageKey(input.accountKey), nextResultsByAttemptId),
      writeLearningHistoryJson(getReviewTasksStorageKey(input.accountKey), nextReviewTasks),
      writeLearningHistoryJson(getSummaryStorageKey(input.accountKey), nextSummary),
    ]);

    return {
      attempt,
      results: nextResults,
      summary: nextSummary,
      reviewTasks: nextReviewTasks,
    };
  }

  async loadCurrentSummary(accountKey: string): Promise<LearnerSummaryCurrent | null> {
    const [summary, reviewTasks] = await Promise.all([
      readLearningHistoryJson<LearnerSummaryCurrent | null>(getSummaryStorageKey(accountKey), null),
      readLearningHistoryJson<ReviewTask[]>(getReviewTasksStorageKey(accountKey), []),
    ]);

    if (!summary) {
      return null;
    }

    return applyReviewTaskState(summary, reviewTasks);
  }

  async cacheRecord(payload: {
    attempt: LearningAttempt;
    results: LearningAttemptResult[];
    summary: LearnerSummaryCurrent;
    reviewTasks: ReviewTask[];
  }): Promise<void> {
    const attempts = await readLearningHistoryJson<LearningAttempt[]>(
      getAttemptsStorageKey(payload.attempt.accountKey),
      [],
    );
    const resultsByAttemptId = await readLearningHistoryJson<Record<string, LearningAttemptResult[]>>(
      getAttemptResultsStorageKey(payload.attempt.accountKey),
      {},
    );

    const nextAttempts = sortAttempts([
      payload.attempt,
      ...attempts.filter((attempt) => attempt.id !== payload.attempt.id),
    ]);
    const nextResultsByAttemptId = {
      ...resultsByAttemptId,
      [payload.attempt.id]: payload.results,
    };

    await Promise.all([
      writeLearningHistoryJson(getAttemptsStorageKey(payload.attempt.accountKey), nextAttempts),
      writeLearningHistoryJson(getAttemptResultsStorageKey(payload.attempt.accountKey), nextResultsByAttemptId),
      writeLearningHistoryJson(getReviewTasksStorageKey(payload.attempt.accountKey), payload.reviewTasks),
      writeLearningHistoryJson(getSummaryStorageKey(payload.attempt.accountKey), payload.summary),
    ]);
  }

  async cacheSummary(accountKey: string, summary: LearnerSummaryCurrent): Promise<void> {
    await writeLearningHistoryJson(getSummaryStorageKey(accountKey), summary);
  }

  async cacheAttempts(accountKey: string, attempts: LearningAttempt[]): Promise<void> {
    const existingAttempts = await readLearningHistoryJson<LearningAttempt[]>(
      getAttemptsStorageKey(accountKey),
      [],
    );
    const nextAttempts = sortAttempts([
      ...attempts,
      ...existingAttempts.filter(
        (existingAttempt) => !attempts.some((attempt) => attempt.id === existingAttempt.id),
      ),
    ]);

    await writeLearningHistoryJson(getAttemptsStorageKey(accountKey), nextAttempts);
  }

  async cacheAttemptResults(
    accountKey: string,
    attemptId: string,
    results: LearningAttemptResult[],
  ): Promise<void> {
    const resultsByAttemptId = await readLearningHistoryJson<Record<string, LearningAttemptResult[]>>(
      getAttemptResultsStorageKey(accountKey),
      {},
    );
    await writeLearningHistoryJson(getAttemptResultsStorageKey(accountKey), {
      ...resultsByAttemptId,
      [attemptId]: results,
    });
  }

  async cacheReviewTasks(accountKey: string, reviewTasks: ReviewTask[]): Promise<void> {
    await writeLearningHistoryJson(getReviewTasksStorageKey(accountKey), reviewTasks);
  }

  async listReviewTasks(accountKey: string): Promise<ReviewTask[]> {
    return readLearningHistoryJson<ReviewTask[]>(getReviewTasksStorageKey(accountKey), []);
  }

  async saveFeaturedExamState(
    accountKey: string,
    state: FeaturedExamState,
  ): Promise<LearnerSummaryCurrent> {
    const attempts = await readLearningHistoryJson<LearningAttempt[]>(getAttemptsStorageKey(accountKey), []);
    const resultsByAttemptId = await readLearningHistoryJson<Record<string, LearningAttemptResult[]>>(
      getAttemptResultsStorageKey(accountKey),
      {},
    );
    const reviewTasks = await readLearningHistoryJson<ReviewTask[]>(getReviewTasksStorageKey(accountKey), []);
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

    await writeLearningHistoryJson(getSummaryStorageKey(accountKey), nextSummary);
    return nextSummary;
  }

  async listAttempts(
    accountKey: string,
    options?: { source?: LearningSource; limit?: number },
  ): Promise<LearningAttempt[]> {
    const attempts = await readLearningHistoryJson<LearningAttempt[]>(getAttemptsStorageKey(accountKey), []);
    const filteredAttempts = options?.source
      ? attempts.filter((attempt) => attempt.source === options.source)
      : attempts;

    return typeof options?.limit === 'number'
      ? filteredAttempts.slice(0, options.limit)
      : filteredAttempts;
  }

  async listAttemptResults(accountKey: string, attemptId: string): Promise<LearningAttemptResult[]> {
    const resultsByAttemptId = await readLearningHistoryJson<Record<string, LearningAttemptResult[]>>(
      getAttemptResultsStorageKey(accountKey),
      {},
    );
    return resultsByAttemptId[attemptId] ?? [];
  }

  async reset(accountKey: string): Promise<void> {
    await clearLearningHistoryStorage(accountKey);
  }

  async seedPreview(
    accountKey: string,
    state: LearnerSummaryCurrent,
    reviewTasks: ReviewTask[],
  ): Promise<void> {
    await Promise.all([
      writeLearningHistoryJson(getSummaryStorageKey(accountKey), state),
      writeLearningHistoryJson(getReviewTasksStorageKey(accountKey), reviewTasks),
    ]);
  }
}

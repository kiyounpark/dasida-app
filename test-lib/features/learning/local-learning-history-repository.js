"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalLearningHistoryRepository = void 0;
exports.buildSummary = buildSummary;
const diagnosisMap_1 = require("../../data/diagnosisMap");
const history_repository_1 = require("./history-repository");
const review_stage_1 = require("./review-stage");
const timestamp_utils_1 = require("@/functions/shared/timestamp-utils");
const local_learning_history_storage_1 = require("./local-learning-history-storage");
function createTaskId(stage, weaknessId, sourceId) {
    return `${sourceId}__${weaknessId}__${stage}`;
}
function addDays(timestamp, days) {
    const nextDate = new Date(timestamp);
    nextDate.setUTCDate(nextDate.getUTCDate() + days);
    return nextDate.toISOString();
}
function sortAttempts(attempts) {
    return [...attempts].sort((left, right) => (0, timestamp_utils_1.compareTimestampsDesc)(left.completedAt, right.completedAt));
}
function sortReviewTasks(tasks) {
    return [...tasks].sort((left, right) => (0, timestamp_utils_1.compareTimestampsAsc)(left.scheduledFor, right.scheduledFor));
}
function toReviewTaskSummary(task) {
    return {
        id: task.id,
        weaknessId: task.weaknessId,
        stage: task.stage,
        scheduledFor: task.scheduledFor,
        source: task.source,
        sourceId: task.sourceId,
    };
}
function buildReviewTaskState(reviewTasks) {
    const pendingReviewTasks = sortReviewTasks(reviewTasks.filter((task) => !task.completed));
    const nextReviewTask = pendingReviewTasks[0];
    const now = new Date().toISOString();
    const dueReviewTasks = pendingReviewTasks.filter((task) => (0, timestamp_utils_1.isTimestampOnOrBefore)(task.scheduledFor, now));
    return {
        nextReviewTask: nextReviewTask ? toReviewTaskSummary(nextReviewTask) : undefined,
        dueReviewTasks: dueReviewTasks.map(toReviewTaskSummary),
    };
}
function applyReviewTaskState(summary, reviewTasks) {
    const reviewTaskState = buildReviewTaskState(reviewTasks);
    return {
        ...summary,
        ...reviewTaskState,
    };
}
function createReviewTask(params) {
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
function buildWeaknessAccuracies(diagnosticAttemptId, results) {
    const diagnosticResults = results.filter((r) => r.attemptId === diagnosticAttemptId && r.finalWeaknessId !== null);
    const grouped = new Map();
    for (const r of diagnosticResults) {
        const id = r.finalWeaknessId;
        const existing = grouped.get(id) ?? { correct: 0, total: 0 };
        grouped.set(id, {
            correct: existing.correct + (r.isCorrect ? 1 : 0),
            total: existing.total + 1,
        });
    }
    const accuracies = {};
    for (const [id, { correct, total }] of grouped) {
        if (total > 0) {
            accuracies[id] = Math.round((correct / total) * 100);
        }
    }
    return accuracies;
}
function buildRepeatedWeaknesses(results) {
    const orderIndex = diagnosisMap_1.weaknessOrder.reduce((acc, weaknessId, index) => {
        acc[weaknessId] = index;
        return acc;
    }, {});
    const counts = new Map();
    results
        .filter((result) => result.source !== 'weakness-practice' && result.finalWeaknessId !== null)
        .sort((left, right) => (0, timestamp_utils_1.compareTimestampsDesc)(left.resolvedAt, right.resolvedAt))
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
            lastSeenAt: (0, timestamp_utils_1.compareTimestampsDesc)(previous.lastSeenAt, result.resolvedAt) <= 0
                ? previous.lastSeenAt
                : result.resolvedAt,
        });
    });
    return Array.from(counts.values()).sort((left, right) => {
        if (right.count !== left.count) {
            return right.count - left.count;
        }
        const seenAtOrder = (0, timestamp_utils_1.compareTimestampsDesc)(left.lastSeenAt, right.lastSeenAt);
        if (seenAtOrder !== 0) {
            return seenAtOrder;
        }
        return orderIndex[left.weaknessId] - orderIndex[right.weaknessId];
    });
}
function buildRecentActivity(attempts, reviewTasks, featuredExamState) {
    const activity = [
        ...attempts
            .filter((attempt) => attempt.source !== 'weakness-practice' || !attempt.reviewStage)
            .map((attempt) => {
            if (attempt.source === 'weakness-practice') {
                // reviewStage 없는 자유 약점 연습 (mode='weakness') — 복습 완료로 기록
                return {
                    id: attempt.id,
                    kind: 'review',
                    title: '복습 완료',
                    subtitle: attempt.primaryWeaknessId !== null
                        ? diagnosisMap_1.diagnosisMap[attempt.primaryWeaknessId].labelKo
                        : `정답률 ${attempt.accuracy}%`,
                    occurredAt: attempt.completedAt,
                };
            }
            const kind = attempt.source === 'featured-exam' ? 'exam' : 'diagnostic';
            return {
                id: attempt.id,
                kind,
                title: attempt.source === 'featured-exam' ? '대표 모의고사 완료' : '진단 완료',
                subtitle: attempt.topWeaknesses[0] !== undefined
                    ? diagnosisMap_1.diagnosisMap[attempt.topWeaknesses[0]].labelKo
                    : `정답률 ${attempt.accuracy}%`,
                occurredAt: attempt.completedAt,
            };
        }),
        ...reviewTasks
            .filter((task) => task.completed && task.completedAt)
            .map((task) => ({
            id: `review-${task.id}`,
            kind: 'review',
            title: '복습 완료',
            subtitle: diagnosisMap_1.diagnosisMap[task.weaknessId].labelKo,
            occurredAt: task.completedAt,
        })),
    ];
    if (featuredExamState.status !== 'not_started') {
        activity.push({
            id: `featured-exam-${featuredExamState.examId}`,
            kind: 'exam',
            title: '대표 모의고사 상태',
            subtitle: featuredExamState.status === 'completed'
                ? '완료'
                : featuredExamState.status === 'in_progress'
                    ? '진행 중'
                    : '미시작',
            occurredAt: featuredExamState.lastOpenedAt ?? attempts[0]?.completedAt ?? new Date().toISOString(),
        });
    }
    return activity
        .sort((left, right) => (0, timestamp_utils_1.compareTimestampsDesc)(left.occurredAt, right.occurredAt))
        .slice(0, 5);
}
function buildSummary(accountKey, attempts, results, reviewTasks, currentSummary) {
    const sortedAttempts = sortAttempts(attempts);
    const latestDiagnosticAttempt = sortedAttempts.find((attempt) => attempt.source === 'diagnostic');
    const latestFeaturedExamAttempt = sortedAttempts.find((attempt) => attempt.source === 'featured-exam');
    let featuredExamState = currentSummary?.featuredExamState ?? (0, history_repository_1.createDefaultFeaturedExamState)();
    const reviewTaskState = buildReviewTaskState(reviewTasks);
    if (latestFeaturedExamAttempt &&
        (featuredExamState.status !== 'in_progress' ||
            !featuredExamState.lastOpenedAt ||
            (0, timestamp_utils_1.isTimestampOnOrBefore)(featuredExamState.lastOpenedAt, latestFeaturedExamAttempt.completedAt))) {
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
            reviewAttempts: attempts.filter((attempt) => attempt.source === 'weakness-practice').length,
        },
        recentActivity: buildRecentActivity(sortedAttempts, reviewTasks, featuredExamState),
    };
}
function buildAttempt(input, createdAt) {
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
function buildAttemptResults(input) {
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
function buildReviewTasks(input, existingTasks) {
    if (input.source === 'weakness-practice') {
        if (!input.reviewContext) {
            return sortReviewTasks(existingTasks);
        }
        const activeTask = existingTasks.find((task) => task.id === input.reviewContext?.reviewTaskId);
        if (!activeTask) {
            return sortReviewTasks(existingTasks);
        }
        const nextTasks = existingTasks.map((task) => task.id === activeTask.id
            ? {
                ...task,
                completed: true,
                completedAt: input.completedAt,
            }
            : task);
        const nextStage = (0, review_stage_1.getNextReviewStage)(activeTask.stage);
        if (!nextStage) {
            return sortReviewTasks(nextTasks);
        }
        const nextTaskId = createTaskId(nextStage, activeTask.weaknessId, activeTask.sourceId);
        if (nextTasks.some((task) => task.id === nextTaskId)) {
            return sortReviewTasks(nextTasks);
        }
        nextTasks.push(createReviewTask({
            accountKey: input.accountKey,
            weaknessId: activeTask.weaknessId,
            source: activeTask.source,
            sourceId: activeTask.sourceId,
            scheduledFor: addDays(input.completedAt, review_stage_1.REVIEW_STAGE_OFFSETS[nextStage]),
            stage: nextStage,
            createdAt: input.completedAt,
        }));
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
    const nextTasks = existingTasks.filter((task) => task.completed || !reviewWeaknesses.includes(task.weaknessId));
    reviewWeaknesses.forEach((weaknessId) => {
        const taskId = createTaskId('day1', weaknessId, sourceId);
        if (nextTasks.some((task) => task.id === taskId)) {
            return;
        }
        nextTasks.push(createReviewTask({
            accountKey: input.accountKey,
            weaknessId,
            source: input.source,
            sourceId,
            scheduledFor: addDays(input.completedAt, review_stage_1.REVIEW_STAGE_OFFSETS.day1),
            stage: 'day1',
            createdAt: input.completedAt,
        }));
    });
    return sortReviewTasks(nextTasks);
}
class LocalLearningHistoryRepository {
    async recordAttempt(input) {
        const [attempts, resultsByAttemptId, reviewTasks, currentSummary] = await Promise.all([
            (0, local_learning_history_storage_1.readLearningHistoryJson)((0, local_learning_history_storage_1.getAttemptsStorageKey)(input.accountKey), []),
            (0, local_learning_history_storage_1.readLearningHistoryJson)((0, local_learning_history_storage_1.getAttemptResultsStorageKey)(input.accountKey), {}),
            (0, local_learning_history_storage_1.readLearningHistoryJson)((0, local_learning_history_storage_1.getReviewTasksStorageKey)(input.accountKey), []),
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
        const nextSummary = buildSummary(input.accountKey, nextAttempts, flatResults, nextReviewTasks, currentSummary);
        if (attempt.source === 'featured-exam') {
            nextSummary.featuredExamState = {
                examId: attempt.sourceEntityId ?? nextSummary.featuredExamState.examId,
                status: 'completed',
                lastOpenedAt: attempt.completedAt,
            };
            nextSummary.recentActivity = buildRecentActivity(nextAttempts, nextReviewTasks, nextSummary.featuredExamState);
        }
        await Promise.all([
            (0, local_learning_history_storage_1.writeLearningHistoryJson)((0, local_learning_history_storage_1.getAttemptsStorageKey)(input.accountKey), nextAttempts),
            (0, local_learning_history_storage_1.writeLearningHistoryJson)((0, local_learning_history_storage_1.getAttemptResultsStorageKey)(input.accountKey), nextResultsByAttemptId),
            (0, local_learning_history_storage_1.writeLearningHistoryJson)((0, local_learning_history_storage_1.getReviewTasksStorageKey)(input.accountKey), nextReviewTasks),
            (0, local_learning_history_storage_1.writeLearningHistoryJson)((0, local_learning_history_storage_1.getSummaryStorageKey)(input.accountKey), nextSummary),
        ]);
        return {
            attempt,
            results: nextResults,
            summary: nextSummary,
            reviewTasks: nextReviewTasks,
        };
    }
    async loadCurrentSummary(accountKey) {
        const [summary, reviewTasks] = await Promise.all([
            (0, local_learning_history_storage_1.readLearningHistoryJson)((0, local_learning_history_storage_1.getSummaryStorageKey)(accountKey), null),
            (0, local_learning_history_storage_1.readLearningHistoryJson)((0, local_learning_history_storage_1.getReviewTasksStorageKey)(accountKey), []),
        ]);
        if (!summary) {
            return null;
        }
        return applyReviewTaskState(summary, reviewTasks);
    }
    async cacheRecord(payload) {
        const attempts = await (0, local_learning_history_storage_1.readLearningHistoryJson)((0, local_learning_history_storage_1.getAttemptsStorageKey)(payload.attempt.accountKey), []);
        const resultsByAttemptId = await (0, local_learning_history_storage_1.readLearningHistoryJson)((0, local_learning_history_storage_1.getAttemptResultsStorageKey)(payload.attempt.accountKey), {});
        const nextAttempts = sortAttempts([
            payload.attempt,
            ...attempts.filter((attempt) => attempt.id !== payload.attempt.id),
        ]);
        const nextResultsByAttemptId = {
            ...resultsByAttemptId,
            [payload.attempt.id]: payload.results,
        };
        await Promise.all([
            (0, local_learning_history_storage_1.writeLearningHistoryJson)((0, local_learning_history_storage_1.getAttemptsStorageKey)(payload.attempt.accountKey), nextAttempts),
            (0, local_learning_history_storage_1.writeLearningHistoryJson)((0, local_learning_history_storage_1.getAttemptResultsStorageKey)(payload.attempt.accountKey), nextResultsByAttemptId),
            (0, local_learning_history_storage_1.writeLearningHistoryJson)((0, local_learning_history_storage_1.getReviewTasksStorageKey)(payload.attempt.accountKey), payload.reviewTasks),
            (0, local_learning_history_storage_1.writeLearningHistoryJson)((0, local_learning_history_storage_1.getSummaryStorageKey)(payload.attempt.accountKey), payload.summary),
        ]);
    }
    async cacheSummary(accountKey, summary) {
        await (0, local_learning_history_storage_1.writeLearningHistoryJson)((0, local_learning_history_storage_1.getSummaryStorageKey)(accountKey), summary);
    }
    async cacheAttempts(accountKey, attempts) {
        const existingAttempts = await (0, local_learning_history_storage_1.readLearningHistoryJson)((0, local_learning_history_storage_1.getAttemptsStorageKey)(accountKey), []);
        const nextAttempts = sortAttempts([
            ...attempts,
            ...existingAttempts.filter((existingAttempt) => !attempts.some((attempt) => attempt.id === existingAttempt.id)),
        ]);
        await (0, local_learning_history_storage_1.writeLearningHistoryJson)((0, local_learning_history_storage_1.getAttemptsStorageKey)(accountKey), nextAttempts);
    }
    async cacheAttemptResults(accountKey, attemptId, results) {
        const resultsByAttemptId = await (0, local_learning_history_storage_1.readLearningHistoryJson)((0, local_learning_history_storage_1.getAttemptResultsStorageKey)(accountKey), {});
        await (0, local_learning_history_storage_1.writeLearningHistoryJson)((0, local_learning_history_storage_1.getAttemptResultsStorageKey)(accountKey), {
            ...resultsByAttemptId,
            [attemptId]: results,
        });
    }
    async cacheReviewTasks(accountKey, reviewTasks) {
        await (0, local_learning_history_storage_1.writeLearningHistoryJson)((0, local_learning_history_storage_1.getReviewTasksStorageKey)(accountKey), reviewTasks);
    }
    async listReviewTasks(accountKey) {
        return (0, local_learning_history_storage_1.readLearningHistoryJson)((0, local_learning_history_storage_1.getReviewTasksStorageKey)(accountKey), []);
    }
    async saveFeaturedExamState(accountKey, state) {
        const attempts = await (0, local_learning_history_storage_1.readLearningHistoryJson)((0, local_learning_history_storage_1.getAttemptsStorageKey)(accountKey), []);
        const resultsByAttemptId = await (0, local_learning_history_storage_1.readLearningHistoryJson)((0, local_learning_history_storage_1.getAttemptResultsStorageKey)(accountKey), {});
        const reviewTasks = await (0, local_learning_history_storage_1.readLearningHistoryJson)((0, local_learning_history_storage_1.getReviewTasksStorageKey)(accountKey), []);
        const currentSummary = (await this.loadCurrentSummary(accountKey)) ?? (0, history_repository_1.createEmptyLearnerSummary)(accountKey);
        const nextSummary = buildSummary(accountKey, attempts, Object.values(resultsByAttemptId).flat(), reviewTasks, {
            ...currentSummary,
            featuredExamState: state,
        });
        nextSummary.featuredExamState = state;
        nextSummary.recentActivity = buildRecentActivity(attempts, reviewTasks, state);
        await (0, local_learning_history_storage_1.writeLearningHistoryJson)((0, local_learning_history_storage_1.getSummaryStorageKey)(accountKey), nextSummary);
        return nextSummary;
    }
    async listAttempts(accountKey, options) {
        const attempts = await (0, local_learning_history_storage_1.readLearningHistoryJson)((0, local_learning_history_storage_1.getAttemptsStorageKey)(accountKey), []);
        const filteredAttempts = options?.source
            ? attempts.filter((attempt) => attempt.source === options.source)
            : attempts;
        return typeof options?.limit === 'number'
            ? filteredAttempts.slice(0, options.limit)
            : filteredAttempts;
    }
    async listAttemptResults(accountKey, attemptId) {
        const resultsByAttemptId = await (0, local_learning_history_storage_1.readLearningHistoryJson)((0, local_learning_history_storage_1.getAttemptResultsStorageKey)(accountKey), {});
        return resultsByAttemptId[attemptId] ?? [];
    }
    async reset(accountKey) {
        await (0, local_learning_history_storage_1.clearLearningHistoryStorage)(accountKey);
    }
    async seedPreview(accountKey, state, reviewTasks) {
        await Promise.all([
            (0, local_learning_history_storage_1.writeLearningHistoryJson)((0, local_learning_history_storage_1.getSummaryStorageKey)(accountKey), state),
            (0, local_learning_history_storage_1.writeLearningHistoryJson)((0, local_learning_history_storage_1.getReviewTasksStorageKey)(accountKey), reviewTasks),
        ]);
    }
}
exports.LocalLearningHistoryRepository = LocalLearningHistoryRepository;

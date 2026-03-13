import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';

const reviewStages = ['day1', 'day3', 'day7'] as const;
const learningSources = ['diagnostic', 'featured-exam'] as const;
const learnerGrades = ['g1', 'g2', 'g3', 'unknown'] as const;
const solveMethodIds = [
  'cps',
  'vertex',
  'diff',
  'unknown',
  'factoring',
  'quadratic',
  'radical',
  'polynomial',
  'complex_number',
  'remainder_theorem',
  'counting',
] as const;
const diagnosisTraceSources = ['mock-router', 'openai-router', 'manual-selection'] as const;
const weaknessOrder = [
  'formula_understanding',
  'calc_repeated_error',
  'min_value_read_confusion',
  'vertex_formula_memorization',
  'coefficient_sign_confusion',
  'derivative_calculation',
  'solving_order_confusion',
  'max_min_judgement_confusion',
  'basic_concept_needed',
  'factoring_pattern_recall',
  'complex_factoring_difficulty',
  'quadratic_formula_memorization',
  'discriminant_calculation',
  'radical_simplification_error',
  'rationalization_error',
  'expansion_sign_error',
  'like_terms_error',
  'imaginary_unit_confusion',
  'complex_calc_error',
  'remainder_substitution_error',
  'simultaneous_equation_error',
  'counting_method_confusion',
  'counting_overcounting',
] as const;

const ReviewStageSchema = z.enum(reviewStages);
const LearningSourceSchema = z.enum(learningSources);
const LearnerGradeSchema = z.enum(learnerGrades);
const WeaknessIdSchema = z.enum(weaknessOrder);
const SolveMethodIdSchema = z.enum(solveMethodIds);
const DiagnosisTraceSourceSchema = z.enum(diagnosisTraceSources);

const DiagnosticSummarySnapshotSchema = z.object({
  attemptId: z.string().min(1).max(120),
  completedAt: z.string().datetime(),
  topWeaknesses: z.array(WeaknessIdSchema).max(3),
  accuracy: z.number().int().min(0).max(100),
});

const ActiveReviewTaskSummarySchema = z.object({
  id: z.string().min(1).max(240),
  weaknessId: WeaknessIdSchema,
  stage: ReviewStageSchema,
  scheduledFor: z.string().datetime(),
  source: LearningSourceSchema,
  sourceId: z.string().min(1).max(120),
});

export const FeaturedExamStateSchema = z.object({
  examId: z.string().min(1).max(120),
  status: z.enum(['not_started', 'in_progress', 'completed']),
  questionIndex: z.number().int().min(0).optional(),
  lastOpenedAt: z.string().datetime().optional(),
});

const LearnerSummaryCurrentSchema = z.object({
  accountKey: z.string().min(1).max(200),
  updatedAt: z.string().datetime(),
  lastAttemptAt: z.string().datetime().optional(),
  latestDiagnosticSummary: DiagnosticSummarySnapshotSchema.optional(),
  repeatedWeaknesses: z.array(
    z.object({
      weaknessId: WeaknessIdSchema,
      count: z.number().int().min(1),
      lastSeenAt: z.string().datetime(),
    }),
  ),
  nextReviewTask: ActiveReviewTaskSummarySchema.optional(),
  featuredExamState: FeaturedExamStateSchema,
  totals: z.object({
    diagnosticAttempts: z.number().int().min(0),
    featuredExamAttempts: z.number().int().min(0),
  }),
  recentActivity: z.array(
    z.object({
      id: z.string().min(1).max(240),
      kind: z.enum(['diagnostic', 'review', 'exam']),
      title: z.string().min(1).max(120),
      subtitle: z.string().min(1).max(120),
      occurredAt: z.string().datetime(),
    }),
  ),
});

const ReviewTaskSchema = z.object({
  id: z.string().min(1).max(240),
  accountKey: z.string().min(1).max(200),
  weaknessId: WeaknessIdSchema,
  source: LearningSourceSchema,
  sourceId: z.string().min(1).max(120),
  scheduledFor: z.string().datetime(),
  stage: ReviewStageSchema,
  completed: z.boolean(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
});

const LearningAttemptSchema = z.object({
  id: z.string().min(1).max(120),
  accountKey: z.string().min(1).max(200),
  learnerId: z.string().min(1).max(120),
  source: LearningSourceSchema,
  sourceEntityId: z.string().min(1).max(120).nullable(),
  gradeSnapshot: LearnerGradeSchema,
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  questionCount: z.number().int().min(1).max(200),
  correctCount: z.number().int().min(0).max(200),
  wrongCount: z.number().int().min(0).max(200),
  accuracy: z.number().int().min(0).max(100),
  primaryWeaknessId: WeaknessIdSchema.nullable(),
  topWeaknesses: z.array(WeaknessIdSchema).max(3),
  schemaVersion: z.literal(1),
  createdAt: z.string().datetime(),
});

const LearningAttemptResultSchema = z.object({
  id: z.string().min(1).max(240),
  attemptId: z.string().min(1).max(120),
  accountKey: z.string().min(1).max(200),
  source: LearningSourceSchema,
  sourceEntityId: z.string().min(1).max(120).nullable(),
  questionId: z.string().min(1).max(120),
  questionNumber: z.number().int().min(1).max(200),
  topic: z.string().min(1).max(120),
  selectedIndex: z.number().int().min(0).max(20).nullable(),
  isCorrect: z.boolean(),
  finalWeaknessId: WeaknessIdSchema.nullable(),
  methodId: SolveMethodIdSchema.nullable(),
  diagnosisSource: DiagnosisTraceSourceSchema.nullable(),
  finalMethodSource: z.enum(['router', 'manual']).nullable(),
  diagnosisCompleted: z.boolean(),
  usedDontKnow: z.boolean(),
  usedAiHelp: z.boolean(),
  schemaVersion: z.literal(1),
  resolvedAt: z.string().datetime(),
});

const FinalizedAttemptQuestionInputSchema = z.object({
  questionId: z.string().min(1).max(120),
  questionNumber: z.number().int().min(1).max(200),
  topic: z.string().min(1).max(120),
  selectedIndex: z.number().int().min(0).max(20).nullable(),
  isCorrect: z.boolean(),
  finalWeaknessId: WeaknessIdSchema.nullable(),
  methodId: SolveMethodIdSchema.nullable(),
  diagnosisSource: DiagnosisTraceSourceSchema.nullable(),
  finalMethodSource: z.enum(['router', 'manual']).nullable(),
  diagnosisCompleted: z.boolean(),
  usedDontKnow: z.boolean(),
  usedAiHelp: z.boolean(),
});

export const FinalizedAttemptInputSchema = z
  .object({
    attemptId: z.string().min(1).max(120),
    accountKey: z.string().min(1).max(200),
    learnerId: z.string().min(1).max(120),
    source: LearningSourceSchema,
    sourceEntityId: z.string().min(1).max(120).nullable(),
    gradeSnapshot: LearnerGradeSchema,
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime(),
    questionCount: z.number().int().min(1).max(200),
    correctCount: z.number().int().min(0).max(200),
    wrongCount: z.number().int().min(0).max(200),
    accuracy: z.number().int().min(0).max(100),
    primaryWeaknessId: WeaknessIdSchema.nullable(),
    topWeaknesses: z.array(WeaknessIdSchema).max(3),
    questions: z.array(FinalizedAttemptQuestionInputSchema).min(1).max(200),
  })
  .superRefine((value, ctx) => {
    if (value.questionCount !== value.questions.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['questionCount'],
        message: 'questionCount must match questions length',
      });
    }

    if (value.correctCount + value.wrongCount !== value.questionCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['wrongCount'],
        message: 'correctCount + wrongCount must equal questionCount',
      });
    }
  });

export type FeaturedExamState = z.infer<typeof FeaturedExamStateSchema>;
export type FinalizedAttemptInput = z.infer<typeof FinalizedAttemptInputSchema>;
export type LearnerSummaryCurrent = z.infer<typeof LearnerSummaryCurrentSchema>;
export type LearningAttempt = z.infer<typeof LearningAttemptSchema>;
export type LearningAttemptResult = z.infer<typeof LearningAttemptResultSchema>;
export type ReviewTask = z.infer<typeof ReviewTaskSchema>;
export type ReviewStage = z.infer<typeof ReviewStageSchema>;
type WeaknessId = z.infer<typeof WeaknessIdSchema>;

const REVIEW_STAGE_OFFSETS: Record<ReviewStage, number> = {
  day1: 1,
  day3: 3,
  day7: 7,
};

const DEFAULT_FEATURED_EXAM_ID = 'featured-mock-1';

function getUserRef(accountKey: string) {
  return getFirestore().collection('users').doc(accountKey);
}

function getAttemptRef(accountKey: string, attemptId: string) {
  return getUserRef(accountKey).collection('attempts').doc(attemptId);
}

function getAttemptResultsCollection(accountKey: string) {
  return getUserRef(accountKey).collection('attemptResults');
}

function getReviewTasksCollection(accountKey: string) {
  return getUserRef(accountKey).collection('reviewTasks');
}

function getSummaryRef(accountKey: string) {
  return getUserRef(accountKey).collection('summary').doc('current');
}

function addDays(timestamp: string, days: number) {
  const nextDate = new Date(timestamp);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate.toISOString();
}

function createDefaultFeaturedExamState(): FeaturedExamState {
  return {
    examId: DEFAULT_FEATURED_EXAM_ID,
    status: 'not_started',
  };
}

function createTaskId(stage: ReviewStage, weaknessId: WeaknessId, sourceId: string) {
  return `${sourceId}__${weaknessId}__${stage}`;
}

function sortAttempts(attempts: LearningAttempt[]) {
  return [...attempts].sort((left, right) => right.completedAt.localeCompare(left.completedAt));
}

function sortReviewTasks(tasks: ReviewTask[]) {
  return [...tasks].sort((left, right) => left.scheduledFor.localeCompare(right.scheduledFor));
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

    const lastSeenOrder = right.lastSeenAt.localeCompare(left.lastSeenAt);
    if (lastSeenOrder !== 0) {
      return lastSeenOrder;
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
          attempt.topWeaknesses[0] ?? `정답률 ${attempt.accuracy}%`,
        occurredAt: attempt.completedAt,
      };
    }),
    ...reviewTasks
      .filter((task) => task.completed && task.completedAt)
      .map((task) => ({
        id: `review-${task.id}`,
        kind: 'review' as const,
        title: '복습 완료',
        subtitle: task.weaknessId,
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

function buildAttempt(input: FinalizedAttemptInput, createdAt: string): LearningAttempt {
  return LearningAttemptSchema.parse({
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
  });
}

function buildAttemptResults(input: FinalizedAttemptInput): LearningAttemptResult[] {
  return input.questions.map((question) =>
    LearningAttemptResultSchema.parse({
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
    }),
  );
}

function buildReviewTasks(input: FinalizedAttemptInput): ReviewTask[] {
  const sourceId = input.sourceEntityId ?? input.attemptId;
  const weaknessId = input.primaryWeaknessId;

  if (!weaknessId) {
    return [];
  }

  return reviewStages.map((stage) =>
    ReviewTaskSchema.parse({
      id: createTaskId(stage, weaknessId, sourceId),
      accountKey: input.accountKey,
      weaknessId,
      source: input.source,
      sourceId,
      scheduledFor: addDays(input.completedAt, REVIEW_STAGE_OFFSETS[stage]),
      stage,
      completed: false,
      createdAt: input.completedAt,
    }),
  );
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
  const latestFeaturedExamAttempt = sortedAttempts.find(
    (attempt) => attempt.source === 'featured-exam',
  );
  const nextReviewTask = sortReviewTasks(reviewTasks.filter((task) => !task.completed))[0];
  let featuredExamState = currentSummary?.featuredExamState ?? createDefaultFeaturedExamState();

  if (
    latestFeaturedExamAttempt &&
    (featuredExamState.status !== 'in_progress' ||
      !featuredExamState.lastOpenedAt ||
      featuredExamState.lastOpenedAt.localeCompare(latestFeaturedExamAttempt.completedAt) <= 0)
  ) {
    featuredExamState = {
      examId: latestFeaturedExamAttempt.sourceEntityId ?? featuredExamState.examId,
      status: 'completed',
      lastOpenedAt: latestFeaturedExamAttempt.completedAt,
    };
  }

  return LearnerSummaryCurrentSchema.parse({
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
    nextReviewTask: nextReviewTask
      ? {
          id: nextReviewTask.id,
          weaknessId: nextReviewTask.weaknessId,
          stage: nextReviewTask.stage,
          scheduledFor: nextReviewTask.scheduledFor,
          source: nextReviewTask.source,
          sourceId: nextReviewTask.sourceId,
        }
      : undefined,
    featuredExamState,
    totals: {
      diagnosticAttempts: attempts.filter((attempt) => attempt.source === 'diagnostic').length,
      featuredExamAttempts: attempts.filter((attempt) => attempt.source === 'featured-exam').length,
    },
    recentActivity: buildRecentActivity(sortedAttempts, reviewTasks, featuredExamState),
  });
}

export async function loadLearnerHistory(accountKey: string) {
  const [attemptsSnapshot, resultsSnapshot, reviewTasksSnapshot, summarySnapshot] = await Promise.all([
    getUserRef(accountKey).collection('attempts').get(),
    getAttemptResultsCollection(accountKey).get(),
    getReviewTasksCollection(accountKey).get(),
    getSummaryRef(accountKey).get(),
  ]);

  const attempts = attemptsSnapshot.docs.map((doc) => LearningAttemptSchema.parse(doc.data()));
  const results = resultsSnapshot.docs.map((doc) => LearningAttemptResultSchema.parse(doc.data()));
  const reviewTasks = reviewTasksSnapshot.docs.map((doc) => ReviewTaskSchema.parse(doc.data()));
  const currentSummary = summarySnapshot.exists
    ? LearnerSummaryCurrentSchema.parse(summarySnapshot.data())
    : null;

  return {
    attempts,
    results,
    reviewTasks,
    currentSummary,
  };
}

export async function recordLearningAttempt(input: FinalizedAttemptInput) {
  const firestore = getFirestore();
  const attemptRef = getAttemptRef(input.accountKey, input.attemptId);
  const existingAttempt = await attemptRef.get();
  const createdAt =
    existingAttempt.exists &&
    existingAttempt.data() &&
    typeof existingAttempt.data()!.createdAt === 'string'
      ? (existingAttempt.data()!.createdAt as string)
      : input.completedAt;

  const attempt = buildAttempt(input, createdAt);
  const results = buildAttemptResults(input);
  const reviewTasks = buildReviewTasks(input);
  const batch = firestore.batch();

  batch.set(attemptRef, attempt, { merge: true });
  results.forEach((result) => {
    batch.set(getAttemptResultsCollection(input.accountKey).doc(result.id), result, { merge: true });
  });
  reviewTasks.forEach((task) => {
    batch.set(getReviewTasksCollection(input.accountKey).doc(task.id), task, { merge: true });
  });
  await batch.commit();

  const history = await loadLearnerHistory(input.accountKey);
  const summary = buildSummary(
    input.accountKey,
    history.attempts,
    history.results,
    history.reviewTasks,
    history.currentSummary,
  );

  await getSummaryRef(input.accountKey).set(summary, { merge: true });

  return {
    attempt,
    results,
    reviewTasks: history.reviewTasks,
    summary,
  };
}

export async function getLearnerSummary(accountKey: string) {
  const summarySnapshot = await getSummaryRef(accountKey).get();
  if (summarySnapshot.exists) {
    return LearnerSummaryCurrentSchema.parse(summarySnapshot.data());
  }

  const history = await loadLearnerHistory(accountKey);
  if (
    history.attempts.length === 0 &&
    history.results.length === 0 &&
    history.reviewTasks.length === 0
  ) {
    return null;
  }

  const summary = buildSummary(
    accountKey,
    history.attempts,
    history.results,
    history.reviewTasks,
    history.currentSummary,
  );
  await getSummaryRef(accountKey).set(summary, { merge: true });
  return summary;
}

export async function saveFeaturedExamStateSummary(
  accountKey: string,
  state: FeaturedExamState,
) {
  const history = await loadLearnerHistory(accountKey);
  const summary = buildSummary(accountKey, history.attempts, history.results, history.reviewTasks, {
    ...(history.currentSummary ?? {
      accountKey,
      updatedAt: new Date().toISOString(),
      repeatedWeaknesses: [],
      featuredExamState: createDefaultFeaturedExamState(),
      totals: {
        diagnosticAttempts: 0,
        featuredExamAttempts: 0,
      },
      recentActivity: [],
    }),
    featuredExamState: state,
  });

  const nextSummary = LearnerSummaryCurrentSchema.parse({
    ...summary,
    featuredExamState: state,
    recentActivity: buildRecentActivity(history.attempts, history.reviewTasks, state),
    updatedAt: new Date().toISOString(),
  });

  await getSummaryRef(accountKey).set(nextSummary, { merge: true });
  return nextSummary;
}

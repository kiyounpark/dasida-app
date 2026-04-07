import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';

import {
  buildImportWriteOperations,
  groupImportWriteOperations,
  hashMigrationSourceAccountKey,
  type ImportWriteOperation,
} from './learning-history-import-ops';
import {
  compareTimestampsAsc,
  compareTimestampsDesc,
  isTimestampOnOrBefore,
} from './timestamp-utils';

const reviewStages = ['day1', 'day3', 'day7', 'day30'] as const;
const learningSources = ['diagnostic', 'featured-exam', 'weakness-practice'] as const;
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
const weaknessLabels: Record<(typeof weaknessOrder)[number], string> = {
  formula_understanding: '공식 이해 부족',
  calc_repeated_error: '계산 실수 반복',
  min_value_read_confusion: '최솟값 읽기 혼동',
  vertex_formula_memorization: '공식 암기 부족',
  coefficient_sign_confusion: '계수 구분 혼동',
  derivative_calculation: '미분 계산 부족',
  solving_order_confusion: '풀이 순서 혼동',
  max_min_judgement_confusion: '최댓값/최솟값 판단 혼동',
  basic_concept_needed: '기초 개념 학습 필요',
  factoring_pattern_recall: '인수분해 패턴 암기 부족',
  complex_factoring_difficulty: '복잡한 식 인수분해 어려움',
  quadratic_formula_memorization: '근의공식 암기 부족',
  discriminant_calculation: '판별식 계산 실수',
  radical_simplification_error: '√ 간소화 실수',
  rationalization_error: '분모 유리화 실수',
  expansion_sign_error: '전개 부호 실수',
  like_terms_error: '동류항 정리 실수',
  imaginary_unit_confusion: 'i² = -1 혼동',
  complex_calc_error: '복소수 실수부/허수부 정리 실수',
  remainder_substitution_error: '나머지정리 대입 실수',
  simultaneous_equation_error: '연립방정식 설정 실수',
  counting_method_confusion: '경우의 수 방법 혼동',
  counting_overcounting: '중복 처리 실수',
};
const MAX_IMPORT_TOTAL_RESULTS = 2000;
const MAX_IMPORT_TOTAL_WRITES = 2400;

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
  weaknessAccuracies: z.record(WeaknessIdSchema, z.number().int().min(0).max(100)).default({}),
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
  dueReviewTasks: z.array(ActiveReviewTaskSummarySchema).default([]),
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

export const LearningAttemptResultSchema = z.object({
  id: z.string().min(1).max(240),
  attemptId: z.string().min(1).max(120),
  accountKey: z.string().min(1).max(200),
  source: LearningSourceSchema,
  sourceEntityId: z.string().min(1).max(120).nullable(),
  questionId: z.string().min(1).max(120),
  questionNumber: z.number().int().min(1).max(200),
  topic: z.string().min(1).max(120),
  firstSelectedIndex: z.number().int().min(0).max(20).nullable().optional(),
  selectedIndex: z.number().int().min(0).max(20).nullable(),
  isCorrect: z.boolean(),
  finalWeaknessId: WeaknessIdSchema.nullable(),
  methodId: SolveMethodIdSchema.nullable(),
  diagnosisSource: DiagnosisTraceSourceSchema.nullable(),
  finalMethodSource: z.enum(['router', 'manual']).nullable(),
  diagnosisCompleted: z.boolean(),
  usedDontKnow: z.boolean(),
  usedAiHelp: z.boolean(),
  wrongAttempts: z.number().int().min(0).max(20).optional(),
  usedCoaching: z.boolean().optional(),
  resolvedBy: z.enum(['solved', 'answer_revealed']).nullable().optional(),
  schemaVersion: z.literal(1),
  resolvedAt: z.string().datetime(),
});

const FinalizedAttemptQuestionInputSchema = z.object({
  questionId: z.string().min(1).max(120),
  questionNumber: z.number().int().min(1).max(200),
  topic: z.string().min(1).max(120),
  firstSelectedIndex: z.number().int().min(0).max(20).nullable().optional(),
  selectedIndex: z.number().int().min(0).max(20).nullable(),
  isCorrect: z.boolean(),
  finalWeaknessId: WeaknessIdSchema.nullable(),
  methodId: SolveMethodIdSchema.nullable(),
  diagnosisSource: DiagnosisTraceSourceSchema.nullable(),
  finalMethodSource: z.enum(['router', 'manual']).nullable(),
  diagnosisCompleted: z.boolean(),
  usedDontKnow: z.boolean(),
  usedAiHelp: z.boolean(),
  wrongAttempts: z.number().int().min(0).max(20).optional(),
  usedCoaching: z.boolean().optional(),
  resolvedBy: z.enum(['solved', 'answer_revealed']).nullable().optional(),
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
    reviewContext: z
      .object({
        reviewTaskId: z.string().min(1).max(240),
        reviewStage: ReviewStageSchema,
      })
      .optional(),
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

export const ImportLocalLearningHistoryRequestSchema = z
  .object({
    sourceAnonymousAccountKey: z
      .string()
      .min(1)
      .max(200)
      .refine((value) => value.startsWith('anon:'), {
        message: 'sourceAnonymousAccountKey must start with anon:',
      }),
    attempts: z.array(LearningAttemptSchema).max(200),
    resultsByAttemptId: z.record(
      z.string().min(1).max(120),
      z.array(LearningAttemptResultSchema).max(200),
    ),
    reviewTasks: z.array(ReviewTaskSchema).max(600),
    featuredExamState: FeaturedExamStateSchema,
  })
  .superRefine((value, ctx) => {
    const totalResults = Object.values(value.resultsByAttemptId).reduce(
      (count, results) => count + results.length,
      0,
    );
    const totalWrites = value.attempts.length + totalResults + value.reviewTasks.length + 1;

    if (totalResults > MAX_IMPORT_TOTAL_RESULTS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['resultsByAttemptId'],
        message: `resultsByAttemptId exceeds ${MAX_IMPORT_TOTAL_RESULTS} items`,
      });
    }

    if (totalWrites > MAX_IMPORT_TOTAL_WRITES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['resultsByAttemptId'],
        message: `import payload exceeds ${MAX_IMPORT_TOTAL_WRITES} total writes`,
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
  day30: 30,
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

function getMigrationLedgerRef(accountKey: string) {
  return getUserRef(accountKey).collection('private').doc('migrations');
}

function getImportWriteRef(targetAccountKey: string, operation: ImportWriteOperation) {
  switch (operation.collection) {
    case 'attempts':
      return getAttemptRef(targetAccountKey, operation.docId);
    case 'attemptResults':
      return getAttemptResultsCollection(targetAccountKey).doc(operation.docId);
    case 'reviewTasks':
      return getReviewTasksCollection(targetAccountKey).doc(operation.docId);
    case 'migrationLedger':
      return getMigrationLedgerRef(targetAccountKey);
  }
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

export function createEmptyLearnerSummary(accountKey: string): LearnerSummaryCurrent {
  return LearnerSummaryCurrentSchema.parse({
    accountKey,
    updatedAt: new Date().toISOString(),
    repeatedWeaknesses: [],
    dueReviewTasks: [],
    featuredExamState: createDefaultFeaturedExamState(),
    totals: {
      diagnosticAttempts: 0,
      featuredExamAttempts: 0,
    },
    recentActivity: [],
  });
}

function createTaskId(stage: ReviewStage, weaknessId: WeaknessId, sourceId: string) {
  return `${sourceId}__${weaknessId}__${stage}`;
}

function sortAttempts(attempts: LearningAttempt[]) {
  return [...attempts].sort((left, right) => compareTimestampsDesc(left.completedAt, right.completedAt));
}

function sortReviewTasks(tasks: ReviewTask[]) {
  return [...tasks].sort((left, right) => compareTimestampsAsc(left.scheduledFor, right.scheduledFor));
}

function toReviewTaskSummary(task: ReviewTask) {
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
  return LearnerSummaryCurrentSchema.parse({
    ...summary,
    ...buildReviewTaskState(reviewTasks),
  });
}

function getNextReviewStage(stage: ReviewStage) {
  const currentIndex = reviewStages.indexOf(stage);
  if (currentIndex < 0 || currentIndex === reviewStages.length - 1) {
    return null;
  }

  return reviewStages[currentIndex + 1];
}

function createReviewTask(params: {
  accountKey: string;
  weaknessId: WeaknessId;
  source: FinalizedAttemptInput['source'];
  sourceId: string;
  scheduledFor: string;
  stage: ReviewStage;
  createdAt: string;
}): ReviewTask {
  return ReviewTaskSchema.parse({
    id: createTaskId(params.stage, params.weaknessId, params.sourceId),
    accountKey: params.accountKey,
    weaknessId: params.weaknessId,
    source: params.source,
    sourceId: params.sourceId,
    scheduledFor: params.scheduledFor,
    stage: params.stage,
    completed: false,
    createdAt: params.createdAt,
  });
}

function areReviewTasksEqual(left: ReviewTask, right: ReviewTask) {
  return (
    left.id === right.id &&
    left.accountKey === right.accountKey &&
    left.weaknessId === right.weaknessId &&
    left.source === right.source &&
    left.sourceId === right.sourceId &&
    left.scheduledFor === right.scheduledFor &&
    left.stage === right.stage &&
    left.completed === right.completed &&
    left.createdAt === right.createdAt &&
    left.completedAt === right.completedAt
  );
}

function diffReviewTasks(existingTasks: ReviewTask[], nextTasks: ReviewTask[]) {
  const existingById = new Map(existingTasks.map((task) => [task.id, task]));
  const nextById = new Map(nextTasks.map((task) => [task.id, task]));

  return {
    upserts: nextTasks.filter((task) => {
      const existingTask = existingById.get(task.id);
      return !existingTask || !areReviewTasksEqual(existingTask, task);
    }),
    deletes: existingTasks.filter((task) => !nextById.has(task.id)),
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

    const lastSeenOrder = compareTimestampsDesc(left.lastSeenAt, right.lastSeenAt);
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
              ? weaknessLabels[attempt.topWeaknesses[0]]
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
        subtitle: weaknessLabels[task.weaknessId],
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
    }),
  );
}

export function buildReviewTasks(
  input: FinalizedAttemptInput,
  existingTasks: ReviewTask[] = [],
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
          weaknessAccuracies: {},
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
  });
}

export function mergeImportedFeaturedExamState(
  currentSummary: LearnerSummaryCurrent | null,
  importedFeaturedExamState: FeaturedExamState,
) {
  if (
    importedFeaturedExamState.status !== 'not_started' ||
    importedFeaturedExamState.lastOpenedAt ||
    typeof importedFeaturedExamState.questionIndex === 'number'
  ) {
    return importedFeaturedExamState;
  }

  return currentSummary?.featuredExamState ?? createDefaultFeaturedExamState();
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
  const [existingAttempt, existingReviewTasksSnapshot] = await Promise.all([
    attemptRef.get(),
    getReviewTasksCollection(input.accountKey).get(),
  ]);
  const createdAt =
    existingAttempt.exists &&
    existingAttempt.data() &&
    typeof existingAttempt.data()!.createdAt === 'string'
      ? (existingAttempt.data()!.createdAt as string)
      : input.completedAt;
  const existingReviewTasks = existingReviewTasksSnapshot.docs.map((doc) =>
    ReviewTaskSchema.parse(doc.data()),
  );

  const attempt = buildAttempt(input, createdAt);
  const results = buildAttemptResults(input);
  const nextReviewTasks = buildReviewTasks(input, existingReviewTasks);
  const reviewTaskMutations = diffReviewTasks(existingReviewTasks, nextReviewTasks);
  const batch = firestore.batch();

  batch.set(attemptRef, attempt, { merge: true });
  results.forEach((result) => {
    batch.set(getAttemptResultsCollection(input.accountKey).doc(result.id), result, { merge: true });
  });
  reviewTaskMutations.upserts.forEach((task) => {
    batch.set(getReviewTasksCollection(input.accountKey).doc(task.id), task, { merge: true });
  });
  reviewTaskMutations.deletes.forEach((task) => {
    batch.delete(getReviewTasksCollection(input.accountKey).doc(task.id));
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
    const [summary, reviewTasksSnapshot] = await Promise.all([
      Promise.resolve(LearnerSummaryCurrentSchema.parse(summarySnapshot.data())),
      getReviewTasksCollection(accountKey).get(),
    ]);
    const reviewTasks = reviewTasksSnapshot.docs.map((doc) => ReviewTaskSchema.parse(doc.data()));

    return applyReviewTaskState(summary, reviewTasks);
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

export async function listLearningAttempts(
  accountKey: string,
  options?: { source?: LearningAttempt['source']; limit?: number },
) {
  const history = await loadLearnerHistory(accountKey);
  const filteredAttempts = options?.source
    ? history.attempts.filter((attempt) => attempt.source === options.source)
    : history.attempts;
  const sortedAttempts = sortAttempts(filteredAttempts);

  return typeof options?.limit === 'number'
    ? sortedAttempts.slice(0, options.limit)
    : sortedAttempts;
}

export async function listReviewTasks(accountKey: string): Promise<ReviewTask[]> {
  const reviewTasksSnapshot = await getReviewTasksCollection(accountKey).get();
  return reviewTasksSnapshot.docs.map((doc) => ReviewTaskSchema.parse(doc.data()));
}

export async function getLearningAttemptResults(accountKey: string, attemptId: string) {
  const history = await loadLearnerHistory(accountKey);
  return history.results
    .filter((result) => result.attemptId === attemptId)
    .sort((left, right) => left.questionNumber - right.questionNumber);
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
      dueReviewTasks: [],
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

export async function importLocalLearningHistory(params: {
  targetAccountKey: string;
  sourceAnonymousAccountKey: string;
  attempts: LearningAttempt[];
  resultsByAttemptId: Record<string, LearningAttemptResult[]>;
  reviewTasks: ReviewTask[];
  featuredExamState: FeaturedExamState;
}) {
  const {
    targetAccountKey,
    sourceAnonymousAccountKey,
    attempts,
    resultsByAttemptId,
    reviewTasks,
    featuredExamState,
  } = params;
  const firestore = getFirestore();
  const migrationSourceHash = hashMigrationSourceAccountKey(sourceAnonymousAccountKey);
  const migrationLedgerRef = getMigrationLedgerRef(targetAccountKey);
  const migrationLedgerSnapshot = await migrationLedgerRef.get();
  const existingMarker =
    migrationLedgerSnapshot.exists &&
    migrationLedgerSnapshot.data()?.markers &&
    typeof migrationLedgerSnapshot.data()!.markers === 'object'
      ? migrationLedgerSnapshot.data()!.markers[migrationSourceHash]
      : undefined;

  if (existingMarker) {
    return {
      status: 'already_imported' as const,
      summary: (await getLearnerSummary(targetAccountKey)) ?? createEmptyLearnerSummary(targetAccountKey),
    };
  }

  const { operations } = buildImportWriteOperations({
    targetAccountKey,
    sourceAnonymousAccountKey,
    attempts,
    resultsByAttemptId,
    reviewTasks,
  });

  for (const batchOperations of groupImportWriteOperations(operations)) {
    const batch = firestore.batch();

    batchOperations.forEach((operation) => {
      batch.set(getImportWriteRef(targetAccountKey, operation), operation.data, { merge: true });
    });

    await batch.commit();
  }

  const history = await loadLearnerHistory(targetAccountKey);
  const summary = buildSummary(
    targetAccountKey,
    history.attempts,
    history.results,
    history.reviewTasks,
    {
      ...(history.currentSummary ?? createEmptyLearnerSummary(targetAccountKey)),
      featuredExamState: mergeImportedFeaturedExamState(history.currentSummary, featuredExamState),
    },
  );

  await getSummaryRef(targetAccountKey).set(summary, { merge: true });

  return {
    status: 'imported' as const,
    summary,
  };
}

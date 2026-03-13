import type { AuthClient } from '@/features/auth/auth-client';
import type { AuthSession } from '@/features/auth/types';
import { weaknessOrder, type WeaknessId } from '@/data/diagnosisMap';
import { buildHomeLearningState, type HomeLearningState } from '@/features/learning/home-state';
import type { ReviewTask } from '@/features/learning/types';
import type { ReviewTaskStore } from '@/features/learning/review-task-store';

import type { LearnerProfileStore } from './profile-store';
import type {
  DiagnosticSummarySnapshot,
  LearnerProfile,
  PreviewSeedState,
} from './types';

export type CurrentLearnerSnapshot = {
  session: AuthSession;
  profile: LearnerProfile;
  reviewTasks: ReviewTask[];
  homeState: HomeLearningState;
};

export type CurrentLearnerController = {
  bootstrap(): Promise<CurrentLearnerSnapshot>;
  refresh(): Promise<CurrentLearnerSnapshot>;
  updateGrade(grade: LearnerProfile['grade']): Promise<CurrentLearnerSnapshot>;
  saveDiagnosticSummary(summary: DiagnosticSummarySnapshot): Promise<CurrentLearnerSnapshot>;
  seedPreview(state: PreviewSeedState): Promise<CurrentLearnerSnapshot>;
  resetLocalProfile(): Promise<CurrentLearnerSnapshot>;
};

type Dependencies = {
  authClient: AuthClient;
  profileStore: LearnerProfileStore;
  reviewTaskStore: ReviewTaskStore;
};

function createTaskId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildSnapshot(
  session: AuthSession,
  profile: LearnerProfile,
  reviewTasks: ReviewTask[],
): CurrentLearnerSnapshot {
  return {
    session,
    profile,
    reviewTasks,
    homeState: buildHomeLearningState(profile, reviewTasks),
  };
}

async function ensureProfile(
  profileStore: LearnerProfileStore,
  accountKey: string,
): Promise<LearnerProfile> {
  const existingProfile = await profileStore.load(accountKey);
  if (existingProfile) {
    return existingProfile;
  }

  return profileStore.createInitial(accountKey);
}

function buildPreviewSummary(topWeaknesses: WeaknessId[]): DiagnosticSummarySnapshot {
  return {
    completedAt: new Date().toISOString(),
    topWeaknesses,
    accuracy: 70,
  };
}

function buildPreviewTask(weaknessId: WeaknessId): ReviewTask {
  const now = new Date().toISOString();

  return {
    id: createTaskId(),
    weaknessId,
    source: 'diagnostic',
    sourceId: `preview-${now}`,
    scheduledFor: now,
    stage: 'day1',
    completed: false,
    createdAt: now,
  };
}

function getPreviewWeaknesses(): WeaknessId[] {
  return weaknessOrder.slice(0, 3);
}

export function createCurrentLearnerController({
  authClient,
  profileStore,
  reviewTaskStore,
}: Dependencies): CurrentLearnerController {
  const readCurrentSnapshot = async (): Promise<CurrentLearnerSnapshot> => {
    const session = (await authClient.loadSession()) ?? (await authClient.ensureAnonymousSession());
    const profile = await ensureProfile(profileStore, session.accountKey);
    const reviewTasks = await reviewTaskStore.load(session.accountKey);

    return buildSnapshot(session, profile, reviewTasks);
  };

  return {
    bootstrap: readCurrentSnapshot,
    refresh: readCurrentSnapshot,
    updateGrade: async (grade) => {
      const { session, profile, reviewTasks } = await readCurrentSnapshot();
      const nextProfile: LearnerProfile = {
        ...profile,
        grade,
        updatedAt: new Date().toISOString(),
      };

      await profileStore.save(nextProfile);
      return buildSnapshot(session, nextProfile, reviewTasks);
    },
    saveDiagnosticSummary: async (summary) => {
      const { session, profile } = await readCurrentSnapshot();
      const reviewTask =
        summary.topWeaknesses[0] !== undefined
          ? {
              id: createTaskId(),
              weaknessId: summary.topWeaknesses[0],
              source: 'diagnostic' as const,
              sourceId: summary.completedAt,
              scheduledFor: summary.completedAt,
              stage: 'day1' as const,
              completed: false,
              createdAt: summary.completedAt,
            }
          : undefined;

      const nextReviewTasks =
        reviewTask === undefined
          ? []
          : [
              reviewTask,
              ...(await reviewTaskStore.load(session.accountKey)).filter(
                (task) =>
                  !(
                    task.source === reviewTask.source &&
                    task.sourceId === reviewTask.sourceId &&
                    task.weaknessId === reviewTask.weaknessId &&
                    task.stage === reviewTask.stage
                  ),
              ),
            ];

      const nextProfile: LearnerProfile = {
        ...profile,
        latestDiagnosticSummary: summary,
        activeReviewTask: reviewTask
          ? {
              id: reviewTask.id,
              weaknessId: reviewTask.weaknessId,
              stage: reviewTask.stage,
              scheduledFor: reviewTask.scheduledFor,
              source: reviewTask.source,
            }
          : undefined,
        updatedAt: new Date().toISOString(),
      };

      await profileStore.save(nextProfile);
      await reviewTaskStore.saveAll(session.accountKey, nextReviewTasks);

      return buildSnapshot(session, nextProfile, nextReviewTasks);
    },
    seedPreview: async (state) => {
      const { session, profile } = await readCurrentSnapshot();
      const previewWeaknesses = getPreviewWeaknesses();
      const diagnosticSummary =
        state === 'fresh'
          ? undefined
          : buildPreviewSummary(previewWeaknesses);

      const reviewTask =
        state === 'review-available'
          ? buildPreviewTask(previewWeaknesses[0])
          : undefined;

      const nextProfile: LearnerProfile = {
        ...profile,
        latestDiagnosticSummary: diagnosticSummary,
        activeReviewTask: reviewTask
          ? {
              id: reviewTask.id,
              weaknessId: reviewTask.weaknessId,
              stage: reviewTask.stage,
              scheduledFor: reviewTask.scheduledFor,
              source: reviewTask.source,
            }
          : undefined,
        featuredExamState:
          state === 'exam-in-progress'
            ? {
                examId: 'featured-mock-1',
                status: 'in_progress',
                questionIndex: 11,
                lastOpenedAt: new Date().toISOString(),
              }
            : {
                examId: 'featured-mock-1',
                status: 'not_started',
              },
        updatedAt: new Date().toISOString(),
      };

      const nextReviewTasks = reviewTask ? [reviewTask] : [];

      await profileStore.save(nextProfile);
      await reviewTaskStore.saveAll(session.accountKey, nextReviewTasks);

      return buildSnapshot(session, nextProfile, nextReviewTasks);
    },
    resetLocalProfile: async () => {
      const currentSession = await authClient.ensureAnonymousSession();
      await profileStore.reset(currentSession.accountKey);
      await reviewTaskStore.reset(currentSession.accountKey);
      const nextSession = await authClient.signOut();
      const nextProfile = await ensureProfile(profileStore, nextSession.accountKey);
      const nextReviewTasks = await reviewTaskStore.load(nextSession.accountKey);

      return buildSnapshot(nextSession, nextProfile, nextReviewTasks);
    },
  };
}

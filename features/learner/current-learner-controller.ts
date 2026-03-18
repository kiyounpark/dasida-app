import type { AuthClient } from '@/features/auth/auth-client';
import type { AuthSession, SupportedAuthProvider } from '@/features/auth/types';
import { weaknessOrder, type WeaknessId } from '@/data/diagnosisMap';
import { buildHomeLearningState, type HomeLearningState } from '@/features/learning/home-state';
import { getPreviewPeerPresence } from '@/features/learning/peer-presence-preview';
import type { PreviewablePeerPresenceStore } from '@/features/learning/peer-presence-store';
import {
  createEmptyLearnerSummary,
  type HistoryMigrationStatus,
  type FinalizedAttemptInput,
  type LearningHistoryRepository,
} from '@/features/learning/history-repository';
import { LearningHistoryMigrationService } from '@/features/learning/learning-history-migration-service';
import { LocalLearningHistoryRepository } from '@/features/learning/local-learning-history-repository';
import type { LearningSource } from '@/features/learning/history-types';
import type { LearnerSummaryCurrent, LearningAttempt } from '@/features/learning/types';

import type { LearnerProfileStore } from './profile-store';
import type {
  FeaturedExamState,
  LearnerProfile,
  PreviewSeedState,
} from './types';

export type CurrentLearnerSnapshot = {
  session: AuthSession;
  profile: LearnerProfile;
  summary: LearnerSummaryCurrent;
  homeState: HomeLearningState;
};

export type CurrentLearnerController = {
  bootstrap(): Promise<CurrentLearnerSnapshot>;
  refresh(): Promise<CurrentLearnerSnapshot>;
  loadRecentAttempts(options?: {
    source?: LearningSource;
    limit?: number;
  }): Promise<LearningAttempt[]>;
  signIn(provider: SupportedAuthProvider): Promise<{
    snapshot: CurrentLearnerSnapshot;
    migrationStatus: HistoryMigrationStatus;
  }>;
  signOut(): Promise<CurrentLearnerSnapshot>;
  getHistoryMigrationStatus(sourceAnonymousAccountKey?: string): Promise<HistoryMigrationStatus>;
  importAnonymousHistory(sourceAnonymousAccountKey: string): Promise<{
    snapshot: CurrentLearnerSnapshot;
    migrationStatus: HistoryMigrationStatus;
  }>;
  updateGrade(grade: LearnerProfile['grade']): Promise<CurrentLearnerSnapshot>;
  recordAttempt(input: FinalizedAttemptInput): Promise<CurrentLearnerSnapshot>;
  saveFeaturedExamState(state: FeaturedExamState): Promise<CurrentLearnerSnapshot>;
  seedPreview(state: PreviewSeedState): Promise<CurrentLearnerSnapshot>;
  resetLocalProfile(): Promise<CurrentLearnerSnapshot>;
};

type Dependencies = {
  authClient: AuthClient;
  profileStore: LearnerProfileStore;
  learningHistoryRepository: LearningHistoryRepository;
  localLearningHistoryRepository: LocalLearningHistoryRepository;
  migrationService: LearningHistoryMigrationService;
  peerPresenceStore: PreviewablePeerPresenceStore;
};

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

function getPreviewWeaknesses(): WeaknessId[] {
  return weaknessOrder.slice(0, 3);
}

function buildPreviewAttemptInput(
  profile: LearnerProfile,
  source: 'diagnostic' | 'featured-exam',
  sourceEntityId: string | null = null,
  completedAt = new Date().toISOString(),
): FinalizedAttemptInput {
  const attemptId = `preview-${source}-${Date.now().toString(36)}`;
  const topWeaknesses = getPreviewWeaknesses();

  return {
    attemptId,
    accountKey: profile.accountKey,
    learnerId: profile.learnerId,
    source,
    sourceEntityId,
    gradeSnapshot: profile.grade,
    startedAt: completedAt,
    completedAt,
    questionCount: 10,
    correctCount: 7,
    wrongCount: 3,
    accuracy: 70,
    primaryWeaknessId: topWeaknesses[0] ?? null,
    topWeaknesses,
    questions: topWeaknesses.map((weaknessId, index) => ({
      questionId: `preview-q${index + 1}`,
      questionNumber: index + 1,
      topic: '미리보기',
      selectedIndex: index,
      isCorrect: false,
      finalWeaknessId: weaknessId,
      methodId: null,
      diagnosisSource: null,
      finalMethodSource: null,
      diagnosisCompleted: true,
      usedDontKnow: index === 2,
      usedAiHelp: index === 1,
    })),
  };
}

export function createCurrentLearnerController({
  authClient,
  profileStore,
  learningHistoryRepository,
  localLearningHistoryRepository,
  migrationService,
  peerPresenceStore,
}: Dependencies): CurrentLearnerController {
  const buildSnapshot = async (
    session: AuthSession,
    profile: LearnerProfile,
    summary: LearnerSummaryCurrent,
  ): Promise<CurrentLearnerSnapshot> => ({
    session,
    profile,
    summary,
    homeState: buildHomeLearningState(profile, summary, await peerPresenceStore.load()),
  });

  const buildSnapshotForSession = async (session: AuthSession): Promise<CurrentLearnerSnapshot> => {
    const profile = await ensureProfile(profileStore, session.accountKey);
    const summary =
      (await learningHistoryRepository.loadCurrentSummary(session.accountKey)) ??
      createEmptyLearnerSummary(session.accountKey);
    return buildSnapshot(session, profile, summary);
  };

  const readCurrentSession = async () =>
    (await authClient.loadSession()) ?? (await authClient.ensureAnonymousSession());

  const maybeResumePendingImports = async (session: AuthSession) => {
    if (session.status !== 'authenticated') {
      return;
    }

    try {
      await migrationService.resumePendingImports(session.accountKey);
    } catch (error) {
      console.warn('Failed to resume pending learning history imports.', error);
      // Startup should continue even when the background reconciliation cannot complete.
    }
  };

  const readCurrentSnapshot = async (options?: {
    resumePendingImports?: boolean;
  }): Promise<CurrentLearnerSnapshot> => {
    const session = await readCurrentSession();
    if (options?.resumePendingImports) {
      await maybeResumePendingImports(session);
    }

    return buildSnapshotForSession(session);
  };

  return {
    bootstrap: async () => {
      return readCurrentSnapshot({
        resumePendingImports: true,
      });
    },
    refresh: readCurrentSnapshot,
    loadRecentAttempts: async (options) => {
      const session = await readCurrentSession();
      return learningHistoryRepository.listAttempts(session.accountKey, options);
    },
    signIn: async (provider) => {
      const { previousSession, nextSession } = await authClient.signIn(provider);
      const migrationStatus =
        previousSession.status === 'anonymous' && nextSession.status === 'authenticated'
          ? await migrationService.loadStatus({
              sourceAnonymousAccountKey: previousSession.accountKey,
              targetAccountKey: nextSession.accountKey,
            })
          : {
              state: 'empty' as const,
              targetAccountKey: nextSession.accountKey,
            };

      return {
        snapshot: await buildSnapshotForSession(nextSession),
        migrationStatus,
      };
    },
    signOut: async () => {
      const nextSession = await authClient.signOut();
      return buildSnapshotForSession(nextSession);
    },
    getHistoryMigrationStatus: async (sourceAnonymousAccountKey) => {
      return migrationService.loadStatus({
        sourceAnonymousAccountKey,
      });
    },
    importAnonymousHistory: async (sourceAnonymousAccountKey) => {
      const migrationStatus = await migrationService.importAnonymousSnapshot(sourceAnonymousAccountKey);
      return {
        snapshot: await readCurrentSnapshot(),
        migrationStatus,
      };
    },
    updateGrade: async (grade) => {
      const { session, profile, summary } = await readCurrentSnapshot();
      const nextProfile: LearnerProfile = {
        ...profile,
        grade,
        updatedAt: new Date().toISOString(),
      };

      await profileStore.save(nextProfile);
      return buildSnapshot(session, nextProfile, summary);
    },
    recordAttempt: async (input) => {
      const { session, profile } = await readCurrentSnapshot();
      const result = await learningHistoryRepository.recordAttempt(input);
      return buildSnapshot(session, profile, result.summary);
    },
    saveFeaturedExamState: async (state) => {
      const { session, profile } = await readCurrentSnapshot();
      const summary = await learningHistoryRepository.saveFeaturedExamState(session.accountKey, state);
      return buildSnapshot(session, profile, summary);
    },
    seedPreview: async (state) => {
      const { session, profile } = await readCurrentSnapshot();

      if (session.status === 'anonymous') {
        await localLearningHistoryRepository.reset(session.accountKey);
      }

      if (state === 'fresh') {
        await peerPresenceStore.setPreviewSnapshot(getPreviewPeerPresence(state));
        return readCurrentSnapshot();
      }

      if (state === 'diagnostic-complete' || state === 'review-available') {
        const previewCompletedAt =
          state === 'review-available'
            ? new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
            : new Date().toISOString();
        await learningHistoryRepository.recordAttempt(
          buildPreviewAttemptInput(profile, 'diagnostic', null, previewCompletedAt),
        );
      }

      if (state === 'exam-in-progress') {
        await learningHistoryRepository.saveFeaturedExamState(session.accountKey, {
          examId: 'featured-mock-1',
          status: 'in_progress',
          questionIndex: 11,
          lastOpenedAt: new Date().toISOString(),
        });
      }

      await peerPresenceStore.setPreviewSnapshot(getPreviewPeerPresence(state));
      return readCurrentSnapshot();
    },
    resetLocalProfile: async () => {
      const currentSession = await readCurrentSession();

      if (currentSession.status === 'anonymous') {
        await localLearningHistoryRepository.reset(currentSession.accountKey);
        await profileStore.reset(currentSession.accountKey);
      }

      await peerPresenceStore.clearPreviewSnapshot();
      const nextSession = await authClient.signOut();
      return buildSnapshotForSession(nextSession);
    },
  };
}

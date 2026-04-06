import type { AuthClient } from '@/features/auth/auth-client';
import {
  canUseDevGuestAuth,
  getAuthBlockingReason,
  getRequiredAuthProviders,
  type AuthBlockingReason,
  type AuthGateState,
} from '@/features/auth/auth-policy';
import { isFirebaseAuthConfigured } from '@/features/auth/firebase-config';
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
import type { LearningSource, ReviewStage } from '@/features/learning/history-types';
import { LocalReviewTaskStore } from '@/features/learning/review-task-store';
import type { LearnerSummaryCurrent, LearningAttempt } from '@/features/learning/types';

import type { LearnerProfileStore } from './profile-store';
import type {
  FeaturedExamState,
  LearnerProfile,
  LearnerTrack,
  PreviewSeedState,
} from './types';

const AUTH_REQUIRED_ERROR_MESSAGE = 'Authentication is required before accessing learner data.';
const DEV_GUEST_REQUIRED_ERROR_MESSAGE =
  'Development guest authentication is required for preview tools.';
const AUTO_IMPORT_FAILURE_NOTICE =
  '이 기기 기록을 자동으로 옮기지 못했습니다. 설정에서 다시 시도할 수 있어요.';

export type CurrentLearnerSnapshot = {
  authGateState: Exclude<AuthGateState, 'loading'>;
  authBlockingReason: AuthBlockingReason;
  canUseDevGuestAuth: boolean;
  authNoticeMessage: string | null;
  session: AuthSession | null;
  profile: LearnerProfile | null;
  summary: LearnerSummaryCurrent | null;
  homeState: HomeLearningState | null;
};

export type CurrentLearnerController = {
  bootstrap(): Promise<CurrentLearnerSnapshot>;
  refresh(): Promise<CurrentLearnerSnapshot>;
  loadRecentAttempts(options?: {
    source?: LearningSource;
    limit?: number;
  }): Promise<LearningAttempt[]>;
  continueAsDevGuest(): Promise<CurrentLearnerSnapshot>;
  signIn(provider: SupportedAuthProvider): Promise<CurrentLearnerSnapshot>;
  signOut(): Promise<CurrentLearnerSnapshot>;
  getHistoryMigrationStatus(sourceAnonymousAccountKey?: string): Promise<HistoryMigrationStatus>;
  importAnonymousHistory(sourceAnonymousAccountKey: string): Promise<{
    snapshot: CurrentLearnerSnapshot;
    migrationStatus: HistoryMigrationStatus;
  }>;
  updateGrade(grade: LearnerProfile['grade']): Promise<CurrentLearnerSnapshot>;
  updateOnboardingProfile(
    nickname: string,
    grade: Exclude<LearnerProfile['grade'], 'unknown'>,
    track?: LearnerTrack,
  ): Promise<CurrentLearnerSnapshot>;
  graduateToPractice(): Promise<CurrentLearnerSnapshot>;
  recordAttempt(input: FinalizedAttemptInput): Promise<CurrentLearnerSnapshot>;
  saveFeaturedExamState(state: FeaturedExamState): Promise<CurrentLearnerSnapshot>;
  seedPreview(state: PreviewSeedState): Promise<CurrentLearnerSnapshot>;
  pullReviewDueDates(): Promise<CurrentLearnerSnapshot>;
  resetLocalProfile(): Promise<CurrentLearnerSnapshot>;
};

type Dependencies = {
  authClient: AuthClient;
  profileStore: LearnerProfileStore;
  learningHistoryRepository: LearningHistoryRepository;
  localLearningHistoryRepository: LocalLearningHistoryRepository;
  migrationService: LearningHistoryMigrationService;
  peerPresenceStore: PreviewablePeerPresenceStore;
  reviewTaskStore: LocalReviewTaskStore;
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
  reviewTaskStore,
}: Dependencies): CurrentLearnerController {
  const availableAuthProviders = getRequiredAuthProviders(authClient.getSupportedProviders());
  const devGuestEnabled = canUseDevGuestAuth();
  const authBlockingReason = getAuthBlockingReason({
    availableProviders: availableAuthProviders,
    isFirebaseAuthConfigured: isFirebaseAuthConfigured(),
  });

  const buildSnapshot = async (
    params: {
      authGateState: 'authenticated' | 'guest-dev';
      authNoticeMessage?: string | null;
      profile: LearnerProfile;
      session: AuthSession;
      summary: LearnerSummaryCurrent;
    },
  ): Promise<CurrentLearnerSnapshot> => ({
    authGateState: params.authGateState,
    authBlockingReason: null,
    canUseDevGuestAuth: devGuestEnabled,
    authNoticeMessage: params.authNoticeMessage ?? null,
    session: params.session,
    profile: params.profile,
    summary: params.summary,
    homeState: buildHomeLearningState(
      params.profile,
      params.summary,
      await peerPresenceStore.load(),
    ),
  });

  const buildRequiredSnapshot = (noticeMessage: string | null = null): CurrentLearnerSnapshot => ({
    authGateState: 'required',
    authBlockingReason,
    canUseDevGuestAuth: devGuestEnabled,
    authNoticeMessage: noticeMessage,
    session: null,
    profile: null,
    summary: null,
    homeState: null,
  });

  const buildSnapshotForSession = async (
    session: AuthSession,
    options?: {
      authGateState?: 'authenticated' | 'guest-dev';
      authNoticeMessage?: string | null;
      summary?: LearnerSummaryCurrent | null;
    },
  ): Promise<CurrentLearnerSnapshot> => {
    const profile = await ensureProfile(profileStore, session.accountKey);
    const summary =
      options?.summary ??
      (await learningHistoryRepository.loadCurrentSummary(session.accountKey)) ??
      createEmptyLearnerSummary(session.accountKey);

    return buildSnapshot({
      authGateState:
        options?.authGateState ?? (session.status === 'authenticated' ? 'authenticated' : 'guest-dev'),
      authNoticeMessage: options?.authNoticeMessage,
      profile,
      session,
      summary,
    });
  };

  const readStoredSession = async () => authClient.loadSession();

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
    authNoticeMessage?: string | null;
    resumePendingImports?: boolean;
  }): Promise<CurrentLearnerSnapshot> => {
    const session = await readStoredSession();
    if (!session) {
      return buildRequiredSnapshot(options?.authNoticeMessage ?? null);
    }

    if (session.status === 'authenticated') {
      if (options?.resumePendingImports) {
        await maybeResumePendingImports(session);
      }

      return buildSnapshotForSession(session, {
        authGateState: 'authenticated',
        authNoticeMessage: options?.authNoticeMessage,
      });
    }

    if (devGuestEnabled) {
      return buildSnapshotForSession(session, {
        authGateState: 'guest-dev',
        authNoticeMessage: options?.authNoticeMessage,
      });
    }

    return buildRequiredSnapshot(options?.authNoticeMessage ?? null);
  };

  const readAccessibleSnapshot = async () => {
    const snapshot = await readCurrentSnapshot();
    if (
      snapshot.authGateState === 'required' ||
      !snapshot.session ||
      !snapshot.profile ||
      !snapshot.summary
    ) {
      throw new Error(AUTH_REQUIRED_ERROR_MESSAGE);
    }

    return snapshot as CurrentLearnerSnapshot & {
      authGateState: 'authenticated' | 'guest-dev';
      homeState: HomeLearningState;
      profile: LearnerProfile;
      session: AuthSession;
      summary: LearnerSummaryCurrent;
    };
  };

  const readDevGuestSnapshot = async () => {
    const snapshot = await readAccessibleSnapshot();
    if (snapshot.authGateState !== 'guest-dev' || snapshot.session.status !== 'anonymous') {
      throw new Error(DEV_GUEST_REQUIRED_ERROR_MESSAGE);
    }

    return snapshot;
  };

  return {
    bootstrap: async () => {
      return readCurrentSnapshot({
        resumePendingImports: true,
      });
    },
    refresh: readCurrentSnapshot,
    loadRecentAttempts: async (options) => {
      const { session } = await readAccessibleSnapshot();
      return learningHistoryRepository.listAttempts(session.accountKey, options);
    },
    continueAsDevGuest: async () => {
      if (!devGuestEnabled) {
        throw new Error(DEV_GUEST_REQUIRED_ERROR_MESSAGE);
      }

      const session = await authClient.ensureAnonymousSession();
      if (session.status !== 'anonymous') {
        throw new Error(DEV_GUEST_REQUIRED_ERROR_MESSAGE);
      }

      return buildSnapshotForSession(session, {
        authGateState: 'guest-dev',
      });
    },
    signIn: async (provider) => {
      const { previousSession, nextSession } = await authClient.signIn(provider);
      if (previousSession?.status !== 'anonymous' || nextSession.status !== 'authenticated') {
        return buildSnapshotForSession(nextSession, {
          authGateState: 'authenticated',
        });
      }

      try {
        const migrationStatus = await migrationService.importAnonymousSnapshot(
          previousSession.accountKey,
          nextSession.accountKey,
        );
        const migratedSummary =
          migrationStatus.state === 'completed' || migrationStatus.state === 'already_imported'
            ? migrationStatus.summary
            : null;

        return buildSnapshotForSession(nextSession, {
          authGateState: 'authenticated',
          summary: migratedSummary,
        });
      } catch (error) {
        console.warn('Failed to auto-import anonymous learning history after sign-in.', error);
        return buildSnapshotForSession(nextSession, {
          authGateState: 'authenticated',
          authNoticeMessage: AUTO_IMPORT_FAILURE_NOTICE,
        });
      }
    },
    signOut: async () => {
      await Promise.all([authClient.signOut(), peerPresenceStore.clearPreviewSnapshot()]);
      return buildRequiredSnapshot();
    },
    getHistoryMigrationStatus: async (sourceAnonymousAccountKey) => {
      return migrationService.loadStatus({
        sourceAnonymousAccountKey,
      });
    },
    importAnonymousHistory: async (sourceAnonymousAccountKey) => {
      const migrationStatus = await migrationService.importAnonymousSnapshot(sourceAnonymousAccountKey);
      const migratedSummary =
        migrationStatus.state === 'completed' || migrationStatus.state === 'already_imported'
          ? migrationStatus.summary
          : null;
      const session = await readStoredSession();
      if (!session) {
        throw new Error(AUTH_REQUIRED_ERROR_MESSAGE);
      }

      return {
        snapshot: await buildSnapshotForSession(session, {
          authGateState: session.status === 'authenticated' ? 'authenticated' : 'guest-dev',
          summary: migratedSummary,
        }),
        migrationStatus,
      };
    },
    updateGrade: async (grade) => {
      const { session, profile, summary } = await readAccessibleSnapshot();
      const nextProfile: LearnerProfile = {
        ...profile,
        grade,
        updatedAt: new Date().toISOString(),
      };

      await profileStore.save(nextProfile);
      return buildSnapshot({
        authGateState: session.status === 'authenticated' ? 'authenticated' : 'guest-dev',
        profile: nextProfile,
        session,
        summary,
      });
    },
    updateOnboardingProfile: async (nickname, grade, track) => {
      const { session, profile, summary } = await readAccessibleSnapshot();
      const nextProfile: LearnerProfile = {
        ...profile,
        nickname,
        grade,
        track: grade === 'g3' ? track : undefined,
        updatedAt: new Date().toISOString(),
      };
      await profileStore.save(nextProfile);
      return buildSnapshot({
        authGateState: session.status === 'authenticated' ? 'authenticated' : 'guest-dev',
        profile: nextProfile,
        session,
        summary,
      });
    },
    graduateToPractice: async () => {
      const { session, profile, summary } = await readAccessibleSnapshot();
      const nextProfile: LearnerProfile = {
        ...profile,
        practiceGraduatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await profileStore.save(nextProfile);
      return buildSnapshot({
        authGateState: session.status === 'authenticated' ? 'authenticated' : 'guest-dev',
        profile: nextProfile,
        session,
        summary,
      });
    },
    recordAttempt: async (input) => {
      const { session, profile } = await readAccessibleSnapshot();
      const result = await learningHistoryRepository.recordAttempt(input);
      return buildSnapshot({
        authGateState: session.status === 'authenticated' ? 'authenticated' : 'guest-dev',
        profile,
        session,
        summary: result.summary,
      });
    },
    saveFeaturedExamState: async (state) => {
      const { session, profile } = await readAccessibleSnapshot();
      const summary = await learningHistoryRepository.saveFeaturedExamState(session.accountKey, state);
      return buildSnapshot({
        authGateState: session.status === 'authenticated' ? 'authenticated' : 'guest-dev',
        profile,
        session,
        summary,
      });
    },
    seedPreview: async (state) => {
      const { session, profile } = await readDevGuestSnapshot();
      await localLearningHistoryRepository.reset(session.accountKey);

      if (state === 'fresh') {
        await peerPresenceStore.setPreviewSnapshot(getPreviewPeerPresence(state));
        return buildSnapshotForSession(session, {
          authGateState: 'guest-dev',
        });
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

      if (
        state === 'review-day3-available' ||
        state === 'review-day7-available' ||
        state === 'review-day30-available'
      ) {
        const stageMap: Record<
          'review-day3-available' | 'review-day7-available' | 'review-day30-available',
          ReviewStage
        > = {
          'review-day3-available': 'day3',
          'review-day7-available': 'day7',
          'review-day30-available': 'day30',
        };
        const targetStage = stageMap[state as keyof typeof stageMap];
        const completedAt = new Date().toISOString();
        const today = completedAt.slice(0, 10);

        const { reviewTasks } = await learningHistoryRepository.recordAttempt(
          buildPreviewAttemptInput(profile, 'diagnostic', null, completedAt),
        );

        const remappedTasks = reviewTasks.map((task) => ({
          ...task,
          id: `${task.sourceId}__${task.weaknessId}__${targetStage}`,
          stage: targetStage,
          scheduledFor: today,
        }));

        await reviewTaskStore.saveAll(session.accountKey, remappedTasks);
      }

      if (state === 'exam-in-progress') {
        await learningHistoryRepository.saveFeaturedExamState(session.accountKey, {
          examId: 'featured-mock-1',
          status: 'in_progress',
          questionIndex: 11,
          lastOpenedAt: new Date().toISOString(),
        });
      }

      if (state === 'practice-graduated') {
        const completedAt = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
        const { reviewTasks } = await learningHistoryRepository.recordAttempt(
          buildPreviewAttemptInput(profile, 'diagnostic', null, completedAt),
        );
        const remappedTasks = reviewTasks.map((task) => ({
          ...task,
          stage: 'day1' as ReviewStage,
          scheduledFor: completedAt.slice(0, 10),
        }));
        await reviewTaskStore.saveAll(session.accountKey, remappedTasks);
        const graduatedProfile: LearnerProfile = {
          ...profile,
          practiceGraduatedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await profileStore.save(graduatedProfile);
      }

      await peerPresenceStore.setPreviewSnapshot(getPreviewPeerPresence(state));
      return buildSnapshotForSession(session, {
        authGateState: 'guest-dev',
      });
    },
    pullReviewDueDates: async () => {
      const { session } = await readDevGuestSnapshot();
      const tasks = await reviewTaskStore.load(session.accountKey);
      const today = new Date().toISOString().slice(0, 10);
      const updated = tasks.map((task) =>
        task.completed ? task : { ...task, scheduledFor: today },
      );
      await reviewTaskStore.saveAll(session.accountKey, updated);
      return readCurrentSnapshot();
    },
    resetLocalProfile: async () => {
      const { session } = await readDevGuestSnapshot();

      await localLearningHistoryRepository.reset(session.accountKey);
      await profileStore.reset(session.accountKey);
      await peerPresenceStore.clearPreviewSnapshot();
      return buildSnapshotForSession(session, {
        authGateState: 'guest-dev',
      });
    },
  };
}

import type { AuthClient } from '@/features/auth/auth-client';
import type { AuthSession } from '@/features/auth/types';
import { weaknessOrder, type WeaknessId } from '@/data/diagnosisMap';
import { buildHomeLearningState, type HomeLearningState } from '@/features/learning/home-state';
import { getPreviewPeerPresence } from '@/features/learning/peer-presence-preview';
import type { PreviewablePeerPresenceStore } from '@/features/learning/peer-presence-store';
import {
  createEmptyLearnerSummary,
  type FinalizedAttemptInput,
  type LearningHistoryRepository,
} from '@/features/learning/history-repository';
import { LocalLearningHistoryRepository } from '@/features/learning/local-learning-history-repository';
import type { LearnerSummaryCurrent } from '@/features/learning/types';

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
): FinalizedAttemptInput {
  const completedAt = new Date().toISOString();
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

  const readCurrentSnapshot = async (): Promise<CurrentLearnerSnapshot> => {
    const session = (await authClient.loadSession()) ?? (await authClient.ensureAnonymousSession());
    const profile = await ensureProfile(profileStore, session.accountKey);
    const summary =
      (await learningHistoryRepository.loadCurrentSummary(session.accountKey)) ??
      createEmptyLearnerSummary(session.accountKey);
    return buildSnapshot(session, profile, summary);
  };

  return {
    bootstrap: readCurrentSnapshot,
    refresh: readCurrentSnapshot,
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

      if (learningHistoryRepository instanceof LocalLearningHistoryRepository) {
        await learningHistoryRepository.reset(session.accountKey);
      }

      if (state === 'fresh') {
        await peerPresenceStore.setPreviewSnapshot(getPreviewPeerPresence(state));
        return readCurrentSnapshot();
      }

      if (state === 'diagnostic-complete' || state === 'review-available') {
        await learningHistoryRepository.recordAttempt(buildPreviewAttemptInput(profile, 'diagnostic'));
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
      const currentSession = await authClient.ensureAnonymousSession();

      if (learningHistoryRepository instanceof LocalLearningHistoryRepository) {
        await learningHistoryRepository.reset(currentSession.accountKey);
      }

      await profileStore.reset(currentSession.accountKey);
      await peerPresenceStore.clearPreviewSnapshot();
      const nextSession = await authClient.signOut();
      const nextProfile = await ensureProfile(profileStore, nextSession.accountKey);
      const nextSummary =
        (await learningHistoryRepository.loadCurrentSummary(nextSession.accountKey)) ??
        createEmptyLearnerSummary(nextSession.accountKey);

      return buildSnapshot(nextSession, nextProfile, nextSummary);
    },
  };
}

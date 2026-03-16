import {
  createContext,
  type ReactNode,
  use,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { createAuthClient } from '@/features/auth/create-auth-client';
import type { AuthSession, SupportedAuthProvider } from '@/features/auth/types';
import { createCurrentLearnerController } from '@/features/learner/current-learner-controller';
import { LocalLearnerProfileStore } from '@/features/learner/local-learner-profile-store';
import { createLearningHistoryRepository } from '@/features/learning/create-learning-history-repository';
import type {
  FinalizedAttemptInput,
  HistoryMigrationStatus,
} from '@/features/learning/history-repository';
import type {
  FeaturedExamState,
  LearnerProfile,
  PreviewSeedState,
} from '@/features/learner/types';
import { type HomeLearningState } from '@/features/learning/home-state';
import { LearningHistoryMigrationService } from '@/features/learning/learning-history-migration-service';
import { LocalLearningHistoryRepository } from '@/features/learning/local-learning-history-repository';
import { LocalLearningHistorySnapshotStore } from '@/features/learning/local-learning-history-snapshot-store';
import { StaticPeerPresenceStore } from '@/features/learning/peer-presence-store';
import type { LearnerSummaryCurrent } from '@/features/learning/types';

const peerPresenceStore = new StaticPeerPresenceStore();
const authClient = createAuthClient();
const localLearningHistoryRepository = new LocalLearningHistoryRepository();
const learnerController = createCurrentLearnerController({
  authClient,
  profileStore: new LocalLearnerProfileStore(),
  learningHistoryRepository: createLearningHistoryRepository(authClient),
  localLearningHistoryRepository,
  migrationService: new LearningHistoryMigrationService({
    authClient,
    cacheRepository: localLearningHistoryRepository,
    snapshotStore: new LocalLearningHistorySnapshotStore(),
  }),
  peerPresenceStore,
});

export type CurrentLearnerContextValue = {
  isReady: boolean;
  session: AuthSession | null;
  profile: LearnerProfile | null;
  summary: LearnerSummaryCurrent | null;
  homeState: HomeLearningState | null;
  availableAuthProviders: SupportedAuthProvider[];
  refresh(): Promise<void>;
  signIn(provider: SupportedAuthProvider): Promise<HistoryMigrationStatus>;
  signOut(): Promise<void>;
  getHistoryMigrationStatus(sourceAnonymousAccountKey?: string): Promise<HistoryMigrationStatus>;
  importAnonymousHistory(sourceAnonymousAccountKey: string): Promise<HistoryMigrationStatus>;
  updateGrade(grade: LearnerProfile['grade']): Promise<void>;
  recordAttempt(input: FinalizedAttemptInput): Promise<void>;
  saveFeaturedExamState(state: FeaturedExamState): Promise<void>;
  seedPreview(state: PreviewSeedState): Promise<void>;
  resetLocalProfile(): Promise<void>;
};

const CurrentLearnerContext = createContext<CurrentLearnerContextValue | undefined>(undefined);

type LearnerState = {
  isReady: boolean;
  session: AuthSession | null;
  profile: LearnerProfile | null;
  summary: LearnerSummaryCurrent | null;
  homeState: HomeLearningState | null;
};

function createInitialLearnerState(): LearnerState {
  return {
    isReady: false,
    session: null,
    profile: null,
    summary: null,
    homeState: null,
  };
}

export function CurrentLearnerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LearnerState>(createInitialLearnerState);

  useEffect(() => {
    let isMounted = true;

    learnerController
      .bootstrap()
      .then((snapshot) => {
        if (!isMounted) {
          return;
        }

        setState({
          isReady: true,
          session: snapshot.session,
          profile: snapshot.profile,
          summary: snapshot.summary,
          homeState: snapshot.homeState,
        });
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setState((prev) => ({
          ...prev,
          isReady: true,
        }));
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<CurrentLearnerContextValue>(
    () => ({
      ...state,
      availableAuthProviders: authClient.getSupportedProviders(),
      refresh: async () => {
        const snapshot = await learnerController.refresh();
        setState({
          isReady: true,
          session: snapshot.session,
          profile: snapshot.profile,
          summary: snapshot.summary,
          homeState: snapshot.homeState,
        });
      },
      signIn: async (provider) => {
        const result = await learnerController.signIn(provider);
        setState({
          isReady: true,
          session: result.snapshot.session,
          profile: result.snapshot.profile,
          summary: result.snapshot.summary,
          homeState: result.snapshot.homeState,
        });
        return result.migrationStatus;
      },
      signOut: async () => {
        const snapshot = await learnerController.signOut();
        setState({
          isReady: true,
          session: snapshot.session,
          profile: snapshot.profile,
          summary: snapshot.summary,
          homeState: snapshot.homeState,
        });
      },
      getHistoryMigrationStatus: (sourceAnonymousAccountKey) => {
        return learnerController.getHistoryMigrationStatus(sourceAnonymousAccountKey);
      },
      importAnonymousHistory: async (sourceAnonymousAccountKey) => {
        const result = await learnerController.importAnonymousHistory(sourceAnonymousAccountKey);
        setState({
          isReady: true,
          session: result.snapshot.session,
          profile: result.snapshot.profile,
          summary: result.snapshot.summary,
          homeState: result.snapshot.homeState,
        });
        return result.migrationStatus;
      },
      updateGrade: async (grade) => {
        const snapshot = await learnerController.updateGrade(grade);
        setState({
          isReady: true,
          session: snapshot.session,
          profile: snapshot.profile,
          summary: snapshot.summary,
          homeState: snapshot.homeState,
        });
      },
      recordAttempt: async (input) => {
        const snapshot = await learnerController.recordAttempt(input);
        setState({
          isReady: true,
          session: snapshot.session,
          profile: snapshot.profile,
          summary: snapshot.summary,
          homeState: snapshot.homeState,
        });
      },
      saveFeaturedExamState: async (featuredExamState) => {
        const snapshot = await learnerController.saveFeaturedExamState(featuredExamState);
        setState({
          isReady: true,
          session: snapshot.session,
          profile: snapshot.profile,
          summary: snapshot.summary,
          homeState: snapshot.homeState,
        });
      },
      seedPreview: async (previewState) => {
        const snapshot = await learnerController.seedPreview(previewState);
        setState({
          isReady: true,
          session: snapshot.session,
          profile: snapshot.profile,
          summary: snapshot.summary,
          homeState: snapshot.homeState,
        });
      },
      resetLocalProfile: async () => {
        const snapshot = await learnerController.resetLocalProfile();
        setState({
          isReady: true,
          session: snapshot.session,
          profile: snapshot.profile,
          summary: snapshot.summary,
          homeState: snapshot.homeState,
        });
      },
    }),
    [state],
  );

  return <CurrentLearnerContext.Provider value={value}>{children}</CurrentLearnerContext.Provider>;
}

export function useCurrentLearner() {
  const context = use(CurrentLearnerContext);
  if (!context) {
    throw new Error('useCurrentLearner must be used within CurrentLearnerProvider');
  }

  return context;
}

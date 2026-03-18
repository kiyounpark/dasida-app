import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  canUseDevGuestAuth,
  getRequiredAuthProviders,
  type AuthBlockingReason,
  type AuthGateState,
} from '@/features/auth/auth-policy';
import { createAuthClient } from '@/features/auth/create-auth-client';
import type { AuthSession, SupportedAuthProvider } from '@/features/auth/types';
import { createCurrentLearnerController } from '@/features/learner/current-learner-controller';
import { LocalLearnerProfileStore } from '@/features/learner/local-learner-profile-store';
import { createLearningHistoryRepository } from '@/features/learning/create-learning-history-repository';
import type {
  FinalizedAttemptInput,
  HistoryMigrationStatus,
} from '@/features/learning/history-repository';
import type { LearningSource } from '@/features/learning/history-types';
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
import type { LearnerSummaryCurrent, LearningAttempt } from '@/features/learning/types';

const peerPresenceStore = new StaticPeerPresenceStore();
const authClient = createAuthClient();
const localLearningHistoryRepository = new LocalLearningHistoryRepository();
const availableAuthProviders = getRequiredAuthProviders(authClient.getSupportedProviders());
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
  authGateState: AuthGateState;
  authBlockingReason: AuthBlockingReason;
  canUseDevGuestAuth: boolean;
  authNoticeMessage: string | null;
  session: AuthSession | null;
  profile: LearnerProfile | null;
  summary: LearnerSummaryCurrent | null;
  homeState: HomeLearningState | null;
  availableAuthProviders: SupportedAuthProvider[];
  dismissAuthNotice(): void;
  refresh(): Promise<void>;
  loadRecentAttempts(options?: { source?: LearningSource; limit?: number }): Promise<LearningAttempt[]>;
  continueAsDevGuest(): Promise<void>;
  signIn(provider: SupportedAuthProvider): Promise<void>;
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
  authGateState: AuthGateState;
  authBlockingReason: AuthBlockingReason;
  canUseDevGuestAuth: boolean;
  authNoticeMessage: string | null;
  session: AuthSession | null;
  profile: LearnerProfile | null;
  summary: LearnerSummaryCurrent | null;
  homeState: HomeLearningState | null;
};

function createInitialLearnerState(): LearnerState {
  return {
    isReady: false,
    authGateState: 'loading',
    authBlockingReason: null,
    canUseDevGuestAuth: canUseDevGuestAuth(),
    authNoticeMessage: null,
    session: null,
    profile: null,
    summary: null,
    homeState: null,
  };
}

function toLearnerState(snapshot: Awaited<ReturnType<typeof learnerController.bootstrap>>): LearnerState {
  return {
    isReady: true,
    authGateState: snapshot.authGateState,
    authBlockingReason: snapshot.authBlockingReason,
    canUseDevGuestAuth: snapshot.canUseDevGuestAuth,
    authNoticeMessage: snapshot.authNoticeMessage,
    session: snapshot.session,
    profile: snapshot.profile,
    summary: snapshot.summary,
    homeState: snapshot.homeState,
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

        setState(toLearnerState(snapshot));
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setState((prev) => ({
          ...prev,
          isReady: true,
          authGateState: 'required',
        }));
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const loadRecentAttempts = useCallback(
    (options?: { source?: LearningSource; limit?: number }) => {
      return learnerController.loadRecentAttempts(options);
    },
    [],
  );

  const value = useMemo<CurrentLearnerContextValue>(
    () => ({
      ...state,
      availableAuthProviders,
      dismissAuthNotice: () => {
        setState((prev) => ({
          ...prev,
          authNoticeMessage: null,
        }));
      },
      refresh: async () => {
        const snapshot = await learnerController.refresh();
        setState(toLearnerState(snapshot));
      },
      loadRecentAttempts,
      continueAsDevGuest: async () => {
        const snapshot = await learnerController.continueAsDevGuest();
        setState(toLearnerState(snapshot));
      },
      signIn: async (provider) => {
        const snapshot = await learnerController.signIn(provider);
        setState(toLearnerState(snapshot));
      },
      signOut: async () => {
        const snapshot = await learnerController.signOut();
        setState(toLearnerState(snapshot));
      },
      getHistoryMigrationStatus: (sourceAnonymousAccountKey) => {
        return learnerController.getHistoryMigrationStatus(sourceAnonymousAccountKey);
      },
      importAnonymousHistory: async (sourceAnonymousAccountKey) => {
        const result = await learnerController.importAnonymousHistory(sourceAnonymousAccountKey);
        setState(toLearnerState(result.snapshot));
        return result.migrationStatus;
      },
      updateGrade: async (grade) => {
        const snapshot = await learnerController.updateGrade(grade);
        setState(toLearnerState(snapshot));
      },
      recordAttempt: async (input) => {
        const snapshot = await learnerController.recordAttempt(input);
        setState(toLearnerState(snapshot));
      },
      saveFeaturedExamState: async (featuredExamState) => {
        const snapshot = await learnerController.saveFeaturedExamState(featuredExamState);
        setState(toLearnerState(snapshot));
      },
      seedPreview: async (previewState) => {
        const snapshot = await learnerController.seedPreview(previewState);
        setState(toLearnerState(snapshot));
      },
      resetLocalProfile: async () => {
        const snapshot = await learnerController.resetLocalProfile();
        setState(toLearnerState(snapshot));
      },
    }),
    [loadRecentAttempts, state],
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

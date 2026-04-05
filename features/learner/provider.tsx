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
  getAuthBlockingReason,
  getRequiredAuthProviders,
  type AuthBlockingReason,
  type AuthGateState,
} from '@/features/auth/auth-policy';
import { createAuthClient } from '@/features/auth/create-auth-client';
import { isFirebaseAuthConfigured } from '@/features/auth/firebase-config';
import type { AuthSession, SupportedAuthProvider } from '@/features/auth/types';
import { createCurrentLearnerController } from '@/features/learner/current-learner-controller';
import { AnonymousAwareLearnerProfileStore } from '@/features/learner/anonymous-aware-learner-profile-store';
import { FirestoreLearnerProfileStore } from '@/features/learner/firestore-learner-profile-store';
import { LocalLearnerProfileStore } from '@/features/learner/local-learner-profile-store';
import { LocalReviewTaskStore } from '@/features/learning/review-task-store';
import { createLearningHistoryRepository } from '@/features/learning/create-learning-history-repository';
import type {
  FinalizedAttemptInput,
  HistoryMigrationStatus,
} from '@/features/learning/history-repository';
import type { LearningSource } from '@/features/learning/history-types';
import type {
  FeaturedExamState,
  LearnerProfile,
  LearnerTrack,
  PreviewSeedState,
} from '@/features/learner/types';
import { type HomeLearningState } from '@/features/learning/home-state';
import { LearningHistoryMigrationService } from '@/features/learning/learning-history-migration-service';
import { LocalLearningHistoryRepository } from '@/features/learning/local-learning-history-repository';
import { LocalLearningHistorySnapshotStore } from '@/features/learning/local-learning-history-snapshot-store';
import { StaticPeerPresenceStore } from '@/features/learning/peer-presence-store';
import type { LearnerSummaryCurrent, LearningAttempt } from '@/features/learning/types';
import { LEARNER_BOOTSTRAP_TIMEOUT_MS } from '@/features/auth/bootstrap-timeouts';

const peerPresenceStore = new StaticPeerPresenceStore();
const authClient = createAuthClient();
const localLearningHistoryRepository = new LocalLearningHistoryRepository();
const localReviewTaskStore = new LocalReviewTaskStore();
const availableAuthProviders = getRequiredAuthProviders(authClient.getSupportedProviders());
const fallbackAuthBlockingReason = getAuthBlockingReason({
  availableProviders: availableAuthProviders,
  isFirebaseAuthConfigured: isFirebaseAuthConfigured(),
});
// 웹: Firebase 인증 없이 Firestore 접근 불가 → 항상 LocalStore
// Android/iOS + Firebase 구성됨:
//   - 익명 세션 → LocalStore  (Firestore 접근 권한 없음)
//   - 인증 세션 → FirestoreStore (기기 간 동기화)
// Android/iOS + Firebase 미구성: 항상 LocalStore
const profileStore =
  isFirebaseAuthConfigured() && process.env.EXPO_OS !== 'web'
    ? new AnonymousAwareLearnerProfileStore(
        () => authClient.loadSession(),
        new FirestoreLearnerProfileStore(),
        new LocalLearnerProfileStore(),
      )
    : new LocalLearnerProfileStore();

const learnerController = createCurrentLearnerController({
  authClient,
  profileStore,
  learningHistoryRepository: createLearningHistoryRepository(authClient),
  localLearningHistoryRepository,
  migrationService: new LearningHistoryMigrationService({
    authClient,
    cacheRepository: localLearningHistoryRepository,
    snapshotStore: new LocalLearningHistorySnapshotStore(),
  }),
  peerPresenceStore,
  reviewTaskStore: localReviewTaskStore,
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
  updateOnboardingProfile(
    nickname: string,
    grade: Exclude<LearnerProfile['grade'], 'unknown'>,
    track?: LearnerTrack,
  ): Promise<void>;
  graduateToPractice(): Promise<void>;
  recordAttempt(input: FinalizedAttemptInput): Promise<void>;
  saveFeaturedExamState(state: FeaturedExamState): Promise<void>;
  seedPreview(state: PreviewSeedState): Promise<void>;
  pullReviewDueDates(): Promise<void>;
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

function createBootstrapFallbackLearnerState(): LearnerState {
  return {
    isReady: true,
    authGateState: 'required',
    authBlockingReason: fallbackAuthBlockingReason,
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
    let didSettle = false;

    const timeoutId = setTimeout(() => {
      if (!isMounted || didSettle) {
        return;
      }

      didSettle = true;
      console.warn('[CurrentLearnerProvider] bootstrap timed out — falling back to auth required.');
      setState(createBootstrapFallbackLearnerState());
    }, LEARNER_BOOTSTRAP_TIMEOUT_MS);

    learnerController
      .bootstrap()
      .then((snapshot) => {
        if (!isMounted || didSettle) {
          return;
        }

        didSettle = true;
        clearTimeout(timeoutId);
        setState(toLearnerState(snapshot));
      })
      .catch((error) => {
        if (!isMounted || didSettle) {
          return;
        }

        didSettle = true;
        clearTimeout(timeoutId);
        console.warn('[CurrentLearnerProvider] bootstrap failed — falling back to auth required.', error);
        setState(createBootstrapFallbackLearnerState());
      });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
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
      updateOnboardingProfile: async (nickname, grade, track) => {
        const snapshot = await learnerController.updateOnboardingProfile(nickname, grade, track);
        setState(toLearnerState(snapshot));
      },
      graduateToPractice: async () => {
        const snapshot = await learnerController.graduateToPractice();
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
      pullReviewDueDates: async () => {
        const snapshot = await learnerController.pullReviewDueDates();
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

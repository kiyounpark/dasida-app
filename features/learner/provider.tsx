import {
  createContext,
  type ReactNode,
  use,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { LocalAnonymousAuthClient } from '@/features/auth/local-anonymous-auth-client';
import type { AuthSession } from '@/features/auth/types';
import { createCurrentLearnerController } from '@/features/learner/current-learner-controller';
import { LocalLearnerProfileStore } from '@/features/learner/local-learner-profile-store';
import { createLearningHistoryRepository } from '@/features/learning/create-learning-history-repository';
import type { FinalizedAttemptInput } from '@/features/learning/history-repository';
import type {
  FeaturedExamState,
  LearnerProfile,
  PreviewSeedState,
} from '@/features/learner/types';
import { type HomeLearningState } from '@/features/learning/home-state';
import { StaticPeerPresenceStore } from '@/features/learning/peer-presence-store';
import type { LearnerSummaryCurrent } from '@/features/learning/types';

const peerPresenceStore = new StaticPeerPresenceStore();
const authClient = new LocalAnonymousAuthClient();
const learnerController = createCurrentLearnerController({
  authClient,
  profileStore: new LocalLearnerProfileStore(),
  learningHistoryRepository: createLearningHistoryRepository(authClient),
  peerPresenceStore,
});

export type CurrentLearnerContextValue = {
  isReady: boolean;
  session: AuthSession | null;
  profile: LearnerProfile | null;
  summary: LearnerSummaryCurrent | null;
  homeState: HomeLearningState | null;
  refresh(): Promise<void>;
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

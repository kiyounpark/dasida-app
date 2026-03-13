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
import type {
  DiagnosticSummarySnapshot,
  LearnerProfile,
  PreviewSeedState,
} from '@/features/learner/types';
import { type HomeLearningState } from '@/features/learning/home-state';
import { StaticPeerPresenceStore } from '@/features/learning/peer-presence-store';
import { LocalReviewTaskStore } from '@/features/learning/review-task-store';
import type { ReviewTask } from '@/features/learning/types';

const peerPresenceStore = new StaticPeerPresenceStore();
const learnerController = createCurrentLearnerController({
  authClient: new LocalAnonymousAuthClient(),
  profileStore: new LocalLearnerProfileStore(),
  reviewTaskStore: new LocalReviewTaskStore(),
  peerPresenceStore,
});

export type CurrentLearnerContextValue = {
  isReady: boolean;
  session: AuthSession | null;
  profile: LearnerProfile | null;
  reviewTasks: ReviewTask[];
  homeState: HomeLearningState | null;
  refresh(): Promise<void>;
  updateGrade(grade: LearnerProfile['grade']): Promise<void>;
  saveDiagnosticSummary(summary: DiagnosticSummarySnapshot): Promise<void>;
  seedPreview(state: PreviewSeedState): Promise<void>;
  resetLocalProfile(): Promise<void>;
};

const CurrentLearnerContext = createContext<CurrentLearnerContextValue | undefined>(undefined);

type LearnerState = {
  isReady: boolean;
  session: AuthSession | null;
  profile: LearnerProfile | null;
  reviewTasks: ReviewTask[];
  homeState: HomeLearningState | null;
};

function createInitialLearnerState(): LearnerState {
  return {
    isReady: false,
    session: null,
    profile: null,
    reviewTasks: [],
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
          reviewTasks: snapshot.reviewTasks,
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
          reviewTasks: snapshot.reviewTasks,
          homeState: snapshot.homeState,
        });
      },
      updateGrade: async (grade) => {
        const snapshot = await learnerController.updateGrade(grade);
        setState({
          isReady: true,
          session: snapshot.session,
          profile: snapshot.profile,
          reviewTasks: snapshot.reviewTasks,
          homeState: snapshot.homeState,
        });
      },
      saveDiagnosticSummary: async (summary) => {
        const snapshot = await learnerController.saveDiagnosticSummary(summary);
        setState({
          isReady: true,
          session: snapshot.session,
          profile: snapshot.profile,
          reviewTasks: snapshot.reviewTasks,
          homeState: snapshot.homeState,
        });
      },
      seedPreview: async (previewState) => {
        const snapshot = await learnerController.seedPreview(previewState);
        setState({
          isReady: true,
          session: snapshot.session,
          profile: snapshot.profile,
          reviewTasks: snapshot.reviewTasks,
          homeState: snapshot.homeState,
        });
      },
      resetLocalProfile: async () => {
        const snapshot = await learnerController.resetLocalProfile();
        setState({
          isReady: true,
          session: snapshot.session,
          profile: snapshot.profile,
          reviewTasks: snapshot.reviewTasks,
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

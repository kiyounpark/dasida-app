import type { WeaknessId } from '@/data/diagnosisMap';
import { createContext, type ReactNode, use, useMemo, useReducer } from 'react';
import { createInitialWeaknessScores } from './engine';
import type { QuizSessionState } from './types';

type QuizSessionContextValue = {
  state: QuizSessionState;
  advancePractice: () => void;
  completeChallenge: () => void;
  resetSession: () => void;
  seedPracticeQueue: (weaknesses: WeaknessId[]) => void;
};

type Action =
  | { type: 'RESET' }
  | { type: 'ADVANCE_PRACTICE' }
  | { type: 'SEED_PRACTICE_QUEUE'; payload: { weaknesses: WeaknessId[] } }
  | { type: 'COMPLETE_CHALLENGE' };

function createInitialState(): QuizSessionState {
  return {
    hasStarted: false,
    totalQuestions: 10,
    attemptId: undefined,
    startedAt: undefined,
    currentQuestionIndex: 0,
    answers: [],
    isDiagnosing: false,
    diagnosisQueue: [],
    weaknessScores: createInitialWeaknessScores(),
    result: undefined,
    practiceMode: undefined,
    practiceQueue: [],
    practiceIndex: 0,
    practiceCompleted: false,
    challengeCompleted: false,
  };
}

export function reducer(state: QuizSessionState, action: Action): QuizSessionState {
  switch (action.type) {
    case 'RESET': {
      return createInitialState();
    }

    case 'ADVANCE_PRACTICE': {
      if (state.practiceMode !== 'weakness' || state.practiceQueue.length === 0) return state;

      const nextIndex = state.practiceIndex + 1;

      if (nextIndex >= state.practiceQueue.length) {
        return {
          ...state,
          practiceIndex: state.practiceQueue.length,
          practiceCompleted: true,
        };
      }

      return {
        ...state,
        practiceIndex: nextIndex,
      };
    }

    case 'SEED_PRACTICE_QUEUE': {
      if (state.result || state.practiceQueue.length > 0) return state;
      if (action.payload.weaknesses.length === 0) return state;
      return {
        ...state,
        practiceMode: 'weakness',
        practiceQueue: action.payload.weaknesses,
        practiceIndex: 0,
        practiceCompleted: false,
      };
    }

    case 'COMPLETE_CHALLENGE': {
      return {
        ...state,
        challengeCompleted: true,
      };
    }

    default:
      return state;
  }
}

const QuizSessionContext = createContext<QuizSessionContextValue | undefined>(undefined);

export function QuizSessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  const value = useMemo<QuizSessionContextValue>(
    () => ({
      state,
      advancePractice: () => {
        dispatch({ type: 'ADVANCE_PRACTICE' });
      },
      completeChallenge: () => {
        dispatch({ type: 'COMPLETE_CHALLENGE' });
      },
      resetSession: () => {
        dispatch({ type: 'RESET' });
      },
      seedPracticeQueue: (weaknesses: WeaknessId[]) => {
        dispatch({ type: 'SEED_PRACTICE_QUEUE', payload: { weaknesses } });
      },
    }),
    [state],
  );

  return <QuizSessionContext.Provider value={value}>{children}</QuizSessionContext.Provider>;
}

export function useQuizSession() {
  const context = use(QuizSessionContext);
  if (!context) {
    throw new Error('useQuizSession must be used within QuizSessionProvider');
  }
  return context;
}

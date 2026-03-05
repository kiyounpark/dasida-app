import { problemData } from '@/data/problemData';
import type { SolveMethodId } from '@/data/diagnosisTree';
import type { WeaknessId } from '@/data/diagnosisMap';
import {
  buildQuizResult,
  createInitialWeaknessScores,
  incrementWeaknessScore,
} from './engine';
import type { QuizSessionState } from './types';
import { createContext, type ReactNode, useContext, useMemo, useReducer } from 'react';

type QuizSessionContextValue = {
  state: QuizSessionState;
  submitCorrectAnswer: (problemId: string, selectedIndex: number) => void;
  submitWrongAnswer: (
    problemId: string,
    selectedIndex: number,
    methodId: SolveMethodId,
    weaknessId: WeaknessId,
  ) => void;
  advancePractice: () => void;
  completeChallenge: () => void;
  resetSession: () => void;
};

type Action =
  | { type: 'RESET' }
  | { type: 'SUBMIT_CORRECT'; payload: { problemId: string; selectedIndex: number } }
  | {
      type: 'SUBMIT_WRONG';
      payload: {
        problemId: string;
        selectedIndex: number;
        methodId: SolveMethodId;
        weaknessId: WeaknessId;
      };
    }
  | { type: 'ADVANCE_PRACTICE' }
  | { type: 'COMPLETE_CHALLENGE' };

const TOTAL_QUESTIONS = problemData.length;

function createInitialState(): QuizSessionState {
  return {
    currentQuestionIndex: 0,
    answers: [],
    weaknessScores: createInitialWeaknessScores(),
    result: undefined,
    practiceMode: undefined,
    practiceQueue: [],
    practiceIndex: 0,
    practiceCompleted: false,
    challengeCompleted: false,
  };
}

function finalizeIfNeeded(
  nextState: QuizSessionState,
  nextQuestionIndex: number,
): QuizSessionState {
  if (nextQuestionIndex < TOTAL_QUESTIONS) {
    return nextState;
  }

  const result = buildQuizResult(nextState.answers, nextState.weaknessScores, TOTAL_QUESTIONS);

  return {
    ...nextState,
    currentQuestionIndex: TOTAL_QUESTIONS,
    result,
    practiceMode: result.allCorrect ? 'challenge' : 'weakness',
    practiceQueue: result.allCorrect ? [] : result.topWeaknesses,
    practiceIndex: 0,
    practiceCompleted: false,
    challengeCompleted: false,
  };
}

function reducer(state: QuizSessionState, action: Action): QuizSessionState {
  switch (action.type) {
    case 'RESET': {
      return createInitialState();
    }

    case 'SUBMIT_CORRECT': {
      if (state.currentQuestionIndex >= TOTAL_QUESTIONS) return state;

      const answers = [
        ...state.answers,
        {
          problemId: action.payload.problemId,
          selectedIndex: action.payload.selectedIndex,
          isCorrect: true,
        },
      ];

      const nextQuestionIndex = state.currentQuestionIndex + 1;

      return finalizeIfNeeded(
        {
          ...state,
          currentQuestionIndex: nextQuestionIndex,
          answers,
        },
        nextQuestionIndex,
      );
    }

    case 'SUBMIT_WRONG': {
      if (state.currentQuestionIndex >= TOTAL_QUESTIONS) return state;

      const answers = [
        ...state.answers,
        {
          problemId: action.payload.problemId,
          selectedIndex: action.payload.selectedIndex,
          isCorrect: false,
          methodId: action.payload.methodId,
          weaknessId: action.payload.weaknessId,
        },
      ];

      const weaknessScores = incrementWeaknessScore(state.weaknessScores, action.payload.weaknessId);
      const nextQuestionIndex = state.currentQuestionIndex + 1;

      return finalizeIfNeeded(
        {
          ...state,
          currentQuestionIndex: nextQuestionIndex,
          answers,
          weaknessScores,
        },
        nextQuestionIndex,
      );
    }

    case 'ADVANCE_PRACTICE': {
      if (!state.result || state.practiceMode !== 'weakness') return state;

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
      submitCorrectAnswer: (problemId, selectedIndex) => {
        dispatch({
          type: 'SUBMIT_CORRECT',
          payload: { problemId, selectedIndex },
        });
      },
      submitWrongAnswer: (problemId, selectedIndex, methodId, weaknessId) => {
        dispatch({
          type: 'SUBMIT_WRONG',
          payload: { problemId, selectedIndex, methodId, weaknessId },
        });
      },
      advancePractice: () => {
        dispatch({ type: 'ADVANCE_PRACTICE' });
      },
      completeChallenge: () => {
        dispatch({ type: 'COMPLETE_CHALLENGE' });
      },
      resetSession: () => {
        dispatch({ type: 'RESET' });
      },
    }),
    [state],
  );

  return <QuizSessionContext.Provider value={value}>{children}</QuizSessionContext.Provider>;
}

export function useQuizSession() {
  const context = useContext(QuizSessionContext);
  if (!context) {
    throw new Error('useQuizSession must be used within QuizSessionProvider');
  }
  return context;
}

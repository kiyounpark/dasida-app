import type { WeaknessId } from '@/data/diagnosisMap';
import type { SolveMethodId } from '@/data/diagnosisTree';
import { problemData } from '@/data/problemData';
import { createContext, type ReactNode, use, useMemo, useReducer } from 'react';
import {
    buildQuizResult,
    createInitialWeaknessScores,
    incrementWeaknessScore,
} from './engine';
import type { QuizSessionState } from './types';

type QuizSessionContextValue = {
  state: QuizSessionState;
  startSession: () => void;
  submitAnswer: (problemId: string, selectedIndex: number, isCorrect: boolean) => void;
  submitDiagnosis: (
    answerIndex: number,
    methodId: SolveMethodId,
    weaknessId: WeaknessId,
  ) => void;
  advancePractice: () => void;
  completeChallenge: () => void;
  resetSession: () => void;
};

type Action =
  | { type: 'RESET' }
  | { type: 'START' }
  | { type: 'SUBMIT_ANSWER'; payload: { problemId: string; selectedIndex: number; isCorrect: boolean } }
  | {
      type: 'SUBMIT_DIAGNOSIS';
      payload: {
        answerIndex: number;
        methodId: SolveMethodId;
        weaknessId: WeaknessId;
      };
    }
  | { type: 'ADVANCE_PRACTICE' }
  | { type: 'COMPLETE_CHALLENGE' };

const TOTAL_QUESTIONS = problemData.length;

function createInitialState(): QuizSessionState {
  return {
    hasStarted: false,
    currentQuestionIndex: 0,
    answers: [],
    isDiagnosing: false,
    diagnosisQueue: [],
    currentDiagnosisIndex: 0,
    weaknessScores: createInitialWeaknessScores(),
    result: undefined,
    practiceMode: undefined,
    practiceQueue: [],
    practiceIndex: 0,
    practiceCompleted: false,
    challengeCompleted: false,
  };
}

function checkPhaseTransition(state: QuizSessionState): QuizSessionState {
  if (state.currentQuestionIndex < TOTAL_QUESTIONS) {
    return state;
  }

  // All questions answered. Determine if we need diagnosis.
  if (!state.isDiagnosing && state.currentDiagnosisIndex === 0) {
    const wrongIndices = state.answers
      .map((ans, idx) => (ans.isCorrect ? -1 : idx))
      .filter((idx) => idx !== -1);

    if (wrongIndices.length > 0) {
      return {
        ...state,
        currentQuestionIndex: TOTAL_QUESTIONS,
        isDiagnosing: true,
        diagnosisQueue: wrongIndices,
        currentDiagnosisIndex: 0,
      };
    }
  }

  // Check if diagnosis is complete
  if (state.isDiagnosing) {
    if (state.currentDiagnosisIndex < state.diagnosisQueue.length) {
      return state;
    }
    // Diagnosis finished
    state = { ...state, isDiagnosing: false };
  }

  const result = buildQuizResult(state.answers, state.weaknessScores, TOTAL_QUESTIONS);

  return {
    ...state,
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

    case 'START': {
      if (state.hasStarted) return state;
      return {
        ...state,
        hasStarted: true,
      };
    }

    case 'SUBMIT_ANSWER': {
      if (state.currentQuestionIndex >= TOTAL_QUESTIONS) return state;

      const answers = [
        ...state.answers,
        {
          problemId: action.payload.problemId,
          selectedIndex: action.payload.selectedIndex,
          isCorrect: action.payload.isCorrect,
        },
      ];

      return checkPhaseTransition({
        ...state,
        currentQuestionIndex: state.currentQuestionIndex + 1,
        answers,
      });
    }

    case 'SUBMIT_DIAGNOSIS': {
      if (!state.isDiagnosing) return state;

      const { answerIndex, methodId, weaknessId } = action.payload;
      
      const newAnswers = [...state.answers];
      newAnswers[answerIndex] = {
        ...newAnswers[answerIndex],
        methodId,
        weaknessId,
      };

      const weaknessScores = incrementWeaknessScore(state.weaknessScores, weaknessId);

      return checkPhaseTransition({
        ...state,
        answers: newAnswers,
        weaknessScores,
        currentDiagnosisIndex: state.currentDiagnosisIndex + 1,
      });
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
      startSession: () => {
        dispatch({ type: 'START' });
      },
      submitAnswer: (problemId, selectedIndex, isCorrect) => {
        dispatch({
          type: 'SUBMIT_ANSWER',
          payload: { problemId, selectedIndex, isCorrect },
        });
      },
      submitDiagnosis: (answerIndex, methodId, weaknessId) => {
        dispatch({
          type: 'SUBMIT_DIAGNOSIS',
          payload: { answerIndex, methodId, weaknessId },
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
  const context = use(QuizSessionContext);
  if (!context) {
    throw new Error('useQuizSession must be used within QuizSessionProvider');
  }
  return context;
}

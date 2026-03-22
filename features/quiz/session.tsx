import type { WeaknessId } from '@/data/diagnosisMap';
import { problemData } from '@/data/problemData';
import { createContext, type ReactNode, use, useMemo, useReducer } from 'react';
import {
  buildQuizResult,
  createInitialWeaknessScores,
  incrementWeaknessScore,
} from './engine';
import type { DiagnosisDetailTrace, DiagnosisRoutingTrace, QuizSessionState } from './types';

type QuizSessionContextValue = {
  state: QuizSessionState;
  startSession: () => void;
  goToPreviousQuestion: () => void;
  submitAnswer: (problemId: string, selectedIndex: number, isCorrect: boolean) => void;
  confirmDiagnosisMethod: (answerIndex: number, trace: DiagnosisRoutingTrace) => void;
  submitDiagnosisWeakness: (
    answerIndex: number,
    weaknessId: WeaknessId,
    detailTrace?: DiagnosisDetailTrace,
  ) => void;
  finishDiagnosis: () => void;
  advancePractice: () => void;
  completeChallenge: () => void;
  resetSession: () => void;
};

type Action =
  | { type: 'RESET' }
  | { type: 'START' }
  | { type: 'GO_TO_PREVIOUS_QUESTION' }
  | { type: 'SUBMIT_ANSWER'; payload: { problemId: string; selectedIndex: number; isCorrect: boolean } }
  | {
      type: 'CONFIRM_DIAGNOSIS_METHOD';
      payload: {
        answerIndex: number;
        trace: DiagnosisRoutingTrace;
      };
    }
  | {
      type: 'SUBMIT_DIAGNOSIS_WEAKNESS';
      payload: {
        answerIndex: number;
        weaknessId: WeaknessId;
        detailTrace?: DiagnosisDetailTrace;
      };
    }
  | { type: 'FINISH_DIAGNOSIS' }
  | { type: 'ADVANCE_PRACTICE' }
  | { type: 'COMPLETE_CHALLENGE' };

const TOTAL_QUESTIONS = problemData.length;

function createAttemptId() {
  return `attempt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function createInitialState(): QuizSessionState {
  return {
    hasStarted: false,
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

function finalizeQuiz(state: QuizSessionState): QuizSessionState {
  const attemptId = state.attemptId ?? createAttemptId();
  const startedAt = state.startedAt ?? new Date().toISOString();
  const completedAt = new Date().toISOString();
  const result = buildQuizResult(
    attemptId,
    startedAt,
    completedAt,
    state.answers,
    state.weaknessScores,
    TOTAL_QUESTIONS,
  );

  return {
    ...state,
    attemptId,
    startedAt,
    currentQuestionIndex: TOTAL_QUESTIONS,
    isDiagnosing: false,
    diagnosisQueue: [],
    result,
    practiceMode: result.allCorrect ? 'challenge' : 'weakness',
    practiceQueue: result.allCorrect ? [] : result.topWeaknesses,
    practiceIndex: 0,
    practiceCompleted: false,
    challengeCompleted: false,
  };
}

function checkPhaseTransition(state: QuizSessionState): QuizSessionState {
  if (state.currentQuestionIndex < TOTAL_QUESTIONS) {
    return state;
  }

  if (state.result) {
    return state;
  }

  const wrongIndices = state.answers
    .map((answer, index) => (answer.isCorrect ? -1 : index))
    .filter((index) => index !== -1);

  if (!state.isDiagnosing) {
    if (wrongIndices.length > 0) {
      return {
        ...state,
        currentQuestionIndex: TOTAL_QUESTIONS,
        isDiagnosing: true,
        diagnosisQueue: wrongIndices,
      };
    }

    return finalizeQuiz(state);
  }

  const isDiagnosisComplete = state.diagnosisQueue.every((answerIndex) => {
    const answer = state.answers[answerIndex];
    return Boolean(answer?.weaknessId);
  });

  if (!isDiagnosisComplete) {
    return state;
  }

  return finalizeQuiz(state);
}

function reducer(state: QuizSessionState, action: Action): QuizSessionState {
  switch (action.type) {
    case 'RESET': {
      return createInitialState();
    }

    case 'START': {
      if (state.hasStarted) return state;
      const startedAt = new Date().toISOString();
      return {
        ...state,
        hasStarted: true,
        attemptId: createAttemptId(),
        startedAt,
      };
    }

    case 'GO_TO_PREVIOUS_QUESTION': {
      if (state.isDiagnosing || state.currentQuestionIndex <= 0) return state;

      return {
        ...state,
        currentQuestionIndex: state.currentQuestionIndex - 1,
      };
    }

    case 'SUBMIT_ANSWER': {
      if (state.currentQuestionIndex >= TOTAL_QUESTIONS) return state;

      const answers = [...state.answers];
      answers[state.currentQuestionIndex] = {
        problemId: action.payload.problemId,
        selectedIndex: action.payload.selectedIndex,
        isCorrect: action.payload.isCorrect,
      };

      return checkPhaseTransition({
        ...state,
        currentQuestionIndex: state.currentQuestionIndex + 1,
        answers,
      });
    }

    case 'CONFIRM_DIAGNOSIS_METHOD': {
      if (!state.isDiagnosing) return state;

      const { answerIndex, trace } = action.payload;
      if (state.answers[answerIndex]?.weaknessId) return state;
      
      const newAnswers = [...state.answers];
      newAnswers[answerIndex] = {
        ...newAnswers[answerIndex],
        methodId: trace.finalMethodId,
        diagnosisRouting: trace,
      };

      return {
        ...state,
        answers: newAnswers,
      };
    }

    case 'SUBMIT_DIAGNOSIS_WEAKNESS': {
      if (!state.isDiagnosing) return state;

      const { answerIndex, weaknessId, detailTrace } = action.payload;
      if (state.answers[answerIndex]?.weaknessId) return state;
      
      const newAnswers = [...state.answers];
      newAnswers[answerIndex] = {
        ...newAnswers[answerIndex],
        weaknessId,
        diagnosisDetailTrace: detailTrace,
      };

      const weaknessScores = incrementWeaknessScore(state.weaknessScores, weaknessId);

      return checkPhaseTransition({
        ...state,
        answers: newAnswers,
        weaknessScores,
      });
    }

    case 'FINISH_DIAGNOSIS': {
      if (!state.isDiagnosing) return state;
      return finalizeQuiz(state);
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
      goToPreviousQuestion: () => {
        dispatch({ type: 'GO_TO_PREVIOUS_QUESTION' });
      },
      submitAnswer: (problemId, selectedIndex, isCorrect) => {
        dispatch({
          type: 'SUBMIT_ANSWER',
          payload: { problemId, selectedIndex, isCorrect },
        });
      },
      confirmDiagnosisMethod: (answerIndex, trace) => {
        dispatch({
          type: 'CONFIRM_DIAGNOSIS_METHOD',
          payload: { answerIndex, trace },
        });
      },
      submitDiagnosisWeakness: (answerIndex, weaknessId, detailTrace) => {
        dispatch({
          type: 'SUBMIT_DIAGNOSIS_WEAKNESS',
          payload: { answerIndex, weaknessId, detailTrace },
        });
      },
      finishDiagnosis: () => {
        dispatch({ type: 'FINISH_DIAGNOSIS' });
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

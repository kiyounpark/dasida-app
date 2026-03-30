import { createContext, type ReactNode, use, useMemo, useReducer } from 'react';

import type { ExamProblem } from '@/features/quiz/data/exam-problems';

import type { ExamAnswer, ExamResultSummary, ExamSessionState } from './types';

// ── Context value ──────────────────────────────────────────────────────────────

type ExamSessionContextValue = {
  state: ExamSessionState;
  initExam: (examId: string, problems: ExamProblem[]) => void;
  setAnswer: (index: number, answer: ExamAnswer) => void;
  goToNext: () => void;
  goToPrev: () => void;
  goToIndex: (index: number) => void;
  submitExam: () => void;
  resetExam: () => void;
};

// ── Actions ────────────────────────────────────────────────────────────────────

type Action =
  | { type: 'INIT_EXAM'; payload: { examId: string; problems: ExamProblem[] } }
  | { type: 'SET_ANSWER'; payload: { index: number; answer: ExamAnswer } }
  | { type: 'GO_TO_NEXT' }
  | { type: 'GO_TO_PREV' }
  | { type: 'GO_TO_INDEX'; payload: { index: number } }
  | { type: 'SUBMIT_EXAM' }
  | { type: 'RESET' };

// ── Helpers ────────────────────────────────────────────────────────────────────

function createAttemptId() {
  return `exam-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createInitialState(): ExamSessionState {
  return {
    examId: '',
    problems: [],
    currentIndex: 0,
    answers: [],
    hasStarted: false,
    startedAt: null,
    attemptId: null,
    isFinished: false,
    result: null,
  };
}

function buildResult(state: ExamSessionState): ExamResultSummary {
  const completedAt = new Date().toISOString();
  const attemptId = state.attemptId ?? createAttemptId();
  const startedAt = state.startedAt ?? completedAt;

  let correct = 0;
  let wrong = 0;
  let unanswered = 0;
  let totalScore = 0;
  let maxScore = 0;

  const perProblem = state.problems.map((problem, i) => {
    const userAnswer = state.answers[i] ?? null;
    const correctAnswer = problem.answer;
    const isCorrect = userAnswer !== null && userAnswer === correctAnswer;
    const earnedScore = isCorrect ? problem.score : 0;

    maxScore += problem.score;
    if (userAnswer === null) {
      unanswered++;
    } else if (isCorrect) {
      correct++;
      totalScore += problem.score;
    } else {
      wrong++;
    }

    return { number: problem.number, userAnswer, correctAnswer, isCorrect, earnedScore };
  });

  const total = state.problems.length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return {
    attemptId,
    examId: state.examId,
    startedAt,
    completedAt,
    total,
    correct,
    wrong,
    unanswered,
    accuracy,
    totalScore,
    maxScore,
    perProblem,
  };
}

// ── Reducer ────────────────────────────────────────────────────────────────────

function reducer(state: ExamSessionState, action: Action): ExamSessionState {
  switch (action.type) {
    case 'INIT_EXAM': {
      const { examId, problems } = action.payload;
      return {
        ...createInitialState(),
        examId,
        problems,
        answers: new Array(problems.length).fill(null) as ExamAnswer[],
        hasStarted: true,
        startedAt: new Date().toISOString(),
        attemptId: createAttemptId(),
      };
    }

    case 'SET_ANSWER': {
      if (state.isFinished) return state;
      const answers = [...state.answers];
      answers[action.payload.index] = action.payload.answer;
      return { ...state, answers };
    }

    case 'GO_TO_NEXT': {
      const next = Math.min(state.currentIndex + 1, state.problems.length - 1);
      return { ...state, currentIndex: next };
    }

    case 'GO_TO_PREV': {
      const prev = Math.max(state.currentIndex - 1, 0);
      return { ...state, currentIndex: prev };
    }

    case 'GO_TO_INDEX': {
      const idx = Math.max(0, Math.min(action.payload.index, state.problems.length - 1));
      return { ...state, currentIndex: idx };
    }

    case 'SUBMIT_EXAM': {
      if (state.isFinished || !state.hasStarted) return state;
      const result = buildResult(state);
      return { ...state, isFinished: true, result };
    }

    case 'RESET':
      return createInitialState();

    default:
      return state;
  }
}

// ── Context + Provider ─────────────────────────────────────────────────────────

const ExamSessionContext = createContext<ExamSessionContextValue | undefined>(undefined);

export function ExamSessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  const value = useMemo<ExamSessionContextValue>(
    () => ({
      state,
      initExam: (examId, problems) => dispatch({ type: 'INIT_EXAM', payload: { examId, problems } }),
      setAnswer: (index, answer) => dispatch({ type: 'SET_ANSWER', payload: { index, answer } }),
      goToNext: () => dispatch({ type: 'GO_TO_NEXT' }),
      goToPrev: () => dispatch({ type: 'GO_TO_PREV' }),
      goToIndex: (index) => dispatch({ type: 'GO_TO_INDEX', payload: { index } }),
      submitExam: () => dispatch({ type: 'SUBMIT_EXAM' }),
      resetExam: () => dispatch({ type: 'RESET' }),
    }),
    [state],
  );

  return <ExamSessionContext.Provider value={value}>{children}</ExamSessionContext.Provider>;
}

export function useExamSession() {
  const ctx = use(ExamSessionContext);
  if (!ctx) throw new Error('useExamSession must be used within ExamSessionProvider');
  return ctx;
}

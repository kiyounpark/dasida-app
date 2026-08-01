import type { ErrorCandidate } from '../types';

/** 보기와 정답 번호가 갖춰진 문제 한 개 */
export type PhotoQuiz = {
  setup?: string;
  prompt: string;
  options: string[];
  answerIndex: number;
};

/**
 * 보기와 정답 번호가 실제로 풀 수 있는 모양인지.
 *
 * 범위 검사가 핵심이다 — 정답 인덱스가 보기 밖이면 전부 오답 처리되고
 * 학생 화면에 `정답은 "undefined"`가 그대로 노출된다. (web-proto와 같은 규칙)
 * 보기 개수를 3으로 박지 않는 이유: 서버가 4지선다로 가도 앱이 조용히 죽지 않게.
 */
function isAnswerable(options: unknown, answerIndex: unknown): boolean {
  return (
    Array.isArray(options) &&
    options.length >= 2 &&
    options.every((option) => typeof option === 'string') &&
    Number.isInteger(answerIndex) &&
    (answerIndex as number) >= 0 &&
    (answerIndex as number) < options.length
  );
}

/** 쪽지시험. 못 풀 모양이면 null — 호출부가 조용히 건너뛴다. */
export function readCheckQuiz(candidate: ErrorCandidate | undefined): PhotoQuiz | null {
  if (!candidate?.checkPrompt) return null;
  if (!isAnswerable(candidate.checkOptions, candidate.checkAnswerIndex)) return null;
  return {
    setup: candidate.checkSetup,
    prompt: candidate.checkPrompt,
    options: candidate.checkOptions,
    answerIndex: candidate.checkAnswerIndex,
  };
}

/** 재도전. 하나라도 비면 null이고, 그때도 노트는 그대로 나온다. */
export function readRetryQuiz(candidate: ErrorCandidate | undefined): PhotoQuiz | null {
  if (!candidate?.retrySetup || !candidate.retryPrompt) return null;
  if (!isAnswerable(candidate.retryOptions, candidate.retryAnswerIndex)) return null;
  return {
    setup: candidate.retrySetup,
    prompt: candidate.retryPrompt,
    options: candidate.retryOptions as string[],
    answerIndex: candidate.retryAnswerIndex as number,
  };
}

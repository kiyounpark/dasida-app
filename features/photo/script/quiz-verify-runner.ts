/**
 * 쪽지·재도전 검산 러너 (요청 2 — 09.30 웹, 1.0.10 앱). 분석 결과가 닿을 때 0번 후보 문제를 뒤에서 출발시키고,
 * 쪽지·재도전 차례에 결과를 본다. 이미 와 있으면 0초, 아니면 최대 5초 — 한 번 5초를 태웠으면(쪽지 wait_timeout)
 * 재도전은 안 기다린다(빈 화면 10초 방지). 웹 app.js:851-890과 앱 use-photo-flow.ts:227-295 두 벌을 하나로.
 */
import { readCheckQuiz, readRetryQuiz } from '../flow/quiz-guard';
import { ERROR_CONFIDENCE_MIN } from '../flow/route-from-analysis';
import type { QuizVerdict, QuizVerifyBody } from '../flow/verify-quiz-request';
import type { AnalyzePhotoResult } from '../types';

/** 라이브 p90 4.9초(09.30 밤). 학생이 방법 확인·짚기를 읽는 시간이 앞에 있어 실제 대기는 드물다 */
export const VERIFY_WAIT_MS = 5_000;

export type VerifyKind = 'check' | 'retry';

/** ms는 검산 요청이 걸린 시간 — 안 출발했거나(not_started) 기다리다 끊었으면(wait_timeout) null */
export type RunnerVerdict = {
  verdict: 'match' | 'skip';
  reason: string;
  ms: number | null;
  waitedMs: number;
};

export type QuizVerifyRunner = {
  /** 짚기로 가는 조건(풀이 있음·후보 있음·자신감 문턱)일 때만, 후보 0번만. 서버가 보기 3개만 받아 3개가 아니면 출발 안 함 */
  start: (result: AnalyzePhotoResult) => void;
  /** 절대 안 던진다 */
  verdict: (kind: VerifyKind) => Promise<RunnerVerdict>;
  dispose: () => void;
};

export function createQuizVerifyRunner(
  verifyQuiz: (body: QuizVerifyBody) => Promise<QuizVerdict>,
  base: { submissionId: string | null; qa: boolean },
): QuizVerifyRunner {
  let run: {
    check: Promise<QuizVerdict> | null;
    retry: Promise<QuizVerdict> | null;
    waitedOnce: boolean;
  } | null = null;

  return {
    start(result) {
      const candidate = result.errorCandidates?.[0];
      if (!result.hasSolvingWork || !candidate || !(result.errorConfidence >= ERROR_CONFIDENCE_MIN)) return;
      const check = readCheckQuiz(candidate);
      const retry = readRetryQuiz(candidate);
      run = {
        check:
          check && check.options.length === 3
            ? verifyQuiz({
                kind: 'check',
                setup: check.setup || undefined,
                prompt: check.prompt,
                options: check.options,
                marked: check.answerIndex,
                ...base,
              })
            : null,
        retry:
          retry && retry.options.length === 3
            ? verifyQuiz({
                kind: 'retry',
                setup: retry.setup,
                prompt: retry.prompt,
                options: retry.options,
                marked: retry.answerIndex,
                ...base,
              })
            : null,
        waitedOnce: false,
      };
    },

    async verdict(kind) {
      const startedAt = Date.now();
      const current = run;
      const pending = current?.[kind];
      if (!current || !pending) return { verdict: 'skip', reason: 'not_started', ms: null, waitedMs: 0 };

      const cap = current.waitedOnce ? 0 : VERIFY_WAIT_MS;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const arrived = await Promise.race([
        pending,
        new Promise<null>((resolve) => {
          timer = setTimeout(() => resolve(null), cap);
        }),
      ]);
      clearTimeout(timer);
      const waitedMs = Date.now() - startedAt;
      if (!arrived) {
        current.waitedOnce = true;
        return { verdict: 'skip', reason: 'wait_timeout', ms: null, waitedMs };
      }
      return { verdict: arrived.verdict, reason: arrived.reason, ms: arrived.ms, waitedMs };
    },

    dispose() {
      run = null;
    },
  };
}

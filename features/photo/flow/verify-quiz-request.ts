/**
 * 쪽지·재도전 검산 (요청 2 — 09.30 웹, 1.0.10 앱).
 * analyzePhoto가 만든 문제를 정답 번호 없이 다른 호출이 따로 푼다. 서버가 match를 줄 때만 학생에게 낸다.
 * 서버는 "보기에 정답 없음·여럿·모호"일 때만 막는다(functions/src/verify-quiz-core.ts gateQuizVerdict).
 * 라이브 33문항×5회: 나간 카드 정답 91.0%, 건너뜀 18.8% (기준 🔒 지금 90% · 최종 98%).
 * 설계 docs/research/2026-09-30-quiz-verify-design.md · 원본 web-proto app.js verifyQuizFetch.
 */

const VERIFY_URL = 'https://asia-northeast3-dasida-app.cloudfunctions.net/verifyQuiz';
/** 서버 함수 20초보다 짧게 (web-proto와 같은 값) */
const VERIFY_FETCH_TIMEOUT_MS = 15_000;

export type QuizVerifyBody = {
  kind: 'check' | 'retry';
  setup?: string;
  prompt: string;
  /** 서버가 정확히 3개만 받는다(VerifyQuizRequestSchema) — 호출부가 걸러서 넘긴다 */
  options: string[];
  /** 문제에 붙어 온 정답 번호. 서버는 모델에 안 보여주고 대조에만 쓴다 */
  marked: number;
  submissionId: string | null;
  qa: boolean;
};

export type QuizVerdict = { verdict: 'match' | 'skip'; reason: string; ms: number };

/** 절대 안 던진다 — 없음·모호·에러·시간초과는 전부 skip이고, 그 문제만 건너뛴다(정답을 바꿔 넣지 않는다). */
export async function requestQuizVerify(body: QuizVerifyBody): Promise<QuizVerdict> {
  const startedAt = Date.now();
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), VERIFY_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: abortController.signal,
    });
    if (!response.ok) return { verdict: 'skip', reason: 'error', ms: Date.now() - startedAt };
    const data = (await response.json()) as { verdict?: unknown } | null;
    if (data?.verdict === 'match') return { verdict: 'match', reason: 'match', ms: Date.now() - startedAt };
    return {
      verdict: 'skip',
      reason: String(data?.verdict || 'invalid').slice(0, 20),
      ms: Date.now() - startedAt,
    };
  } catch {
    return {
      verdict: 'skip',
      reason: abortController.signal.aborted ? 'timeout' : 'error',
      ms: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

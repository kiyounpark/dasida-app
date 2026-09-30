// 쪽지·재도전 문제 검산(요청 2) — 순수 함수만. firebase·openai import 없음.
// 설계·측정: docs/research/2026-09-30-quiz-verify-design.md · ~/dev/dasida-measure/2026-09-30-quiz-verify/README.md
// 정답 번호(marked)는 프롬프트에 절대 넣지 않는다 — 번호를 보면 "맞네" 하고 따라간다. 비교는 서버가 한다.
import { z } from 'zod';

// verify.cjs INSTR 글자 그대로. 이 문구가 바뀌면 09.30 측정(오탐 0/54·막음 6/12)이 무효다 — 테스트가 먼저 깨진다.
export const QUIZ_VERIFY_INSTRUCTIONS = [
  '너는 고등학교 수학 문제 검산기다. 아래 [상황]과 [질문]을 직접 풀어라.',
  '보기 중 정답인 보기의 번호(0, 1, 2)를 고른다.',
  '정답이 보기에 없으면 -1, 정답이 둘 이상이면 -2, 상황만으로 답이 정해지지 않으면 -3.',
  '보기를 먼저 보지 말고 스스로 답을 구한 뒤 보기와 맞춰라. solved에는 네가 구한 답을 짧게 적는다.',
].join('\n');

export const QUIZ_VERIFY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['solved', 'answerIndex'],
  properties: { solved: { type: 'string' }, answerIndex: { type: 'integer' } },
} as const;

export const VERIFY_QUIZ_TIMEOUT_SECONDS = 20;
// 재시도 없음(maxRetries 0) — 웹은 5초만 기다리니 재시도는 돈만 쓴다.
export const VERIFY_QUIZ_OPENAI_TIMEOUT_MS = 12_000;

// 보기 3개 고정 — 지시문이 "번호(0, 1, 2)"를 전제한다. 4지로 가면 지시문과 같이 바꾼다.
export const VerifyQuizRequestSchema = z.object({
  kind: z.enum(['check', 'retry']),
  setup: z.string().max(600).optional(),
  prompt: z.string().min(1).max(300),
  options: z.array(z.string().min(1).max(120)).length(3),
  marked: z.number().int().min(0).max(2),
  submissionId: z.string().max(64).nullable().optional(),
  qa: z.boolean().optional(),
});
export type VerifyQuizRequest = z.infer<typeof VerifyQuizRequestSchema>;

export const VerifyQuizModelResultSchema = z.object({
  solved: z.string(),
  answerIndex: z.number(),
});

export function buildQuizVerifyInput({
  setup,
  prompt,
  options,
}: {
  setup?: string;
  prompt: string;
  options: readonly string[];
}): string {
  const blocks: string[] = [];
  if (setup && setup.trim()) blocks.push(`[상황]\n${setup}`);
  blocks.push(`[질문]\n${prompt}`);
  blocks.push(`[보기]\n${options.map((o, k) => `${k}. ${o}`).join('\n')}`);
  return blocks.join('\n\n');
}

export type QuizVerdict = 'match' | 'mismatch' | 'none' | 'multiple' | 'ambiguous' | 'invalid';

// 웹은 match만 쓴다. 나머지는 전부 "그 문제만 건너뜀"이고, 이유는 GA·로그로 갈라 센다.
export function judgeQuizVerify(answerIndex: unknown, marked: number): QuizVerdict {
  if (typeof answerIndex !== 'number' || !Number.isInteger(answerIndex)) return 'invalid';
  if (answerIndex === -1) return 'none';
  if (answerIndex === -2) return 'multiple';
  if (answerIndex === -3) return 'ambiguous';
  if (answerIndex < 0 || answerIndex > 2) return 'invalid';
  return answerIndex === marked ? 'match' : 'mismatch';
}

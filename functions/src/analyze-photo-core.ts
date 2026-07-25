import { diagnosisMethodRoutingCatalog, type SolveMethodId } from './method-catalog';

// 실수 유형 6종 — 문제 푸는 여정 순서. 스키마 enum과 웹 카드가 함께 쓰는 단일 원천.
export const MISTAKE_TYPE_IDS = [
  'concept_gap',    // 개념 구멍
  'formula_recall', // 공식 기억
  'setup_error',    // 식 세우기
  'calc_slip',      // 계산 손실수
  'procedure_miss', // 절차·조건 누락
  'answer_read',    // 마무리 해석
] as const;
export type MistakeTypeId = (typeof MISTAKE_TYPE_IDS)[number];

export type ErrorCandidate = {
  quote: string;          // 학생이 실제 쓴 줄 인용
  why: string;            // 왜 틀렸는지 2~3문장
  mistakeType: MistakeTypeId;
  fix: string;            // 학생 맞춤 처방 한 줄
  checkPrompt: string;    // 쪽지시험 질문
  checkOptions: string[]; // 보기 정확히 3개
  checkAnswerIndex: number; // 0~2
  retrySetup?: string;
  retryPrompt?: string;
  retryOptions?: string[];   // 정확히 3개
  retryAnswerIndex?: number; // 0~2
};

export type VisionRawResult = {
  hasSolvingWork: boolean;
  userAnswer: string | null;
  transcription: string;
  predictedMethodId: string;
  confidence: number;
  candidateMethodIds: string[];
  reason: string;
  errorCandidates: unknown[]; // 정화 전 원본
  errorConfidence: number; // 0~1, 오류 짚기 자신감 (방법 confidence와 별개)
};

export type PhotoRouterResult = {
  hasSolvingWork: boolean;
  userAnswer: string | null;
  transcription: string;
  predictedMethodId: SolveMethodId;
  confidence: number;
  candidateMethodIds: SolveMethodId[];
  reason: string;
  needsManualSelection: boolean;
  source: 'openai-vision';
  errorCandidates: ErrorCandidate[];
  errorConfidence: number;
};

const HIGH_CONFIDENCE_THRESHOLD = 0.74;

// 애노테이션 필수: TS가 filter 술어로 타입을 Exclude<…,'unknown'>로 좁히면
// 아래 includes(raw…as SolveMethodId) 인자와 불일치가 난다.
export const allowedMethodIds: SolveMethodId[] = (
  Object.keys(diagnosisMethodRoutingCatalog) as SolveMethodId[]
).filter((id) => id !== 'unknown');

// AI 응답 방어: 규칙 위반 후보(6종 밖 유형, 빈 인용, 보기≠3, 인덱스 초과)는 버린다.
// 후보가 전부 탈락하면 웹이 알아서 설문으로 가므로 여기서 죽지 않는 게 중요.
export function sanitizeErrorCandidates(
  raw: unknown[],
  hasSolvingWork: boolean,
): ErrorCandidate[] {
  if (!hasSolvingWork || !Array.isArray(raw)) return [];
  const out: ErrorCandidate[] = [];
  for (const item of raw) {
    if (out.length >= 2) break;
    if (!item || typeof item !== 'object') continue;
    const c = item as Record<string, unknown>;
    const quote = typeof c.quote === 'string' ? c.quote.trim() : '';
    const why = typeof c.why === 'string' ? c.why.trim() : '';
    const fix = typeof c.fix === 'string' ? c.fix.trim() : '';
    const checkPrompt = typeof c.checkPrompt === 'string' ? c.checkPrompt.trim() : '';
    // 걸러내지 않고 검증만 한다 — 빈 보기를 제거하면 checkAnswerIndex가 밀려 오답이 정답이 된다.
    const checkOptions =
      Array.isArray(c.checkOptions) &&
      c.checkOptions.every((o) => typeof o === 'string' && o.trim() !== '')
        ? (c.checkOptions as string[])
        : [];
    const checkAnswerIndex = typeof c.checkAnswerIndex === 'number' ? c.checkAnswerIndex : -1;
    const mistakeType = MISTAKE_TYPE_IDS.find((id) => id === c.mistakeType);
    if (!quote || !why || !fix || !checkPrompt || !mistakeType) continue;
    if (checkOptions.length !== 3 || checkAnswerIndex < 0 || checkAnswerIndex > 2) continue;
    const retrySetup = typeof c.retrySetup === 'string' ? c.retrySetup.trim() : '';
    const retryPrompt = typeof c.retryPrompt === 'string' ? c.retryPrompt.trim() : '';
    const retryOptions =
      Array.isArray(c.retryOptions) &&
      c.retryOptions.every((o) => typeof o === 'string' && o.trim() !== '')
        ? (c.retryOptions as string[])
        : [];
    const retryAnswerIndex = typeof c.retryAnswerIndex === 'number' ? c.retryAnswerIndex : -1;
    const retryValid =
      retrySetup !== '' && retryPrompt !== '' &&
      retryOptions.length === 3 && retryAnswerIndex >= 0 && retryAnswerIndex <= 2;
    out.push({
      quote, why, mistakeType, fix, checkPrompt, checkOptions, checkAnswerIndex,
      ...(retryValid ? { retrySetup, retryPrompt, retryOptions, retryAnswerIndex } : {}),
    });
  }
  return out;
}

export function buildPhotoRouterResult(raw: VisionRawResult): PhotoRouterResult {
  const predictedMethodId = allowedMethodIds.includes(raw.predictedMethodId as SolveMethodId)
    ? (raw.predictedMethodId as SolveMethodId)
    : 'unknown';

  const candidates = new Set<SolveMethodId>();
  if (predictedMethodId !== 'unknown') {
    candidates.add(predictedMethodId);
  }
  raw.candidateMethodIds.forEach((id) => {
    if (allowedMethodIds.includes(id as SolveMethodId)) {
      candidates.add(id as SolveMethodId);
    }
  });
  if (candidates.size === 0) {
    candidates.add('unknown');
  }

  const needsManualSelection =
    !raw.hasSolvingWork ||
    predictedMethodId === 'unknown' ||
    raw.confidence < HIGH_CONFIDENCE_THRESHOLD;

  const errorCandidates = sanitizeErrorCandidates(raw.errorCandidates, raw.hasSolvingWork);
  // 후보가 전부 탈락했으면 자신감도 0으로 — 웹 검문소가 한 가지 숫자만 보면 되게
  const errorConfidence = errorCandidates.length === 0
    ? 0
    : Math.min(1, Math.max(0, raw.errorConfidence));

  return {
    hasSolvingWork: raw.hasSolvingWork,
    userAnswer: raw.userAnswer,
    transcription: raw.transcription,
    predictedMethodId,
    confidence: raw.confidence,
    candidateMethodIds: Array.from(candidates),
    reason: raw.reason,
    needsManualSelection,
    source: 'openai-vision',
    errorCandidates,
    errorConfidence,
  };
}

export function buildMethodContextText(): string {
  const lines = allowedMethodIds.map((id) => {
    const method = diagnosisMethodRoutingCatalog[id];
    const examples = method.exampleUtterances.slice(0, 2).join(' / ');
    return [
      `- id: ${method.id}`,
      `  이름: ${method.labelKo}`,
      `  설명: ${method.summary}`,
      `  예시: ${examples || '(없음)'}`,
    ].join('\n');
  });

  return ['허용된 풀이법 id: ' + allowedMethodIds.join(', '), '', '풀이법 설명:', ...lines].join('\n');
}

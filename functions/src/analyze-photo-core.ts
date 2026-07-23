import { diagnosisMethodRoutingCatalog, type SolveMethodId } from './method-catalog';

export type VisionRawResult = {
  hasSolvingWork: boolean;
  userAnswer: string | null;
  transcription: string;
  predictedMethodId: string;
  confidence: number;
  candidateMethodIds: string[];
  reason: string;
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
};

const HIGH_CONFIDENCE_THRESHOLD = 0.74;

// 애노테이션 필수: TS가 filter 술어로 타입을 Exclude<…,'unknown'>로 좁히면
// 아래 includes(raw…as SolveMethodId) 인자와 불일치가 난다.
export const allowedMethodIds: SolveMethodId[] = (
  Object.keys(diagnosisMethodRoutingCatalog) as SolveMethodId[]
).filter((id) => id !== 'unknown');

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

import { diagnosisMethodRoutingCatalog } from '@/data/diagnosis-method-routing';
import { methodOptions, type SolveMethodId } from '@/data/diagnosisTree';

import type { AnalyzePhotoResult } from '../types';

/** 오류 짚기 검문소 문턱 — 낮게 시작해 채점표 데이터로 조인다 (web-proto app.js와 같은 값) */
export const ERROR_CONFIDENCE_MIN = 0.5;
/** 추측 확인 하한 — 이 미만이면 단정도 추측도 하지 않고 바로 후보를 보여준다 */
export const SOFT_ASSERT_MIN = 0.45;
/** 후보를 못 좁혔을 때 전체(31개)를 쏟지 않고 주제 기반 상위 N개만 */
export const TOPIC_TOP_N = 5;

/** unknown을 뺀 고를 수 있는 방법 전체 */
export const selectableMethodIds: SolveMethodId[] = methodOptions
  .map((option) => option.id)
  .filter((id) => id !== 'unknown');

/** 카탈로그에 없는 id가 와도 화면이 죽지 않게 — 마지막 화면(노트)이 비는 게 제일 나쁘다 */
export function methodLabel(id: SolveMethodId | undefined): string {
  return (id && diagnosisMethodRoutingCatalog[id]?.labelKo) || '방법 미상';
}

/**
 * 분석 결과가 가는 네 갈래. 어느 갈래인지만 정하고 말은 안 만든다 —
 * 말풍선으로 바꾸는 건 use-photo-flow가 한다.
 */
export type PhotoRoute =
  | { kind: 'retake' }
  | { kind: 'assert'; methodId: SolveMethodId; label: string; snippet: string }
  | { kind: 'soft-assert'; methodId: SolveMethodId; label: string; snippet: string }
  | { kind: 'candidates'; methodIds: SolveMethodId[] };

export function routeFromAnalysis(result: AnalyzePhotoResult): PhotoRoute {
  // 갈래 3: 풀이 흔적이 없으면 짚어줄 게 없다 → 다시 찍기
  if (!result.hasSolvingWork) {
    return { kind: 'retake' };
  }

  const snippet = firstSnippet(result.transcription);
  const known = isKnownMethod(result.predictedMethodId);

  if (result.needsManualSelection) {
    // 1등 추측이 살아 있고 확신이 중간이면 단정 대신 "~같아. 맞아?"
    if (known && result.confidence >= SOFT_ASSERT_MIN) {
      return {
        kind: 'soft-assert',
        methodId: result.predictedMethodId,
        label: methodLabel(result.predictedMethodId),
        snippet,
      };
    }
    return { kind: 'candidates', methodIds: filterCandidates(result.candidateMethodIds) };
  }

  // 서버·앱 카탈로그가 어긋난 경우(사본 드리프트) — 죽지 말고 후보로 넘긴다
  if (!known) {
    return { kind: 'candidates', methodIds: filterCandidates(result.candidateMethodIds) };
  }

  // 갈래 1: 단언
  return {
    kind: 'assert',
    methodId: result.predictedMethodId,
    label: methodLabel(result.predictedMethodId),
    snippet,
  };
}

/** 방법이 확정됐을 때 오류 짚기로 갈 수 있는지 — 주머니가 살아 있고 자신감이 문턱을 넘어야 한다 */
export function canPointAtError(
  result: AnalyzePhotoResult | null,
  methodId: SolveMethodId,
): boolean {
  if (!result || result.predictedMethodId !== methodId) return false;
  return result.errorCandidates.length > 0 && result.errorConfidence >= ERROR_CONFIDENCE_MIN;
}

/** 읽어낸 풀이의 첫 줄 — 인용해서 "네 풀이를 봤다"를 보이게 한다 */
export function firstSnippet(transcription: string): string {
  if (!transcription) return '';
  const cut = transcription.split(/[.。\n]/)[0].trim();
  return cut.length > 40 ? `${cut.slice(0, 40)}…` : cut;
}

/** unknown·카탈로그에 없는 id·이미 아니라고 한 방법을 걸러낸다 */
export function filterCandidates(
  candidateIds: SolveMethodId[],
  excludeIds: SolveMethodId[] = [],
): SolveMethodId[] {
  return candidateIds.filter((id) => isKnownMethod(id) && !excludeIds.includes(id));
}

/**
 * 후보가 비었을 때의 폴백 — 읽은 풀이 내용의 키워드로 상위 N개만 추린다.
 * 전체 31개를 쏟으면 학생이 튕긴다.
 */
export function matchMethodsByKeywords(rawText: string, limit = TOPIC_TOP_N): SolveMethodId[] {
  const text = (rawText || '').toLowerCase();
  if (!text) return [];
  return selectableMethodIds
    .map((id) => {
      const info = diagnosisMethodRoutingCatalog[id];
      const hits = [...info.keywords, info.labelKo].reduce(
        (count, keyword) => count + (text.includes(keyword.toLowerCase()) ? 1 : 0),
        0,
      );
      return { id, hits };
    })
    .filter((scored) => scored.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, limit)
    .map((scored) => scored.id);
}

function isKnownMethod(id: SolveMethodId): boolean {
  return id !== 'unknown' && Boolean(diagnosisMethodRoutingCatalog[id]);
}

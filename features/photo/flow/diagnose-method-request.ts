/**
 * 학생이 자기 말로 쓴 풀이 방법 → diagnoseMethod(AI)가 방법을 고른다. 원본 web-proto app.js routeFromText.
 * 서버 functions/src/diagnosis-method.ts (allowedMethodIds ≤35 · exampleUtterances ≤5 · 30초).
 * 웹(번들)과 앱이 같이 쓴다 — react-native·expo import 금지.
 */
import { diagnosisMethodRoutingCatalog } from '@/data/diagnosis-method-routing';
import type { SolveMethodId } from '@/data/diagnosisTree';

import { selectableMethodIds } from './route-from-analysis';

const DIAGNOSE_URL = 'https://asia-northeast3-dasida-app.cloudfunctions.net/diagnoseMethod';
const DIAGNOSE_TIMEOUT_MS = 30_000;

export type DiagnoseMethodResult = {
  predictedMethodId: SolveMethodId;
  confidence: number;
  candidateMethodIds: SolveMethodId[];
  needsManualSelection: boolean;
  reason: string;
};

/** 서버에 보낼 '보기 목록' (전체 카탈로그, unknown 제외) */
const methodDescriptors = selectableMethodIds.map((id) => {
  const info = diagnosisMethodRoutingCatalog[id];
  return {
    id: info.id,
    labelKo: info.labelKo,
    summary: info.summary,
    exampleUtterances: info.exampleUtterances.slice(0, 5),
  };
});

/**
 * 안 던진다 — 실패·시간초과·모양이 어긋난 응답은 전부 null(호출부가 키워드로 좁힌다).
 * problemId는 서버 로그 구분용 — 웹 'photo-flow-web', 앱 'photo-flow-app'.
 */
export async function requestDiagnoseMethod(
  rawText: string,
  { problemId }: { problemId: string },
): Promise<DiagnoseMethodResult | null> {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), DIAGNOSE_TIMEOUT_MS);
  try {
    const response = await fetch(DIAGNOSE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problemId,
        rawText,
        allowedMethodIds: selectableMethodIds,
        allowedMethods: methodDescriptors,
      }),
      signal: abortController.signal,
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<DiagnoseMethodResult> | null;
    if (
      !data ||
      typeof data.predictedMethodId !== 'string' ||
      typeof data.needsManualSelection !== 'boolean' ||
      !Array.isArray(data.candidateMethodIds)
    ) {
      return null;
    }
    return {
      predictedMethodId: data.predictedMethodId,
      confidence: typeof data.confidence === 'number' ? data.confidence : 0,
      candidateMethodIds: data.candidateMethodIds,
      needsManualSelection: data.needsManualSelection,
      reason: typeof data.reason === 'string' ? data.reason : '',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

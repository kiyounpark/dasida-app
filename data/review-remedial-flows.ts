import type { WeaknessId } from './diagnosisMap';

export type ExplainNode = {
  id: string;
  kind: 'explain';
  title: string;
  body: string;
  primaryLabel: '다음으로';
  primaryNextNodeId: string;
  secondaryLabel: '모르겠어요';
  secondaryNextNodeId: string;
  // Phase 2 review-router 라우팅 메타데이터 (스펙 §5.1).
  // - summary: 노드가 다루는 학습 요지 한 줄.
  // - triggers: 라우터가 매칭할 사용자 발화 예시.
  // 모두 optional 이며, 채워진 explain 노드만 라우팅 후보로 사용된다.
  summary?: string;
  triggers?: readonly string[];
  /** 이 노드에 도달한 학생에게 매핑되는 약점 신호 (spec §2.1). 진단의 동일 필드와 모양 일치. */
  weaknessId?: WeaknessId;
};

export type CheckNode = {
  id: string;
  kind: 'check';
  title: string;
  prompt: string;
  options: ReadonlyArray<{
    id: string;
    text: string;
    isCorrect: boolean;
    nextNodeId: string;
    /** 이 옵션을 누른 학생에게 매핑되는 약점 신호 (spec §2.1). */
    weaknessId?: WeaknessId;
  }>;
  dontKnowNextNodeId: string;
};

export type ExitNode = {
  id: string;
  kind: 'exit';
};

/**
 * 학생 사유 진단 카드 (deep 보완 흐름 전용, 본 스펙 §0).
 * 정답·오답 개념 없음 — 모든 옵션이 동등하게 다음 노드로 분기.
 */
export type DiagnoseNode = {
  id: string;
  kind: 'diagnose';
  title: string;
  body: string;
  options: ReadonlyArray<{
    id: string;
    text: string;
    nextNodeId: string;
  }>;
};

/**
 * 보완 흐름 정리 카드 (deep 보완 흐름 전용, 본 스펙 §0).
 * "여기까지 왔다"는 성취 신호. nextNodeId 는 보통 exit 노드.
 */
export type SummaryNode = {
  id: string;
  kind: 'summary';
  title: string;
  body: string;
  nextNodeId: string;
};

export type RemedialNode = ExplainNode | CheckNode | ExitNode | DiagnoseNode | SummaryNode;

export type RemedialFlow = {
  nodes: Record<string, RemedialNode>;
};

import { formula_understanding_flow } from './remedial-flows/formula_understanding';
import { discriminant_calculation_flow } from './remedial-flows/discriminant_calculation';
import { calc_repeated_error_flow } from './remedial-flows/calc_repeated_error';
import { radical_simplification_error_flow } from './remedial-flows/radical_simplification_error';

export const remedialFlows: Partial<Record<WeaknessId, RemedialFlow>> = {
  formula_understanding: formula_understanding_flow,
  discriminant_calculation: discriminant_calculation_flow,
  calc_repeated_error: calc_repeated_error_flow,
  radical_simplification_error: radical_simplification_error_flow,
};

export function getRemedialNode(
  weaknessId: WeaknessId,
  nodeId: string,
): RemedialNode | undefined {
  return remedialFlows[weaknessId]?.nodes[nodeId];
}

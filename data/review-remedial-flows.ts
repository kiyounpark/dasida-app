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
  }>;
  dontKnowNextNodeId: string;
};

export type ExitNode = {
  id: string;
  kind: 'exit';
};

export type RemedialNode = ExplainNode | CheckNode | ExitNode;

export type RemedialFlow = {
  nodes: Record<string, RemedialNode>;
};

import { formula_understanding_flow } from './remedial-flows/formula_understanding';

export const remedialFlows: Partial<Record<WeaknessId, RemedialFlow>> = {
  formula_understanding: formula_understanding_flow,
};

export function getRemedialNode(
  weaknessId: WeaknessId,
  nodeId: string,
): RemedialNode | undefined {
  return remedialFlows[weaknessId]?.nodes[nodeId];
}

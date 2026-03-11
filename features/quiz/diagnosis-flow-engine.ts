import {
  detailedDiagnosisFlows,
  type CheckNode,
  type ChoiceNode,
  type DetailedDiagnosisFlow,
  type DiagnosisFlowNode,
  type ExplainNode,
} from '@/data/detailedDiagnosisFlows';
import type { WeaknessId } from '@/data/diagnosisMap';
import type { SolveMethodId } from '@/data/diagnosisTree';
import type { DiagnosisDetailTrace, DiagnosisFlowEvent } from './types';

export type DiagnosisFlowDraft = {
  methodId: SolveMethodId;
  flowId: SolveMethodId;
  currentNodeId: string;
  visitedNodeIds: string[];
  events: DiagnosisFlowEvent[];
  usedDontKnow: boolean;
};

function appendVisitedNode(draft: DiagnosisFlowDraft, nodeId: string): string[] {
  if (draft.visitedNodeIds[draft.visitedNodeIds.length - 1] === nodeId) {
    return draft.visitedNodeIds;
  }
  return [...draft.visitedNodeIds, nodeId];
}

export function getDiagnosisFlow(methodId: SolveMethodId): DetailedDiagnosisFlow {
  const flow = detailedDiagnosisFlows[methodId];

  if (!flow) {
    throw new Error(`Diagnosis flow not found for method: ${methodId}`);
  }

  return flow;
}

export function getNode(flow: DetailedDiagnosisFlow, nodeId: string): DiagnosisFlowNode {
  const node = flow.nodes[nodeId];
  if (!node) {
    throw new Error(`Diagnosis flow node not found: ${flow.methodId}/${nodeId}`);
  }
  return node;
}

export function createDiagnosisFlowDraft(methodId: SolveMethodId): DiagnosisFlowDraft {
  const flow = getDiagnosisFlow(methodId);

  return {
    methodId,
    flowId: flow.methodId,
    currentNodeId: flow.startNodeId,
    visitedNodeIds: [flow.startNodeId],
    events: [],
    usedDontKnow: false,
  };
}

export function advanceFromChoice(
  draft: DiagnosisFlowDraft,
  optionId: string,
): DiagnosisFlowDraft {
  const flow = getDiagnosisFlow(draft.methodId);
  const node = getNode(flow, draft.currentNodeId);

  if (node.kind !== 'choice') {
    throw new Error(`advanceFromChoice expected choice node, got ${node.kind}`);
  }

  const choiceNode = node as ChoiceNode;
  const option = choiceNode.options.find((item) => item.id === optionId);

  if (!option) {
    throw new Error(`Choice option not found: ${draft.methodId}/${draft.currentNodeId}/${optionId}`);
  }

  return {
    ...draft,
    currentNodeId: option.nextNodeId,
    visitedNodeIds: appendVisitedNode(draft, option.nextNodeId),
    events: [
      ...draft.events,
      { kind: 'branch', nodeId: choiceNode.id, optionId: option.id, weaknessId: option.weaknessId },
    ],
  };
}

export function advanceFromExplain(
  draft: DiagnosisFlowDraft,
  action: 'continue' | 'dont_know',
): DiagnosisFlowDraft {
  const flow = getDiagnosisFlow(draft.methodId);
  const node = getNode(flow, draft.currentNodeId);

  if (node.kind !== 'explain') {
    throw new Error(`advanceFromExplain expected explain node, got ${node.kind}`);
  }

  const explainNode = node as ExplainNode;
  const nextNodeId =
    action === 'continue' ? explainNode.primaryNextNodeId : explainNode.secondaryNextNodeId;

  return {
    ...draft,
    currentNodeId: nextNodeId,
    visitedNodeIds: appendVisitedNode(draft, nextNodeId),
    usedDontKnow: draft.usedDontKnow || action === 'dont_know',
    events: [
      ...draft.events,
      action === 'continue'
        ? { kind: 'explain_continue', nodeId: explainNode.id }
        : { kind: 'dont_know', nodeId: explainNode.id },
    ],
  };
}

export function advanceFromCheck(
  draft: DiagnosisFlowDraft,
  optionId?: string,
): DiagnosisFlowDraft {
  const flow = getDiagnosisFlow(draft.methodId);
  const node = getNode(flow, draft.currentNodeId);

  if (node.kind !== 'check') {
    throw new Error(`advanceFromCheck expected check node, got ${node.kind}`);
  }

  const checkNode = node as CheckNode;

  if (!optionId) {
    const nextNodeId = checkNode.dontKnowNextNodeId;
    return {
      ...draft,
      currentNodeId: nextNodeId,
      visitedNodeIds: appendVisitedNode(draft, nextNodeId),
      usedDontKnow: true,
      events: [...draft.events, { kind: 'dont_know', nodeId: checkNode.id }],
    };
  }

  const option = checkNode.options.find((item) => item.id === optionId);

  if (!option) {
    throw new Error(`Check option not found: ${draft.methodId}/${draft.currentNodeId}/${optionId}`);
  }

  return {
    ...draft,
    currentNodeId: option.nextNodeId,
    visitedNodeIds: appendVisitedNode(draft, option.nextNodeId),
    events: [
      ...draft.events,
      {
        kind: 'check',
        nodeId: checkNode.id,
        optionId: option.id,
        isCorrect: option.isCorrect,
        weaknessId: option.weaknessId,
      },
    ],
  };
}

export function buildDiagnosisDetailTrace(
  draft: DiagnosisFlowDraft,
  finalWeaknessId: WeaknessId,
): DiagnosisDetailTrace {
  return {
    methodId: draft.methodId,
    flowId: draft.flowId,
    visitedNodeIds: draft.visitedNodeIds,
    events: draft.events,
    usedDontKnow: draft.usedDontKnow,
    finalWeaknessId,
  };
}

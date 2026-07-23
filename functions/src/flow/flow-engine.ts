// 사본(추림): features/quiz/diagnosis-flow-engine.ts 의 순수 walk 함수만 (2026-07-23)
// 웹 프로토타입이 브라우저에서 걷던 진단 flow를 서버에서 대신 걷기 위한 최소 엔진.
// AI 도움/trace 관련 함수는 프로토타입에 불필요하여 제외했다. 원본 walk 로직이 바뀌면 함께 갱신.
import {
  detailedDiagnosisFlows,
  type CheckNode,
  type ChoiceNode,
  type DetailedDiagnosisFlow,
  type DiagnosisFlowNode,
  type ExplainNode,
} from './detailedDiagnosisFlows';
import type { WeaknessId } from './diagnosisMap';
import type { SolveMethodId } from './diagnosisTree';

// 원본 features/quiz/types.ts 의 DiagnosisFlowEvent 중 walk 단계에서 쓰는 항목만.
export type DiagnosisFlowEvent =
  | { kind: 'branch'; nodeId: string; optionId: string; weaknessId?: WeaknessId }
  | { kind: 'explain_continue'; nodeId: string }
  | { kind: 'dont_know'; nodeId: string }
  | { kind: 'check'; nodeId: string; optionId: string; isCorrect: boolean; weaknessId?: WeaknessId };

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

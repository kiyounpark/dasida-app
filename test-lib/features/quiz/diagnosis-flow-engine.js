"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDiagnosisFlow = getDiagnosisFlow;
exports.getNode = getNode;
exports.createDiagnosisFlowDraft = createDiagnosisFlowDraft;
exports.advanceFromChoice = advanceFromChoice;
exports.advanceFromExplain = advanceFromExplain;
exports.advanceFromCheck = advanceFromCheck;
exports.appendAiHelpRequested = appendAiHelpRequested;
exports.appendAiHelpContinue = appendAiHelpContinue;
exports.appendAiHelpFallback = appendAiHelpFallback;
exports.buildDiagnosisDetailTrace = buildDiagnosisDetailTrace;
const detailedDiagnosisFlows_1 = require("../../data/detailedDiagnosisFlows");
function appendVisitedNode(draft, nodeId) {
    if (draft.visitedNodeIds[draft.visitedNodeIds.length - 1] === nodeId) {
        return draft.visitedNodeIds;
    }
    return [...draft.visitedNodeIds, nodeId];
}
function getDiagnosisFlow(methodId) {
    const flow = detailedDiagnosisFlows_1.detailedDiagnosisFlows[methodId];
    if (!flow) {
        throw new Error(`Diagnosis flow not found for method: ${methodId}`);
    }
    return flow;
}
function getNode(flow, nodeId) {
    const node = flow.nodes[nodeId];
    if (!node) {
        throw new Error(`Diagnosis flow node not found: ${flow.methodId}/${nodeId}`);
    }
    return node;
}
function createDiagnosisFlowDraft(methodId) {
    const flow = getDiagnosisFlow(methodId);
    return {
        methodId,
        flowId: flow.methodId,
        currentNodeId: flow.startNodeId,
        visitedNodeIds: [flow.startNodeId],
        events: [],
        usedDontKnow: false,
        usedAiHelp: false,
    };
}
function appendEvent(draft, event, options) {
    return {
        ...draft,
        events: [...draft.events, event],
        usedAiHelp: draft.usedAiHelp || Boolean(options?.usedAiHelp),
    };
}
function advanceFromChoice(draft, optionId) {
    const flow = getDiagnosisFlow(draft.methodId);
    const node = getNode(flow, draft.currentNodeId);
    if (node.kind !== 'choice') {
        throw new Error(`advanceFromChoice expected choice node, got ${node.kind}`);
    }
    const choiceNode = node;
    const option = choiceNode.options.find((item) => item.id === optionId);
    if (!option) {
        throw new Error(`Choice option not found: ${draft.methodId}/${draft.currentNodeId}/${optionId}`);
    }
    return {
        ...draft,
        currentNodeId: option.nextNodeId,
        visitedNodeIds: appendVisitedNode(draft, option.nextNodeId),
        events: appendEvent(draft, {
            kind: 'branch',
            nodeId: choiceNode.id,
            optionId: option.id,
            weaknessId: option.weaknessId,
        }).events,
    };
}
function advanceFromExplain(draft, action) {
    const flow = getDiagnosisFlow(draft.methodId);
    const node = getNode(flow, draft.currentNodeId);
    if (node.kind !== 'explain') {
        throw new Error(`advanceFromExplain expected explain node, got ${node.kind}`);
    }
    const explainNode = node;
    const nextNodeId = action === 'continue' ? explainNode.primaryNextNodeId : explainNode.secondaryNextNodeId;
    return {
        ...draft,
        currentNodeId: nextNodeId,
        visitedNodeIds: appendVisitedNode(draft, nextNodeId),
        usedDontKnow: draft.usedDontKnow || action === 'dont_know',
        events: appendEvent(draft, action === 'continue'
            ? { kind: 'explain_continue', nodeId: explainNode.id }
            : { kind: 'dont_know', nodeId: explainNode.id }).events,
    };
}
function advanceFromCheck(draft, optionId) {
    const flow = getDiagnosisFlow(draft.methodId);
    const node = getNode(flow, draft.currentNodeId);
    if (node.kind !== 'check') {
        throw new Error(`advanceFromCheck expected check node, got ${node.kind}`);
    }
    const checkNode = node;
    if (!optionId) {
        const nextNodeId = checkNode.dontKnowNextNodeId;
        return {
            ...draft,
            currentNodeId: nextNodeId,
            visitedNodeIds: appendVisitedNode(draft, nextNodeId),
            usedDontKnow: true,
            events: appendEvent(draft, { kind: 'dont_know', nodeId: checkNode.id }).events,
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
        events: appendEvent(draft, {
            kind: 'check',
            nodeId: checkNode.id,
            optionId: option.id,
            isCorrect: option.isCorrect,
            weaknessId: option.weaknessId,
        }).events,
    };
}
function appendAiHelpRequested(draft, nodeId, nodeKind) {
    return appendEvent(draft, { kind: 'ai_help_requested', nodeId, nodeKind }, { usedAiHelp: true });
}
function appendAiHelpContinue(draft, nodeId, nodeKind) {
    return appendEvent(draft, { kind: 'ai_help_continue', nodeId, nodeKind }, { usedAiHelp: true });
}
function appendAiHelpFallback(draft, nodeId, nodeKind) {
    return appendEvent(draft, { kind: 'ai_help_fallback', nodeId, nodeKind }, { usedAiHelp: true });
}
function buildDiagnosisDetailTrace(draft, finalWeaknessId) {
    return {
        methodId: draft.methodId,
        flowId: draft.flowId,
        visitedNodeIds: draft.visitedNodeIds,
        events: draft.events,
        usedDontKnow: draft.usedDontKnow,
        usedAiHelp: draft.usedAiHelp,
        finalWeaknessId,
    };
}

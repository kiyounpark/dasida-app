"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.problemById = void 0;
exports.getMethodLabel = getMethodLabel;
exports.getMethodSelectionText = getMethodSelectionText;
exports.getDiagnosisStepLabel = getDiagnosisStepLabel;
exports.findNextIncompleteDiagnosisPageIndex = findNextIncompleteDiagnosisPageIndex;
exports.freezeConversationEntries = freezeConversationEntries;
exports.buildMethodOptions = buildMethodOptions;
exports.buildSuggestedMethods = buildSuggestedMethods;
exports.createInitialDiagnosisWorkspace = createInitialDiagnosisWorkspace;
exports.createCompletedDiagnosisWorkspace = createCompletedDiagnosisWorkspace;
exports.getActiveFlowNode = getActiveFlowNode;
exports.buildDiagnosisAnalysisText = buildDiagnosisAnalysisText;
exports.buildDiagnosisMethodDescriptors = buildDiagnosisMethodDescriptors;
const problemData_1 = require("../../../data/problemData");
const diagnosis_method_routing_1 = require("../../../data/diagnosis-method-routing");
const diagnosisTree_1 = require("../../../data/diagnosisTree");
const diagnosis_flow_engine_1 = require("../../../features/quiz/diagnosis-flow-engine");
exports.problemById = new Map(problemData_1.problemData.map((problem) => [problem.id, problem]));
const diagnosisStepLabels = [
    '첫 번째 문제',
    '두 번째 문제',
    '세 번째 문제',
    '네 번째 문제',
    '다섯 번째 문제',
    '여섯 번째 문제',
    '일곱 번째 문제',
    '여덟 번째 문제',
    '아홉 번째 문제',
    '열 번째 문제',
];
function getMethodLabel(methodId, availableMethods) {
    return (availableMethods.find((method) => method.id === methodId)?.labelKo ??
        diagnosisTree_1.methodOptions.find((method) => method.id === methodId)?.labelKo ??
        methodId);
}
function getMethodSelectionText(methodId, methodLabel) {
    if (methodId === 'unknown') {
        return '잘 모르겠어요.';
    }
    return `${methodLabel}으로 풀었어요.`;
}
function getDiagnosisStepLabel(index) {
    return diagnosisStepLabels[index] ?? `${index + 1}번째 문제`;
}
function findNextIncompleteDiagnosisPageIndex(pages, currentIndex) {
    for (let pageIndex = currentIndex + 1; pageIndex < pages.length; pageIndex += 1) {
        if (pages[pageIndex]?.workspace.status !== 'completed') {
            return pageIndex;
        }
    }
    for (let pageIndex = 0; pageIndex < currentIndex; pageIndex += 1) {
        if (pages[pageIndex]?.workspace.status !== 'completed') {
            return pageIndex;
        }
    }
    return null;
}
function freezeConversationEntries(entries) {
    return entries.map((entry) => entry.kind === 'method-selector' ||
        entry.kind === 'node' ||
        entry.kind === 'ai-help' ||
        entry.kind === 'ai-help-actions'
        ? { ...entry, interactive: false }
        : entry);
}
function buildMethodOptions(problem) {
    return diagnosisTree_1.methodOptions
        .filter((option) => problem.diagnosisMethods.includes(option.id))
        .map((option) => {
        const info = diagnosis_method_routing_1.diagnosisMethodRoutingCatalog[option.id];
        return {
            id: option.id,
            labelKo: option.labelKo,
            summary: info?.summary ?? option.labelKo,
            exampleUtterances: info?.exampleUtterances ?? [],
        };
    });
}
function buildSuggestedMethods(routerResult, methods) {
    if (!routerResult?.needsManualSelection) {
        return [];
    }
    const suggestedIds = routerResult.candidateMethodIds
        .filter((methodId) => methodId !== 'unknown')
        .slice(0, 2);
    return suggestedIds
        .map((methodId) => methods.find((method) => method.id === methodId))
        .filter((method) => Boolean(method));
}
function createInitialDiagnosisWorkspace(answerIndex, problem) {
    return {
        aiHelpState: null,
        aiHelpUsed: false,
        analysisErrorMessage: '',
        answerIndex,
        chatEntries: [
            {
                id: `${answerIndex}-problem`,
                kind: 'problem',
                question: problem.question,
                topic: problem.topic,
            },
            {
                id: `${answerIndex}-prompt`,
                kind: 'bubble',
                role: 'assistant',
                text: '이 문제는 어떻게 풀었나요?',
            },
            {
                id: `${answerIndex}-method-selector`,
                kind: 'method-selector',
                interactive: true,
            },
        ],
        diagnosisInput: '',
        flowDraft: null,
        isAnalyzing: false,
        methodId: null,
        problemId: problem.id,
        routerResult: null,
        status: 'pending',
    };
}
function createCompletedDiagnosisWorkspace(answerIndex, problem) {
    return {
        aiHelpState: null,
        aiHelpUsed: false,
        analysisErrorMessage: '',
        answerIndex,
        chatEntries: [
            {
                id: `${answerIndex}-problem`,
                kind: 'problem',
                question: problem.question,
                topic: problem.topic,
            },
            {
                id: `${answerIndex}-done`,
                kind: 'bubble',
                role: 'assistant',
                text: '이 문제는 분석을 마쳤어요.',
                tone: 'positive',
            },
        ],
        diagnosisInput: '',
        flowDraft: null,
        isAnalyzing: false,
        methodId: null,
        problemId: problem.id,
        routerResult: null,
        status: 'completed',
    };
}
function getActiveFlowNode(workspace) {
    if (!workspace.flowDraft) {
        return null;
    }
    return (0, diagnosis_flow_engine_1.getNode)((0, diagnosis_flow_engine_1.getDiagnosisFlow)(workspace.flowDraft.methodId), workspace.flowDraft.currentNodeId);
}
function buildDiagnosisAnalysisText(workspace) {
    return workspace.diagnosisInput.trim();
}
function buildDiagnosisMethodDescriptors(methods) {
    return methods.map((method) => ({
        exampleUtterances: method.exampleUtterances ?? [],
        id: method.id,
        labelKo: method.labelKo,
        summary: method.summary ?? method.labelKo,
    }));
}

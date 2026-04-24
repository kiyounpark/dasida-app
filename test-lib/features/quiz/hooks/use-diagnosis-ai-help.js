"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDiagnosisAiHelp = useDiagnosisAiHelp;
const Haptics = __importStar(require("expo-haptics"));
const diagnosis_flow_engine_1 = require("../../../features/quiz/diagnosis-flow-engine");
const diagnosis_explainer_1 = require("../../../features/quiz/diagnosis-explainer");
const diagnostic_screen_helpers_1 = require("../../../features/quiz/hooks/diagnostic-screen-helpers");
function useDiagnosisAiHelp({ appendNextNode, createAiHelpActionsEntry, createAiHelpEntry, createBubbleEntry, createNodeEntry, isMountedRef, removeAiHelpComposerEntries, requestDiagnosisAutoScroll, setDiagnosisInteracted, updateWorkspace, }) {
    const openAiHelpComposer = (page, nodeKind) => {
        const { answerIndex, workspace } = page;
        const activeNode = (0, diagnostic_screen_helpers_1.getActiveFlowNode)(workspace);
        if (!workspace.flowDraft || !activeNode || activeNode.kind !== nodeKind) {
            return;
        }
        setDiagnosisInteracted(answerIndex);
        requestDiagnosisAutoScroll(answerIndex);
        if (process.env.EXPO_OS === 'ios') {
            Haptics.selectionAsync();
        }
        if (workspace.aiHelpUsed) {
            const fallbackDraft = nodeKind === 'explain'
                ? (0, diagnosis_flow_engine_1.advanceFromExplain)(workspace.flowDraft, 'dont_know')
                : (0, diagnosis_flow_engine_1.advanceFromCheck)(workspace.flowDraft);
            const nextNode = (0, diagnosis_flow_engine_1.getNode)((0, diagnosis_flow_engine_1.getDiagnosisFlow)(fallbackDraft.methodId), fallbackDraft.currentNodeId);
            appendNextNode(answerIndex, page.methods, fallbackDraft, '모르겠습니다', {
                text: nextNode.kind === 'final'
                    ? '괜찮아요. 지금은 기초부터 다시 다지는 편이 좋아 보여요.'
                    : '괜찮아요. 더 쉬운 설명으로 이어갈게요.',
                tone: 'neutral',
            });
            return;
        }
        updateWorkspace(answerIndex, (current) => ({
            ...current,
            aiHelpState: {
                error: '',
                input: '',
                isLoading: false,
                nodeId: activeNode.id,
                nodeKind,
            },
            aiHelpUsed: true,
            chatEntries: [
                ...current.chatEntries.map((entry) => entry.kind === 'method-selector' ||
                    entry.kind === 'node' ||
                    entry.kind === 'ai-help' ||
                    entry.kind === 'ai-help-actions'
                    ? { ...entry, interactive: false }
                    : entry),
                createBubbleEntry(answerIndex, 'user', '모르겠습니다'),
                createAiHelpEntry(answerIndex, activeNode.id, nodeKind, true),
            ],
            flowDraft: (0, diagnosis_flow_engine_1.appendAiHelpRequested)(current.flowDraft, activeNode.id, nodeKind),
        }));
    };
    const handleAiHelpInputChange = (answerIndex, text) => {
        setDiagnosisInteracted(answerIndex);
        updateWorkspace(answerIndex, (workspace) => {
            if (!workspace.aiHelpState) {
                return workspace;
            }
            return {
                ...workspace,
                aiHelpState: {
                    ...workspace.aiHelpState,
                    error: '',
                    input: text,
                },
            };
        });
    };
    const handleSubmitAiHelp = async (page) => {
        const { answerIndex, methods, problem, workspace } = page;
        const activeNode = (0, diagnostic_screen_helpers_1.getActiveFlowNode)(workspace);
        const aiHelpState = workspace.aiHelpState;
        if (workspace.status === 'completed' ||
            !workspace.flowDraft ||
            !workspace.methodId ||
            !aiHelpState ||
            aiHelpState.isLoading ||
            !aiHelpState.input.trim() ||
            !activeNode ||
            activeNode.kind !== aiHelpState.nodeKind) {
            return;
        }
        setDiagnosisInteracted(answerIndex);
        updateWorkspace(answerIndex, (current) => ({
            ...current,
            aiHelpState: current.aiHelpState
                ? {
                    ...current.aiHelpState,
                    error: '',
                    isLoading: true,
                }
                : current.aiHelpState,
        }));
        try {
            const methodLabelKo = (0, diagnostic_screen_helpers_1.getMethodLabel)(workspace.methodId, methods);
            const result = await (0, diagnosis_explainer_1.requestDiagnosisExplanation)({
                methodId: workspace.methodId,
                methodLabelKo,
                nodeBody: 'body' in activeNode ? activeNode.body : undefined,
                nodeId: activeNode.id,
                nodeKind: aiHelpState.nodeKind,
                nodeOptions: activeNode.kind === 'check'
                    ? activeNode.options.map((option) => option.text)
                    : undefined,
                nodePrompt: activeNode.kind === 'check' ? activeNode.prompt : undefined,
                nodeTitle: activeNode.title,
                problemId: problem.id,
                problemQuestion: problem.question,
                userQuestion: aiHelpState.input.trim(),
            });
            if (!isMountedRef.current) {
                return;
            }
            requestDiagnosisAutoScroll(answerIndex);
            updateWorkspace(answerIndex, (current) => {
                const currentHelpState = current.aiHelpState;
                if (!currentHelpState) {
                    return current;
                }
                return {
                    ...current,
                    aiHelpState: null,
                    chatEntries: [
                        ...current.chatEntries
                            .map((entry) => entry.kind === 'method-selector' ||
                            entry.kind === 'node' ||
                            entry.kind === 'ai-help' ||
                            entry.kind === 'ai-help-actions'
                            ? { ...entry, interactive: false }
                            : entry)
                            .filter((entry) => entry.kind !== 'ai-help'),
                        createBubbleEntry(answerIndex, 'user', currentHelpState.input.trim()),
                        createBubbleEntry(answerIndex, 'assistant', result.replyText, 'info'),
                        createAiHelpActionsEntry(answerIndex, currentHelpState.nodeId, currentHelpState.nodeKind, true),
                    ],
                };
            });
        }
        catch (error) {
            if (!isMountedRef.current) {
                return;
            }
            requestDiagnosisAutoScroll(answerIndex);
            const errorMessage = error instanceof Error && error.name === 'AbortError'
                ? '응답이 조금 늦고 있어요. 다시 시도하거나 더 쉬운 설명으로 이어갈 수 있어요.'
                : error instanceof Error &&
                    error.message === 'Diagnosis explain endpoint is not configured'
                    ? '지금은 AI 보충 설명을 사용할 수 없어요. 더 쉬운 설명으로 이어갈게요.'
                    : '지금은 AI 보충 설명을 불러오지 못했어요. 다시 시도하거나 더 쉬운 설명으로 이어갈 수 있어요.';
            updateWorkspace(answerIndex, (current) => ({
                ...current,
                aiHelpState: current.aiHelpState
                    ? {
                        ...current.aiHelpState,
                        error: errorMessage,
                        isLoading: false,
                    }
                    : current.aiHelpState,
            }));
        }
    };
    const reopenCheckNode = (page) => {
        const { answerIndex, methods, workspace } = page;
        const activeNode = (0, diagnostic_screen_helpers_1.getActiveFlowNode)(workspace);
        if (!workspace.flowDraft || !workspace.methodId || !activeNode || activeNode.kind !== 'check') {
            return;
        }
        setDiagnosisInteracted(answerIndex);
        requestDiagnosisAutoScroll(answerIndex);
        if (process.env.EXPO_OS === 'ios') {
            Haptics.selectionAsync();
        }
        updateWorkspace(answerIndex, (current) => ({
            ...current,
            aiHelpState: null,
            chatEntries: [
                ...current.chatEntries
                    .map((entry) => entry.kind === 'method-selector' ||
                    entry.kind === 'node' ||
                    entry.kind === 'ai-help' ||
                    entry.kind === 'ai-help-actions'
                    ? { ...entry, interactive: false }
                    : entry)
                    .filter((entry) => entry.kind !== 'ai-help'),
                createBubbleEntry(answerIndex, 'user', '문제를 다시 볼게요'),
                createBubbleEntry(answerIndex, 'assistant', '좋아요. 같은 확인 문제를 다시 볼게요.', 'positive'),
                createNodeEntry(answerIndex, workspace.methodId, methods, activeNode, true),
            ],
            flowDraft: (0, diagnosis_flow_engine_1.appendAiHelpContinue)(current.flowDraft, activeNode.id, 'check'),
        }));
    };
    const handleAiHelpContinue = (page) => {
        const activeNode = (0, diagnostic_screen_helpers_1.getActiveFlowNode)(page.workspace);
        if (!activeNode || (activeNode.kind !== 'explain' && activeNode.kind !== 'check')) {
            return;
        }
        if (activeNode.kind === 'check') {
            reopenCheckNode(page);
            return;
        }
        const { answerIndex, methods, workspace } = page;
        setDiagnosisInteracted(answerIndex);
        if (process.env.EXPO_OS === 'ios') {
            Haptics.selectionAsync();
        }
        const nextDraft = (0, diagnosis_flow_engine_1.advanceFromExplain)((0, diagnosis_flow_engine_1.appendAiHelpContinue)(workspace.flowDraft, activeNode.id, 'explain'), 'continue');
        appendNextNode(answerIndex, methods, nextDraft, '확인 문제로 넘어갈게요');
    };
    const handleAiHelpFallback = (page) => {
        const { answerIndex, methods, workspace } = page;
        const activeNode = (0, diagnostic_screen_helpers_1.getActiveFlowNode)(workspace);
        if (!workspace.flowDraft || !activeNode || (activeNode.kind !== 'explain' && activeNode.kind !== 'check')) {
            return;
        }
        setDiagnosisInteracted(answerIndex);
        if (process.env.EXPO_OS === 'ios') {
            Haptics.selectionAsync();
        }
        if (activeNode.kind === 'explain') {
            const nextDraft = (0, diagnosis_flow_engine_1.advanceFromExplain)((0, diagnosis_flow_engine_1.appendAiHelpFallback)(workspace.flowDraft, activeNode.id, 'explain'), 'dont_know');
            const nextNode = (0, diagnosis_flow_engine_1.getNode)((0, diagnosis_flow_engine_1.getDiagnosisFlow)(nextDraft.methodId), nextDraft.currentNodeId);
            appendNextNode(answerIndex, methods, nextDraft, '더 쉬운 설명으로 볼게요', {
                text: nextNode.kind === 'final'
                    ? '괜찮아요. 지금은 기초부터 정리하는 쪽이 더 좋아 보여요.'
                    : '괜찮아요. 더 쉬운 설명으로 다시 이어갈게요.',
                tone: 'neutral',
            });
            return;
        }
        const nextDraft = (0, diagnosis_flow_engine_1.advanceFromCheck)((0, diagnosis_flow_engine_1.appendAiHelpFallback)(workspace.flowDraft, activeNode.id, 'check'));
        const nextNode = (0, diagnosis_flow_engine_1.getNode)((0, diagnosis_flow_engine_1.getDiagnosisFlow)(nextDraft.methodId), nextDraft.currentNodeId);
        appendNextNode(answerIndex, methods, nextDraft, '더 쉬운 설명으로 볼게요', {
            text: nextNode.kind === 'final'
                ? '괜찮아요. 지금은 기초부터 다시 다지는 편이 좋아 보여요.'
                : '괜찮아요. 더 쉬운 설명으로 다시 볼게요.',
            tone: 'neutral',
        });
    };
    return {
        handleAiHelpContinue,
        handleAiHelpFallback,
        handleAiHelpInputChange,
        handleSubmitAiHelp,
        openAiHelpComposer,
    };
}

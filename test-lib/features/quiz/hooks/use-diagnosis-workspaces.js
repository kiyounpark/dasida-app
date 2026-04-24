"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDiagnosisWorkspaces = useDiagnosisWorkspaces;
const react_1 = require("react");
const diagnosis_flow_engine_1 = require("../../../features/quiz/diagnosis-flow-engine");
const diagnosis_router_1 = require("../../../features/quiz/diagnosis-router");
const diagnostic_screen_helpers_1 = require("../../../features/quiz/hooks/diagnostic-screen-helpers");
function useDiagnosisWorkspaces({ isMountedRef, problems, state, }) {
    const [selectedIndex, setSelectedIndex] = (0, react_1.useState)(null);
    const [diagnosisWorkspaces, setDiagnosisWorkspaces] = (0, react_1.useState)({});
    const diagnosisEntrySequence = (0, react_1.useRef)({});
    const isAnalyzingRef = (0, react_1.useRef)({});
    const currentProblem = (0, react_1.useMemo)(() => problems[state.currentQuestionIndex], [problems, state.currentQuestionIndex]);
    (0, react_1.useEffect)(() => {
        setSelectedIndex(state.answers[state.currentQuestionIndex]?.selectedIndex ?? null);
    }, [state.answers, state.currentQuestionIndex]);
    (0, react_1.useEffect)(() => {
        if (!state.isDiagnosing) {
            setDiagnosisWorkspaces({});
            diagnosisEntrySequence.current = {};
            isAnalyzingRef.current = {};
            return;
        }
        setDiagnosisWorkspaces((prev) => {
            const next = {};
            state.diagnosisQueue.forEach((answerIndex) => {
                const answer = state.answers[answerIndex];
                const problem = answer ? diagnostic_screen_helpers_1.problemById.get(answer.problemId) : undefined;
                if (!answer || !problem) {
                    return;
                }
                if (!diagnosisEntrySequence.current[answerIndex]) {
                    diagnosisEntrySequence.current[answerIndex] = 3;
                }
                next[answerIndex] =
                    prev[answerIndex] ??
                        (answer.weaknessId
                            ? (0, diagnostic_screen_helpers_1.createCompletedDiagnosisWorkspace)(answerIndex, problem)
                            : (0, diagnostic_screen_helpers_1.createInitialDiagnosisWorkspace)(answerIndex, problem));
            });
            return next;
        });
    }, [state.answers, state.diagnosisQueue, state.isDiagnosing]);
    const diagnosisPages = (0, react_1.useMemo)(() => {
        if (!state.isDiagnosing) {
            return [];
        }
        return state.diagnosisQueue
            .map((answerIndex) => {
            const answer = state.answers[answerIndex];
            const problem = answer ? diagnostic_screen_helpers_1.problemById.get(answer.problemId) : undefined;
            if (!answer || !problem) {
                return null;
            }
            const workspace = diagnosisWorkspaces[answerIndex] ?? (0, diagnostic_screen_helpers_1.createInitialDiagnosisWorkspace)(answerIndex, problem);
            const methods = (0, diagnostic_screen_helpers_1.buildMethodOptions)(problem);
            return {
                answerIndex,
                methods,
                problem,
                suggestedMethods: (0, diagnostic_screen_helpers_1.buildSuggestedMethods)(workspace.routerResult, methods),
                workspace,
            };
        })
            .filter((page) => Boolean(page));
    }, [diagnosisWorkspaces, state.answers, state.diagnosisQueue, state.isDiagnosing]);
    const createChatEntryId = (answerIndex, prefix) => {
        diagnosisEntrySequence.current[answerIndex] =
            (diagnosisEntrySequence.current[answerIndex] ?? 3) + 1;
        return `${answerIndex}-${prefix}-${diagnosisEntrySequence.current[answerIndex]}`;
    };
    const createBubbleEntry = (answerIndex, role, text, tone = 'neutral') => ({
        id: createChatEntryId(answerIndex, role),
        kind: 'bubble',
        role,
        text,
        tone,
    });
    const createNodeEntry = (answerIndex, methodId, methodOptionsForProblem, node, interactive) => ({
        id: createChatEntryId(answerIndex, node.id),
        interactive,
        kind: 'node',
        methodLabel: (0, diagnostic_screen_helpers_1.getMethodLabel)(methodId, methodOptionsForProblem),
        node,
    });
    const createAiHelpEntry = (answerIndex, nodeId, nodeKind, interactive) => ({
        id: createChatEntryId(answerIndex, `ai-help-${nodeKind}`),
        interactive,
        kind: 'ai-help',
        nodeId,
        nodeKind,
    });
    const createAiHelpActionsEntry = (answerIndex, nodeId, nodeKind, interactive) => ({
        id: createChatEntryId(answerIndex, `ai-help-actions-${nodeKind}`),
        interactive,
        kind: 'ai-help-actions',
        nodeId,
        nodeKind,
    });
    const removeAiHelpComposerEntries = (entries) => entries.filter((entry) => entry.kind !== 'ai-help');
    const updateWorkspace = (answerIndex, updater) => {
        setDiagnosisWorkspaces((prev) => {
            const current = prev[answerIndex];
            if (!current) {
                return prev;
            }
            const nextWorkspace = updater(current);
            if (nextWorkspace === current) {
                return prev;
            }
            return {
                ...prev,
                [answerIndex]: nextWorkspace,
            };
        });
    };
    const handleDiagnosisInputChange = (answerIndex, text) => {
        updateWorkspace(answerIndex, (workspace) => ({
            ...workspace,
            analysisErrorMessage: '',
            diagnosisInput: text,
            routerResult: null,
        }));
    };
    const startDiagnosisFlow = (answerIndex, methodId, methodOptionsForProblem) => {
        const draft = (0, diagnosis_flow_engine_1.createDiagnosisFlowDraft)(methodId);
        const startNode = (0, diagnosis_flow_engine_1.getNode)((0, diagnosis_flow_engine_1.getDiagnosisFlow)(methodId), draft.currentNodeId);
        const methodLabel = (0, diagnostic_screen_helpers_1.getMethodLabel)(methodId, methodOptionsForProblem);
        updateWorkspace(answerIndex, (workspace) => ({
            ...workspace,
            aiHelpState: null,
            aiHelpUsed: false,
            analysisErrorMessage: '',
            chatEntries: [
                ...(0, diagnostic_screen_helpers_1.freezeConversationEntries)(workspace.chatEntries),
                createBubbleEntry(answerIndex, 'user', (0, diagnostic_screen_helpers_1.getMethodSelectionText)(methodId, methodLabel)),
                createNodeEntry(answerIndex, methodId, methodOptionsForProblem, startNode, true),
            ],
            flowDraft: draft,
            methodId,
            status: 'in_progress',
        }));
    };
    const appendNextNode = (answerIndex, methodOptionsForProblem, draft, userText, feedback) => {
        const nextNode = (0, diagnosis_flow_engine_1.getNode)((0, diagnosis_flow_engine_1.getDiagnosisFlow)(draft.methodId), draft.currentNodeId);
        updateWorkspace(answerIndex, (workspace) => ({
            ...workspace,
            chatEntries: [
                ...(0, diagnostic_screen_helpers_1.freezeConversationEntries)(removeAiHelpComposerEntries(workspace.chatEntries)),
                createBubbleEntry(answerIndex, 'user', userText),
                ...(feedback
                    ? [createBubbleEntry(answerIndex, 'assistant', feedback.text, feedback.tone)]
                    : []),
                createNodeEntry(answerIndex, draft.methodId, methodOptionsForProblem, nextNode, true),
            ],
            flowDraft: draft,
            status: 'in_progress',
        }));
    };
    const runDiagnosisAnalysis = async (page, rawText) => {
        const { answerIndex, methods, problem } = page;
        if (!rawText.trim() || isAnalyzingRef.current[answerIndex]) {
            return;
        }
        isAnalyzingRef.current[answerIndex] = true;
        updateWorkspace(answerIndex, (current) => ({
            ...current,
            analysisErrorMessage: '',
            isAnalyzing: true,
        }));
        try {
            const result = await (0, diagnosis_router_1.analyzeDiagnosisMethod)({
                allowedMethodIds: methods.map((method) => method.id),
                allowedMethods: (0, diagnostic_screen_helpers_1.buildDiagnosisMethodDescriptors)(methods),
                problemId: problem.id,
                rawText,
            });
            if (!isMountedRef.current) {
                return;
            }
            updateWorkspace(answerIndex, (current) => ({
                ...current,
                analysisErrorMessage: '',
                isAnalyzing: false,
                routerResult: result,
            }));
        }
        catch (error) {
            console.error('diagnosis method analysis failed', error);
            if (!isMountedRef.current) {
                return;
            }
            updateWorkspace(answerIndex, (current) => ({
                ...current,
                analysisErrorMessage: '지금은 추천을 불러오지 못했어요. 위 선택지에서 고르거나 잠시 후 다시 시도해주세요.',
                isAnalyzing: false,
                routerResult: current.routerResult,
            }));
        }
        finally {
            isAnalyzingRef.current[answerIndex] = false;
        }
    };
    const handleAnalyze = async (page) => {
        const { workspace } = page;
        if (!workspace.diagnosisInput.trim() || workspace.status === 'completed') {
            return;
        }
        await runDiagnosisAnalysis(page, workspace.diagnosisInput.trim());
    };
    return {
        appendNextNode,
        createAiHelpActionsEntry,
        createAiHelpEntry,
        createBubbleEntry,
        createNodeEntry,
        currentProblem,
        diagnosisPages,
        diagnosisWorkspaces,
        handleAnalyze,
        handleDiagnosisInputChange,
        removeAiHelpComposerEntries,
        selectedIndex,
        setSelectedIndex,
        startDiagnosisFlow,
        updateWorkspace,
    };
}

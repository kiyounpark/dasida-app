"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useExamDiagnosis = useExamDiagnosis;
// features/quiz/exam/hooks/use-exam-diagnosis.ts
const react_1 = require("react");
const diagnosis_method_routing_1 = require("../../../../data/diagnosis-method-routing");
const diagnosisTree_1 = require("../../../../data/diagnosisTree");
const exam_problems_1 = require("../../../../features/quiz/data/exam-problems");
const diagnosis_flow_engine_1 = require("../../../../features/quiz/diagnosis-flow-engine");
const diagnosis_router_1 = require("../../../../features/quiz/diagnosis-router");
const provider_1 = require("@/features/learner/provider");
const diagnosis_analytics_1 = require("../../../../features/analytics/diagnosis-analytics");
const build_exam_diagnosis_attempt_input_1 = require("../build-exam-diagnosis-attempt-input");
const exam_diagnosis_progress_1 = require("../exam-diagnosis-progress");
function useExamDiagnosis(params) {
    const { examId, problemNumber, userAnswer, onComplete } = params;
    const { session, profile, recordAttempt } = (0, provider_1.useCurrentLearner)();
    const problem = (0, react_1.useMemo)(() => (0, exam_problems_1.getExamProblems)(examId).find((p) => p.number === problemNumber), [examId, problemNumber]);
    const imageKey = `${examId}/${problemNumber}`;
    const methods = (0, react_1.useMemo)(() => (problem?.diagnosisMethods ?? []).flatMap((id) => {
        const option = diagnosisTree_1.methodOptions.find((o) => o.id === id);
        if (!option)
            return [];
        const info = diagnosis_method_routing_1.diagnosisMethodRoutingCatalog[option.id];
        const item = {
            id: option.id,
            labelKo: option.labelKo,
            summary: info?.summary ?? option.labelKo,
            exampleUtterances: info?.exampleUtterances ?? [],
        };
        return [item];
    }), [problem]);
    const isMountedRef = (0, react_1.useRef)(true);
    (0, react_1.useEffect)(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);
    const [diagnosisInput, setDiagnosisInput] = (0, react_1.useState)('');
    const [routerResult, setRouterResult] = (0, react_1.useState)(null);
    const [isAnalyzing, setIsAnalyzing] = (0, react_1.useState)(false);
    const [analysisErrorMessage, setAnalysisErrorMessage] = (0, react_1.useState)('');
    const [draft, setDraft] = (0, react_1.useState)(null);
    const [entries, setEntries] = (0, react_1.useState)(() => {
        const problemEntry = {
            kind: 'problem-card',
            id: 'problem-card',
            imageKey,
            userAnswer,
            correctAnswer: problem?.answer ?? 0,
            problemType: problem?.type ?? 'multiple_choice',
        };
        return [
            problemEntry,
            { kind: 'bubble', id: 'intro', role: 'assistant', text: '어떤 방법으로 풀었나요?' },
            { kind: 'method-selector', id: 'method-selector', interactive: true },
        ];
    });
    const [isDone, setIsDone] = (0, react_1.useState)(false);
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    const startedAt = (0, react_1.useRef)(new Date().toISOString());
    const hasAdvancedRef = (0, react_1.useRef)(false);
    const suggestedMethods = (0, react_1.useMemo)(() => {
        if (!routerResult?.needsManualSelection)
            return [];
        return routerResult.candidateMethodIds
            .filter((id) => id !== 'unknown')
            .slice(0, 2)
            .map((id) => methods.find((m) => m.id === id))
            .filter((m) => Boolean(m));
    }, [routerResult, methods]);
    const freezeAndAppend = (0, react_1.useCallback)((newEntries) => {
        setEntries((prev) => [
            ...prev.map((e) => ('interactive' in e ? { ...e, interactive: false } : e)),
            ...newEntries,
        ]);
    }, []);
    const onInputChange = (0, react_1.useCallback)((text) => {
        setDiagnosisInput(text);
    }, []);
    const onAnalyze = (0, react_1.useCallback)(async () => {
        const rawText = diagnosisInput.trim();
        if (!rawText || isAnalyzing)
            return;
        setIsAnalyzing(true);
        setAnalysisErrorMessage('');
        setRouterResult(null);
        try {
            const result = await (0, diagnosis_router_1.analyzeDiagnosisMethod)({
                allowedMethodIds: methods.map((m) => m.id),
                allowedMethods: methods.map((m) => ({
                    id: m.id,
                    labelKo: m.labelKo,
                    summary: m.summary ?? m.labelKo,
                    exampleUtterances: m.exampleUtterances ?? [],
                })),
                problemId: `${examId}-${problemNumber}`,
                rawText,
            });
            if (!isMountedRef.current)
                return;
            setRouterResult(result);
        }
        catch {
            if (!isMountedRef.current)
                return;
            setAnalysisErrorMessage('분석 중 오류가 발생했어요. 다시 시도해주세요.');
        }
        finally {
            if (isMountedRef.current)
                setIsAnalyzing(false);
        }
    }, [diagnosisInput, isAnalyzing, methods, examId, problemNumber]);
    const selectMethod = (0, react_1.useCallback)((methodId) => {
        const method = methods.find((m) => m.id === methodId);
        if (!method)
            return;
        const newDraft = (0, diagnosis_flow_engine_1.createDiagnosisFlowDraft)(methodId);
        setDraft(newDraft);
        const flow = (0, diagnosis_flow_engine_1.getDiagnosisFlow)(methodId);
        freezeAndAppend([
            { kind: 'bubble', id: `user-method-${Date.now()}`, role: 'user', text: method.labelKo },
            { kind: 'flow-node', id: `node-${newDraft.currentNodeId}`, flow, draft: newDraft, interactive: true },
        ]);
    }, [methods, freezeAndAppend]);
    const onManualSelect = (0, react_1.useCallback)((methodId) => selectMethod(methodId), [selectMethod]);
    const onConfirmPredicted = (0, react_1.useCallback)(() => {
        if (!routerResult?.predictedMethodId)
            return;
        selectMethod(routerResult.predictedMethodId);
    }, [routerResult, selectMethod]);
    const advanceDraft = (0, react_1.useCallback)((nextDraft, userText) => {
        const flow = (0, diagnosis_flow_engine_1.getDiagnosisFlow)(nextDraft.methodId);
        setDraft(nextDraft);
        setEntries((prev) => {
            const frozen = prev.map((e) => ('interactive' in e ? { ...e, interactive: false } : e));
            if (userText) {
                frozen.push({ kind: 'bubble', id: `user-${nextDraft.currentNodeId}`, role: 'user', text: userText });
            }
            frozen.push({
                kind: 'flow-node',
                id: `node-${nextDraft.currentNodeId}-${Date.now()}`,
                flow,
                draft: nextDraft,
                interactive: true,
            });
            return frozen;
        });
    }, []);
    const onChoicePress = (0, react_1.useCallback)((optionId) => {
        if (!draft)
            return;
        const flow = (0, diagnosis_flow_engine_1.getDiagnosisFlow)(draft.methodId);
        const node = (0, diagnosis_flow_engine_1.getNode)(flow, draft.currentNodeId);
        if (node.kind !== 'choice')
            return;
        const option = node.options.find((o) => o.id === optionId);
        if (!option)
            return;
        advanceDraft((0, diagnosis_flow_engine_1.advanceFromChoice)(draft, optionId), option.text);
    }, [draft, advanceDraft]);
    const onExplainContinue = (0, react_1.useCallback)(() => {
        if (!draft)
            return;
        advanceDraft((0, diagnosis_flow_engine_1.advanceFromExplain)(draft, 'continue'), '확인할게요');
    }, [draft, advanceDraft]);
    const onExplainDontKnow = (0, react_1.useCallback)(() => {
        if (!draft)
            return;
        advanceDraft((0, diagnosis_flow_engine_1.advanceFromExplain)(draft, 'dont_know'), '모르겠습니다');
    }, [draft, advanceDraft]);
    const onCheckPress = (0, react_1.useCallback)((optionId) => {
        if (!draft)
            return;
        const flow = (0, diagnosis_flow_engine_1.getDiagnosisFlow)(draft.methodId);
        const node = (0, diagnosis_flow_engine_1.getNode)(flow, draft.currentNodeId);
        if (node.kind !== 'check')
            return;
        const option = node.options.find((o) => o.id === optionId);
        if (!option)
            return;
        advanceDraft((0, diagnosis_flow_engine_1.advanceFromCheck)(draft, optionId), option.text);
    }, [draft, advanceDraft]);
    const onCheckDontKnow = (0, react_1.useCallback)(() => {
        if (!draft)
            return;
        advanceDraft((0, diagnosis_flow_engine_1.advanceFromCheck)(draft, undefined), '모르겠습니다');
    }, [draft, advanceDraft]);
    // 최종 노드 자동 저장 — draft가 final을 가리키는 순간 즉시 저장, 1.5초 후 다음 문제 카드 등장
    (0, react_1.useEffect)(() => {
        if (!draft || !session || !profile || isDone)
            return;
        const flow = (0, diagnosis_flow_engine_1.getDiagnosisFlow)(draft.methodId);
        const node = (0, diagnosis_flow_engine_1.getNode)(flow, draft.currentNodeId);
        if (node.kind !== 'final')
            return;
        const weaknessId = node.weaknessId;
        const completedAt = new Date().toISOString();
        setIsDone(true);
        (0, diagnosis_analytics_1.logDiagnosisCompleted)({
            accountKey: profile.accountKey,
            source: 'exam',
            weaknessId,
            examId,
            problemNumber,
        });
        setIsSaving(true);
        Promise.all([
            (0, exam_diagnosis_progress_1.markProblemDiagnosed)(examId, problemNumber, weaknessId),
            recordAttempt((0, build_exam_diagnosis_attempt_input_1.buildExamDiagnosisAttemptInput)({
                session,
                profile,
                examId,
                problemNumber,
                topic: problem?.topic ?? 'exam',
                methodId: draft.methodId,
                weaknessId,
                startedAt: startedAt.current,
                completedAt,
            })),
        ])
            .then(() => {
            if (!isMountedRef.current)
                return;
            setTimeout(() => {
                if (!isMountedRef.current || hasAdvancedRef.current)
                    return;
                hasAdvancedRef.current = true;
                onComplete();
            }, 1500);
        })
            .catch(() => {
            if (isMountedRef.current)
                setIsDone(false);
        })
            .finally(() => {
            if (isMountedRef.current)
                setIsSaving(false);
        });
    }, [draft, isDone, session, profile, examId, problemNumber, problem, recordAttempt, onComplete]);
    return {
        problemNumber,
        topic: problem?.topic ?? '문제',
        score: problem?.score ?? 0,
        entries,
        methods,
        diagnosisInput,
        routerResult,
        suggestedMethods,
        analysisErrorMessage,
        isAnalyzing,
        isDone,
        isSaving,
        onInputChange,
        onAnalyze,
        onManualSelect,
        onConfirmPredicted,
        onChoicePress,
        onExplainContinue,
        onExplainDontKnow,
        onCheckPress,
        onCheckDontKnow,
    };
}

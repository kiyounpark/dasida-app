// features/quiz/exam/hooks/use-exam-diagnosis.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { WeaknessId } from '@/data/diagnosisMap';
import { diagnosisMethodRoutingCatalog } from '@/data/diagnosis-method-routing';
import type { SolveMethodId } from '@/data/diagnosisTree';
import { methodOptions } from '@/data/diagnosisTree';
import type { DetailedDiagnosisFlow } from '@/data/detailedDiagnosisFlows';
import type { DiagnosisMethodCardOption } from '@/features/quiz/components/diagnosis-method-selector-card';
import { getExamProblems } from '@/features/quiz/data/exam-problems';
import {
  advanceFromCheck,
  advanceFromChoice,
  advanceFromExplain,
  createDiagnosisFlowDraft,
  getDiagnosisFlow,
  getNode,
  type DiagnosisFlowDraft,
} from '@/features/quiz/diagnosis-flow-engine';
import {
  analyzeDiagnosisMethod,
  type DiagnosisRouterResult,
} from '@/features/quiz/diagnosis-router';
import { useCurrentLearner } from '@/features/learner/provider';

import { buildExamDiagnosisAttemptInput } from '../build-exam-diagnosis-attempt-input';
import { markProblemDiagnosed } from '../exam-diagnosis-progress';

export type ExamDiagEntry =
  | { kind: 'bubble'; id: string; role: 'assistant' | 'user'; text: string }
  | { kind: 'problem-card'; id: string; imageKey: string; userAnswer: number; correctAnswer: number; problemType: 'multiple_choice' | 'short_answer' }
  | { kind: 'method-selector'; id: string; interactive: boolean }
  | { kind: 'flow-node'; id: string; flow: DetailedDiagnosisFlow; draft: DiagnosisFlowDraft; interactive: boolean }
  | { kind: 'next-problem'; id: string };

export type UseExamDiagnosisResult = {
  problemNumber: number;
  topic: string;
  score: number;
  entries: ExamDiagEntry[];
  methods: DiagnosisMethodCardOption[];
  diagnosisInput: string;
  routerResult: DiagnosisRouterResult | null;
  suggestedMethods: DiagnosisMethodCardOption[];
  analysisErrorMessage: string;
  isAnalyzing: boolean;
  isDone: boolean;
  isSaving: boolean;
  onInputChange: (text: string) => void;
  onAnalyze: () => void;
  onManualSelect: (id: SolveMethodId) => void;
  onConfirmPredicted: () => void;
  onChoicePress: (optionId: string) => void;
  onExplainContinue: () => void;
  onExplainDontKnow: () => void;
  onCheckPress: (optionId: string) => void;
  onCheckDontKnow: () => void;
  onFinalConfirm: () => void;
};

export function useExamDiagnosis(params: {
  examId: string;
  problemNumber: number;
  userAnswer: number;
  onComplete: () => void;
}): UseExamDiagnosisResult {
  const { examId, problemNumber, userAnswer, onComplete } = params;
  const { session, profile, recordAttempt } = useCurrentLearner();

  const problem = useMemo(
    () => getExamProblems(examId).find((p) => p.number === problemNumber),
    [examId, problemNumber],
  );

  const imageKey = `${examId}/${problemNumber}`;

  const methods: DiagnosisMethodCardOption[] = useMemo(
    () =>
      (problem?.diagnosisMethods ?? []).flatMap((id) => {
        const option = methodOptions.find((o) => o.id === id);
        if (!option) return [];
        const info = diagnosisMethodRoutingCatalog[option.id as SolveMethodId];
        const item: DiagnosisMethodCardOption = {
          id: option.id as SolveMethodId,
          labelKo: option.labelKo,
          summary: info?.summary ?? option.labelKo,
          exampleUtterances: info?.exampleUtterances ?? [],
        };
        return [item];
      }),
    [problem],
  );

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [diagnosisInput, setDiagnosisInput] = useState('');
  const [routerResult, setRouterResult] = useState<DiagnosisRouterResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisErrorMessage, setAnalysisErrorMessage] = useState('');

  const [draft, setDraft] = useState<DiagnosisFlowDraft | null>(null);
  const [entries, setEntries] = useState<ExamDiagEntry[]>(() => {
    const problemEntry: ExamDiagEntry = {
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
  const [isDone, setIsDone] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const startedAt = useRef(new Date().toISOString());

  const suggestedMethods: DiagnosisMethodCardOption[] = useMemo(() => {
    if (!routerResult?.needsManualSelection) return [];
    return routerResult.candidateMethodIds
      .filter((id) => id !== 'unknown')
      .slice(0, 2)
      .map((id) => methods.find((m) => m.id === id))
      .filter((m): m is DiagnosisMethodCardOption => Boolean(m));
  }, [routerResult, methods]);

  const freezeAndAppend = useCallback((newEntries: ExamDiagEntry[]) => {
    setEntries((prev) => [
      ...prev.map((e) => ('interactive' in e ? { ...e, interactive: false } : e)),
      ...newEntries,
    ]);
  }, []);

  const onInputChange = useCallback((text: string) => {
    setDiagnosisInput(text);
  }, []);

  const onAnalyze = useCallback(async () => {
    const rawText = diagnosisInput.trim();
    if (!rawText || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisErrorMessage('');
    setRouterResult(null);

    try {
      const result = await analyzeDiagnosisMethod({
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
      if (!isMountedRef.current) return;
      setRouterResult(result);
    } catch {
      if (!isMountedRef.current) return;
      setAnalysisErrorMessage('분석 중 오류가 발생했어요. 다시 시도해주세요.');
    } finally {
      if (isMountedRef.current) setIsAnalyzing(false);
    }
  }, [diagnosisInput, isAnalyzing, methods, examId, problemNumber]);

  const selectMethod = useCallback(
    (methodId: SolveMethodId) => {
      const method = methods.find((m) => m.id === methodId);
      if (!method) return;

      const newDraft = createDiagnosisFlowDraft(methodId);
      setDraft(newDraft);
      const flow = getDiagnosisFlow(methodId);

      freezeAndAppend([
        { kind: 'bubble', id: `user-method-${Date.now()}`, role: 'user', text: method.labelKo },
        { kind: 'flow-node', id: `node-${newDraft.currentNodeId}`, flow, draft: newDraft, interactive: true },
      ]);
    },
    [methods, freezeAndAppend],
  );

  const onManualSelect = useCallback(
    (methodId: SolveMethodId) => selectMethod(methodId),
    [selectMethod],
  );

  const onConfirmPredicted = useCallback(() => {
    if (!routerResult?.predictedMethodId) return;
    selectMethod(routerResult.predictedMethodId);
  }, [routerResult, selectMethod]);

  const advanceDraft = useCallback(
    (nextDraft: DiagnosisFlowDraft, userText: string) => {
      const flow = getDiagnosisFlow(nextDraft.methodId);
      const node = getNode(flow, nextDraft.currentNodeId);

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
    },
    [],
  );

  const onChoicePress = useCallback(
    (optionId: string) => {
      if (!draft) return;
      const flow = getDiagnosisFlow(draft.methodId);
      const node = getNode(flow, draft.currentNodeId);
      if (node.kind !== 'choice') return;
      const option = node.options.find((o) => o.id === optionId);
      if (!option) return;
      advanceDraft(advanceFromChoice(draft, optionId), option.text);
    },
    [draft, advanceDraft],
  );

  const onExplainContinue = useCallback(() => {
    if (!draft) return;
    advanceDraft(advanceFromExplain(draft, 'continue'), '확인할게요');
  }, [draft, advanceDraft]);

  const onExplainDontKnow = useCallback(() => {
    if (!draft) return;
    advanceDraft(advanceFromExplain(draft, 'dont_know'), '모르겠습니다');
  }, [draft, advanceDraft]);

  const onCheckPress = useCallback(
    (optionId: string) => {
      if (!draft) return;
      const flow = getDiagnosisFlow(draft.methodId);
      const node = getNode(flow, draft.currentNodeId);
      if (node.kind !== 'check') return;
      const option = node.options.find((o) => o.id === optionId);
      if (!option) return;
      advanceDraft(advanceFromCheck(draft, optionId), option.text);
    },
    [draft, advanceDraft],
  );

  const onCheckDontKnow = useCallback(() => {
    if (!draft) return;
    advanceDraft(advanceFromCheck(draft, undefined), '모르겠습니다');
  }, [draft, advanceDraft]);

  const onFinalConfirm = useCallback(async () => {
    if (!draft || !session || !profile) return;
    const flow = getDiagnosisFlow(draft.methodId);
    const node = getNode(flow, draft.currentNodeId);
    if (node.kind !== 'final') return;

    const weaknessId: WeaknessId = node.weaknessId;
    const completedAt = new Date().toISOString();

    setIsDone(true);
    setIsSaving(true);

    try {
      await Promise.all([
        markProblemDiagnosed(examId, problemNumber, weaknessId),
        recordAttempt(
          buildExamDiagnosisAttemptInput({
            session,
            profile,
            examId,
            problemNumber,
            topic: problem?.topic ?? 'exam',
            methodId: draft.methodId,
            weaknessId,
            startedAt: startedAt.current,
            completedAt,
          }),
        ),
      ]);
      if (!isMountedRef.current) return;
      // next-problem 카드 추가 후 세션에 완료 알림
      setEntries((prev) => [
        ...prev.map((e) => ('interactive' in e ? { ...e, interactive: false } : e)),
        { kind: 'next-problem', id: 'next-problem' },
      ]);
      onComplete();
    } catch {
      if (isMountedRef.current) {
        setIsDone(false);
      }
    } finally {
      if (isMountedRef.current) setIsSaving(false);
    }
  }, [draft, session, profile, examId, problemNumber, problem, recordAttempt, onComplete]);

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
    onFinalConfirm,
  };
}

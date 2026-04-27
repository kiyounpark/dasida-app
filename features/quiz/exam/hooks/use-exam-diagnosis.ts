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
import { logDiagnosisCompleted } from '@/features/analytics/diagnosis-analytics';

import { buildExamDiagnosisAttemptInput } from '../build-exam-diagnosis-attempt-input';
import { markProblemDiagnosed } from '../exam-diagnosis-progress';
import { useExamSession } from '../exam-session';
import type { MilestoneFraction } from '@/features/quiz/exam/diagnosis-milestone';
import { markMilestoneShown } from '@/features/quiz/exam/diagnosis-milestone-progress';
import { resolveMilestoneToShow } from '../exam-milestone-resolver';
import { buildMiniCardText } from '@/features/quiz/exam/diagnosis-mini-card-text';

export type ExamDiagEntry =
  | { kind: 'bubble'; id: string; role: 'assistant' | 'user'; text: string }
  | { kind: 'problem-card'; id: string; imageKey: string; userAnswer: number; correctAnswer: number; problemType: 'multiple_choice' | 'short_answer' }
  | { kind: 'method-selector'; id: string; interactive: boolean }
  | { kind: 'flow-node'; id: string; flow: DetailedDiagnosisFlow; draft: DiagnosisFlowDraft; interactive: boolean }
  | {
      kind: 'mini-card';
      id: string;
      patternName: string;
      patternDescription: string;
      noteCount: number;
      totalNotes: number;
      problemNumber: number;
      isLastProblem: boolean;
    }
  | {
      kind: 'milestone-banner';
      id: string;
      fraction: MilestoneFraction;
      noteCount: number;
      totalNotes: number;
    };

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
  saveError: boolean;
  onInputChange: (text: string) => void;
  onAnalyze: () => void;
  onManualSelect: (id: SolveMethodId) => void;
  onConfirmPredicted: () => void;
  onChoicePress: (optionId: string) => void;
  onExplainContinue: () => void;
  onExplainDontKnow: () => void;
  onCheckPress: (optionId: string) => void;
  onCheckDontKnow: () => void;
  onPause: () => void;
  onAdvance: () => void;
};

function extractLastMeaningfulNodeText(draft: DiagnosisFlowDraft): string | null {
  const flow = getDiagnosisFlow(draft.methodId);
  const reversedIds = [...draft.visitedNodeIds].reverse();
  for (const nodeId of reversedIds) {
    const node = flow.nodes[nodeId];
    if (!node) continue;
    if (node.kind === 'explain') return node.body;
    if (node.kind === 'check') return node.prompt ?? node.title;
  }
  return null;
}

export function useExamDiagnosis(params: {
  examId: string;
  problemNumber: number;
  userAnswer: number;
  totalNotes: number;
  currentNoteCountBeforeThis: number;
  isLastProblem: boolean;
  onPauseRequested: () => void;
  onComplete: () => void;
}): UseExamDiagnosisResult {
  const { examId, problemNumber, userAnswer, totalNotes, currentNoteCountBeforeThis, isLastProblem, onPauseRequested, onComplete } = params;
  const { session, profile, recordAttempt } = useCurrentLearner();
  const { state } = useExamSession();
  const attemptId = state.result?.attemptId ?? null;
  const attemptDateISO = state.result?.completedAt ?? null;

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
  const [saveError, setSaveError] = useState(false);
  const startedAt = useRef(new Date().toISOString());
  const completedAtRef = useRef<string | null>(null);
  const hasAdvancedRef = useRef(false);
  const retryCountRef = useRef(0);
  const diagnosedRef = useRef(false);     // markProblemDiagnosed 성공 여부 (멱등, 재시도 안전)
  const attemptRecordedRef = useRef(false); // recordAttempt 성공 여부 (비멱등, 재시도 skip)

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

  useEffect(() => {
    if (!draft || !session || !profile || isDone) return;
    const flow = getDiagnosisFlow(draft.methodId);
    const node = getNode(flow, draft.currentNodeId);
    if (node.kind !== 'final') return;

    const weaknessId: WeaknessId = node.weaknessId;

    if (!attemptId || !attemptDateISO) return;

    if (!completedAtRef.current) {
      completedAtRef.current = new Date().toISOString();
    }
    const completedAt = completedAtRef.current;

    setIsDone(true);
    // 첫 시도에만 analytics 발화 (재시도 시 중복 방지)
    if (!diagnosedRef.current && !attemptRecordedRef.current) {
      logDiagnosisCompleted({
        accountKey: profile.accountKey,
        source: 'exam',
        weaknessId,
        examId,
        problemNumber,
      });
    }
    setIsSaving(true);

    const noteCountAfterThis = currentNoteCountBeforeThis + 1;
    const methodLabel = methods.find((m) => m.id === draft.methodId)?.labelKo ?? null;
    const lastNodeText = extractLastMeaningfulNodeText(draft);

    // 순차 실행 + skip-if-done: recordAttempt는 비멱등 POST이므로 성공 후 재시도 금지.
    // markProblemDiagnosed(AsyncStorage)는 멱등이지만 동일하게 skip 처리.
    void (async () => {
      try {
        if (!diagnosedRef.current) {
          await markProblemDiagnosed(
            { examId, attemptId, attemptDateISO },
            problemNumber,
            weaknessId,
          );
          diagnosedRef.current = true;
        }

        if (!attemptRecordedRef.current) {
          await recordAttempt(
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
          );
          attemptRecordedRef.current = true;
        }

        if (!isMountedRef.current) return;
        setIsSaving(false);

        const milestoneToShow = await resolveMilestoneToShow({
          scope: { examId, attemptId, attemptDateISO },
          totalNotes,
          noteCountAfterThis,
        });

        if (!isMountedRef.current) return;

        if (milestoneToShow !== null) {
          freezeAndAppend([{
            kind: 'milestone-banner',
            id: `milestone-${milestoneToShow}-${problemNumber}`,
            fraction: milestoneToShow,
            noteCount: noteCountAfterThis,
            totalNotes,
          }]);
          // append 성공 후 mark — 앱 비정상 종료 시 "봤다" 오기록 방지
          await markMilestoneShown({ examId, attemptId, attemptDateISO }, milestoneToShow);
        } else {
          const { patternName, patternDescription } = buildMiniCardText({
            methodLabel,
            lastNodeText,
          });
          freezeAndAppend([{
            kind: 'mini-card',
            id: `mini-card-${problemNumber}`,
            patternName,
            patternDescription,
            noteCount: noteCountAfterThis,
            totalNotes,
            problemNumber,
            isLastProblem,
          }]);
        }
      } catch {
        if (!isMountedRef.current) return;
        setIsSaving(false);
        retryCountRef.current += 1;
        if (retryCountRef.current >= 3) {
          // saveError=true 이후에는 isDone이 true로 유지되고 retryCountRef=3이므로
          // useEffect가 재트리거되지 않는다. UI에서 onPause만이 유일한 탈출 경로.
          setSaveError(true);
          freezeAndAppend([{
            kind: 'bubble',
            id: `save-error-${problemNumber}`,
            role: 'assistant',
            text: '저장에 실패했어요. 잠시 후 다시 시도해 주세요.',
          }]);
          return;
        }
        // isDone 리셋 → useEffect 재트리거 → 자동 재시도 (최대 3회)
        setIsDone(false);
      }
    })();
  }, [draft, isDone, session, profile, examId, problemNumber, problem, recordAttempt, attemptId, attemptDateISO, currentNoteCountBeforeThis, totalNotes, isLastProblem, methods, freezeAndAppend]);

  const onAdvance = useCallback(() => {
    if (hasAdvancedRef.current) return;
    hasAdvancedRef.current = true;
    onComplete();
  }, [onComplete]);

  const onPause = useCallback(() => {
    if (hasAdvancedRef.current) return;
    hasAdvancedRef.current = true;
    onPauseRequested();
  }, [onPauseRequested]);

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
    saveError,
    onInputChange,
    onAnalyze,
    onManualSelect,
    onConfirmPredicted,
    onChoicePress,
    onExplainContinue,
    onExplainDontKnow,
    onCheckPress,
    onCheckDontKnow,
    onPause,
    onAdvance,
  };
}

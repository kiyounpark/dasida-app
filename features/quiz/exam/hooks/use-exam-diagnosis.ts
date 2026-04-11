import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';

import type { WeaknessId } from '@/data/diagnosisMap';
import type { SolveMethodId } from '@/data/diagnosisTree';
import { methodOptions } from '@/data/diagnosisTree';
import type { DetailedDiagnosisFlow } from '@/data/detailedDiagnosisFlows';
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
import { useCurrentLearner } from '@/features/learner/provider';

import { buildExamDiagnosisAttemptInput } from '../build-exam-diagnosis-attempt-input';
import { markProblemDiagnosed } from '../exam-diagnosis-progress';

export type ExamDiagEntry =
  | { kind: 'bubble'; id: string; role: 'assistant' | 'user'; text: string }
  | { kind: 'method-choices'; id: string; interactive: boolean }
  | { kind: 'flow-node'; id: string; flow: DetailedDiagnosisFlow; draft: DiagnosisFlowDraft; interactive: boolean };

export type MethodChoice = {
  id: SolveMethodId;
  label: string;
};

export type UseExamDiagnosisResult = {
  problemNumber: number;
  topic: string;
  score: number;
  progressLabel: string;
  progressPercent: number;
  entries: ExamDiagEntry[];
  methodChoices: MethodChoice[];
  selectedMethodId: SolveMethodId | null;
  isDone: boolean;
  isSaving: boolean;
  onSelectMethod: (methodId: SolveMethodId) => void;
  onChoicePress: (optionId: string) => void;
  onExplainContinue: () => void;
  onExplainDontKnow: () => void;
  onCheckPress: (optionId: string) => void;
  onCheckDontKnow: () => void;
  onFinalConfirm: () => void;
  onBack: () => void;
};

export function useExamDiagnosis(params: {
  examId: string;
  problemNumber: number;
  wrongCount: number;
  diagnosedCount: number;
}): UseExamDiagnosisResult {
  const { examId, problemNumber, wrongCount, diagnosedCount } = params;
  const { session, profile, recordAttempt } = useCurrentLearner();

  const problem = useMemo(
    () => getExamProblems(examId).find((p) => p.number === problemNumber),
    [examId, problemNumber],
  );

  const methodChoices: MethodChoice[] = useMemo(
    () =>
      (problem?.diagnosisMethods ?? [])
        .map((id) => methodOptions.find((o) => o.id === id))
        .filter((o): o is NonNullable<typeof o> => !!o)
        .map((o) => ({ id: o.id, label: o.labelKo })),
    [problem],
  );

  const [selectedMethodId, setSelectedMethodId] = useState<SolveMethodId | null>(null);
  const [draft, setDraft] = useState<DiagnosisFlowDraft | null>(null);
  const [entries, setEntries] = useState<ExamDiagEntry[]>(() => [
    {
      kind: 'bubble',
      id: 'intro',
      role: 'assistant',
      text: '어떤 방법으로 풀려고 했나요?',
    },
    { kind: 'method-choices', id: 'methods', interactive: true },
  ]);
  const [isDone, setIsDone] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const startedAt = useRef(new Date().toISOString());

  const advanceDraft = useCallback(
    (nextDraft: DiagnosisFlowDraft, userText: string) => {
      const flow = getDiagnosisFlow(nextDraft.methodId);
      const node = getNode(flow, nextDraft.currentNodeId);

      setDraft(nextDraft);

      setEntries((prev) => {
        const frozen = prev.map((e) =>
          'interactive' in e ? { ...e, interactive: false } : e,
        );
        if (userText) {
          frozen.push({
            kind: 'bubble',
            id: `user-${nextDraft.currentNodeId}`,
            role: 'user',
            text: userText,
          });
        }
        if (node.kind !== 'final') {
          frozen.push({
            kind: 'flow-node',
            id: `node-${nextDraft.currentNodeId}-${Date.now()}`,
            flow,
            draft: nextDraft,
            interactive: true,
          });
        } else {
          frozen.push({
            kind: 'flow-node',
            id: `final-${Date.now()}`,
            flow,
            draft: nextDraft,
            interactive: true,
          });
        }
        return frozen;
      });
    },
    [],
  );

  const onSelectMethod = useCallback(
    (methodId: SolveMethodId) => {
      const method = methodOptions.find((o) => o.id === methodId);
      if (!method) return;

      setSelectedMethodId(methodId);

      setEntries((prev) => {
        const frozen = prev.map((e) =>
          'interactive' in e ? { ...e, interactive: false } : e,
        );
        return [
          ...frozen,
          {
            kind: 'bubble' as const,
            id: `user-method`,
            role: 'user' as const,
            text: method.labelKo,
          },
        ];
      });

      const newDraft = createDiagnosisFlowDraft(methodId);
      setDraft(newDraft);
      const flow = getDiagnosisFlow(methodId);

      setEntries((prev) => [
        ...prev,
        {
          kind: 'flow-node',
          id: `node-${newDraft.currentNodeId}`,
          flow,
          draft: newDraft,
          interactive: true,
        },
      ]);
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
      const nextDraft = advanceFromChoice(draft, optionId);
      advanceDraft(nextDraft, option.text);
    },
    [draft, advanceDraft],
  );

  const onExplainContinue = useCallback(() => {
    if (!draft) return;
    const nextDraft = advanceFromExplain(draft, 'continue');
    advanceDraft(nextDraft, '확인할게요');
  }, [draft, advanceDraft]);

  const onExplainDontKnow = useCallback(() => {
    if (!draft) return;
    const nextDraft = advanceFromExplain(draft, 'dont_know');
    advanceDraft(nextDraft, '모르겠습니다');
  }, [draft, advanceDraft]);

  const onCheckPress = useCallback(
    (optionId: string) => {
      if (!draft) return;
      const flow = getDiagnosisFlow(draft.methodId);
      const node = getNode(flow, draft.currentNodeId);
      if (node.kind !== 'check') return;
      const option = node.options.find((o) => o.id === optionId);
      if (!option) return;
      const nextDraft = advanceFromCheck(draft, optionId);
      advanceDraft(nextDraft, option.text);
    },
    [draft, advanceDraft],
  );

  const onCheckDontKnow = useCallback(() => {
    if (!draft) return;
    const nextDraft = advanceFromCheck(draft, undefined);
    advanceDraft(nextDraft, '모르겠습니다');
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
    } finally {
      setIsSaving(false);
      router.back();
    }
  }, [draft, session, profile, examId, problemNumber, problem, recordAttempt]);

  const progressPercent =
    wrongCount > 0 ? ((diagnosedCount / wrongCount) * 100) : 0;

  return {
    problemNumber,
    topic: problem?.topic ?? '문제',
    score: problem?.score ?? 0,
    progressLabel: `${diagnosedCount + 1} / ${wrongCount}`,
    progressPercent,
    entries,
    methodChoices,
    selectedMethodId,
    isDone,
    isSaving,
    onSelectMethod,
    onChoicePress,
    onExplainContinue,
    onExplainDontKnow,
    onCheckPress,
    onCheckDontKnow,
    onFinalConfirm,
    onBack: () => router.back(),
  };
}

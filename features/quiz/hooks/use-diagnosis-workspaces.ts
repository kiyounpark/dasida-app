import { useEffect, useMemo, useRef, useState } from 'react';

import type { DiagnosisFlowNode } from '@/data/detailedDiagnosisFlows';
import { problemData, type Problem } from '@/data/problemData';
import type {
  DiagnosisConversationEntry,
} from '@/features/quiz/components/diagnosis-conversation-page';
import type { DiagnosisMethodCardOption } from '@/features/quiz/components/diagnosis-method-selector-card';
import {
  createDiagnosisFlowDraft,
  getDiagnosisFlow,
  getNode,
  type DiagnosisFlowDraft,
} from '@/features/quiz/diagnosis-flow-engine';
import { analyzeDiagnosisMethod } from '@/features/quiz/diagnosis-router';
import type { useQuizSession } from '@/features/quiz/session';

import {
  buildDiagnosisMethodDescriptors,
  buildMethodOptions,
  buildSuggestedMethods,
  createInitialDiagnosisWorkspace,
  freezeConversationEntries,
  getMethodLabel,
  getMethodSelectionText,
  problemById,
  type DiagnosisAiHelpNodeKind,
  type DiagnosisPage,
  type DiagnosisWorkspace,
} from '@/features/quiz/hooks/diagnostic-screen-helpers';
import type { SolveMethodId } from '@/data/diagnosisTree';

type QuizSessionState = ReturnType<typeof useQuizSession>['state'];

type UseDiagnosisWorkspacesParams = {
  isMountedRef: React.MutableRefObject<boolean>;
  state: QuizSessionState;
};

export function useDiagnosisWorkspaces({
  isMountedRef,
  state,
}: UseDiagnosisWorkspacesParams) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [diagnosisWorkspaces, setDiagnosisWorkspaces] = useState<Record<number, DiagnosisWorkspace>>(
    {},
  );
  const diagnosisEntrySequence = useRef<Record<number, number>>({});
  const isAnalyzingRef = useRef<Record<number, boolean>>({});

  const currentProblem = useMemo(
    () => problemData[state.currentQuestionIndex],
    [state.currentQuestionIndex],
  );

  useEffect(() => {
    setSelectedIndex(state.answers[state.currentQuestionIndex]?.selectedIndex ?? null);
  }, [state.answers, state.currentQuestionIndex]);

  useEffect(() => {
    if (!state.isDiagnosing) {
      setDiagnosisWorkspaces({});
      diagnosisEntrySequence.current = {};
      isAnalyzingRef.current = {};
      return;
    }

    setDiagnosisWorkspaces((prev) => {
      const next: Record<number, DiagnosisWorkspace> = {};

      state.diagnosisQueue.forEach((answerIndex) => {
        const answer = state.answers[answerIndex];
        const problem = answer ? problemById.get(answer.problemId) : undefined;

        if (!answer || !problem) {
          return;
        }

        if (!diagnosisEntrySequence.current[answerIndex]) {
          diagnosisEntrySequence.current[answerIndex] = 3;
        }

        next[answerIndex] = prev[answerIndex] ?? createInitialDiagnosisWorkspace(answerIndex, problem);
      });

      return next;
    });
  }, [state.answers, state.diagnosisQueue, state.isDiagnosing]);

  const diagnosisPages = useMemo<DiagnosisPage[]>(() => {
    if (!state.isDiagnosing) {
      return [];
    }

    return state.diagnosisQueue
      .map((answerIndex) => {
        const answer = state.answers[answerIndex];
        const problem = answer ? problemById.get(answer.problemId) : undefined;
        if (!answer || !problem) {
          return null;
        }

        const workspace =
          diagnosisWorkspaces[answerIndex] ?? createInitialDiagnosisWorkspace(answerIndex, problem);
        const methods = buildMethodOptions(problem);

        return {
          answerIndex,
          methods,
          problem,
          suggestedMethods: buildSuggestedMethods(workspace.routerResult, methods),
          workspace,
        };
      })
      .filter((page): page is DiagnosisPage => Boolean(page));
  }, [diagnosisWorkspaces, state.answers, state.diagnosisQueue, state.isDiagnosing]);

  const createChatEntryId = (answerIndex: number, prefix: string) => {
    diagnosisEntrySequence.current[answerIndex] =
      (diagnosisEntrySequence.current[answerIndex] ?? 3) + 1;
    return `${answerIndex}-${prefix}-${diagnosisEntrySequence.current[answerIndex]}`;
  };

  const createBubbleEntry = (
    answerIndex: number,
    role: 'assistant' | 'user',
    text: string,
    tone: 'neutral' | 'positive' | 'warning' | 'info' = 'neutral',
  ): DiagnosisConversationEntry => ({
    id: createChatEntryId(answerIndex, role),
    kind: 'bubble',
    role,
    text,
    tone,
  });

  const createNodeEntry = (
    answerIndex: number,
    methodId: SolveMethodId,
    methodOptionsForProblem: DiagnosisMethodCardOption[],
    node: DiagnosisFlowNode,
    interactive: boolean,
  ): DiagnosisConversationEntry => ({
    id: createChatEntryId(answerIndex, node.id),
    interactive,
    kind: 'node',
    methodLabel: getMethodLabel(methodId, methodOptionsForProblem),
    node,
  });

  const createAiHelpEntry = (
    answerIndex: number,
    nodeId: string,
    nodeKind: DiagnosisAiHelpNodeKind,
    interactive: boolean,
  ): DiagnosisConversationEntry => ({
    id: createChatEntryId(answerIndex, `ai-help-${nodeKind}`),
    interactive,
    kind: 'ai-help',
    nodeId,
    nodeKind,
  });

  const createAiHelpActionsEntry = (
    answerIndex: number,
    nodeId: string,
    nodeKind: DiagnosisAiHelpNodeKind,
    interactive: boolean,
  ): DiagnosisConversationEntry => ({
    id: createChatEntryId(answerIndex, `ai-help-actions-${nodeKind}`),
    interactive,
    kind: 'ai-help-actions',
    nodeId,
    nodeKind,
  });

  const removeAiHelpComposerEntries = (entries: DiagnosisConversationEntry[]) =>
    entries.filter((entry) => entry.kind !== 'ai-help');

  const updateWorkspace = (
    answerIndex: number,
    updater: (workspace: DiagnosisWorkspace) => DiagnosisWorkspace,
  ) => {
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

  const handleDiagnosisInputChange = (answerIndex: number, text: string) => {
    updateWorkspace(answerIndex, (workspace) => ({
      ...workspace,
      analysisErrorMessage: '',
      diagnosisInput: text,
      routerResult: null,
    }));
  };

  const startDiagnosisFlow = (
    answerIndex: number,
    methodId: SolveMethodId,
    methodOptionsForProblem: DiagnosisMethodCardOption[],
  ) => {
    const draft = createDiagnosisFlowDraft(methodId);
    const startNode = getNode(getDiagnosisFlow(methodId), draft.currentNodeId);
    const methodLabel = getMethodLabel(methodId, methodOptionsForProblem);

    updateWorkspace(answerIndex, (workspace) => ({
      ...workspace,
      aiHelpState: null,
      aiHelpUsed: false,
      analysisErrorMessage: '',
      chatEntries: [
        ...freezeConversationEntries(workspace.chatEntries),
        createBubbleEntry(answerIndex, 'user', getMethodSelectionText(methodId, methodLabel)),
        createNodeEntry(answerIndex, methodId, methodOptionsForProblem, startNode, true),
      ],
      flowDraft: draft,
      methodId,
      status: 'in_progress',
    }));
  };

  const appendNextNode = (
    answerIndex: number,
    methodOptionsForProblem: DiagnosisMethodCardOption[],
    draft: DiagnosisFlowDraft,
    userText: string,
    feedback?: {
      text: string;
      tone?: 'neutral' | 'positive' | 'warning';
    },
  ) => {
    const nextNode = getNode(getDiagnosisFlow(draft.methodId), draft.currentNodeId);

    updateWorkspace(answerIndex, (workspace) => ({
      ...workspace,
      chatEntries: [
        ...freezeConversationEntries(removeAiHelpComposerEntries(workspace.chatEntries)),
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

  const runDiagnosisAnalysis = async (page: DiagnosisPage, rawText: string) => {
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
      const result = await analyzeDiagnosisMethod({
        allowedMethodIds: methods.map((method) => method.id),
        allowedMethods: buildDiagnosisMethodDescriptors(methods),
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
    } catch (error) {
      console.error('diagnosis method analysis failed', error);
      if (!isMountedRef.current) {
        return;
      }

      updateWorkspace(answerIndex, (current) => ({
        ...current,
        analysisErrorMessage:
          '지금은 추천을 불러오지 못했어요. 위 선택지에서 고르거나 잠시 후 다시 시도해주세요.',
        isAnalyzing: false,
        routerResult: current.routerResult,
      }));
    } finally {
      isAnalyzingRef.current[answerIndex] = false;
    }
  };

  const handleAnalyze = async (page: DiagnosisPage) => {
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
    setDiagnosisWorkspaces,
    setSelectedIndex,
    startDiagnosisFlow,
    updateWorkspace,
  };
}

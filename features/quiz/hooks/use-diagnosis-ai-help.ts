import * as Haptics from 'expo-haptics';

import {
  advanceFromCheck,
  advanceFromExplain,
  appendAiHelpContinue,
  appendAiHelpFallback,
  appendAiHelpRequested,
  getDiagnosisFlow,
  getNode,
} from '@/features/quiz/diagnosis-flow-engine';
import { requestDiagnosisExplanation } from '@/features/quiz/diagnosis-explainer';
import {
  getActiveFlowNode,
  getMethodLabel,
  type DiagnosisAiHelpNodeKind,
  type DiagnosisPage,
} from '@/features/quiz/hooks/diagnostic-screen-helpers';

type UseDiagnosisAiHelpParams = {
  appendNextNode: (
    answerIndex: number,
    methods: DiagnosisPage['methods'],
    draft: NonNullable<DiagnosisPage['workspace']['flowDraft']>,
    userText: string,
    feedback?: {
      text: string;
      tone?: 'neutral' | 'positive' | 'warning';
    },
  ) => void;
  createAiHelpActionsEntry: (
    answerIndex: number,
    nodeId: string,
    nodeKind: DiagnosisAiHelpNodeKind,
    interactive: boolean,
  ) => DiagnosisPage['workspace']['chatEntries'][number];
  createAiHelpEntry: (
    answerIndex: number,
    nodeId: string,
    nodeKind: DiagnosisAiHelpNodeKind,
    interactive: boolean,
  ) => DiagnosisPage['workspace']['chatEntries'][number];
  createBubbleEntry: (
    answerIndex: number,
    role: 'assistant' | 'user',
    text: string,
    tone?: 'neutral' | 'positive' | 'warning' | 'info',
  ) => DiagnosisPage['workspace']['chatEntries'][number];
  createNodeEntry: (
    answerIndex: number,
    methodId: DiagnosisPage['methods'][number]['id'],
    methodOptionsForProblem: DiagnosisPage['methods'],
    node: ReturnType<typeof getNode>,
    interactive: boolean,
  ) => DiagnosisPage['workspace']['chatEntries'][number];
  isMountedRef: React.MutableRefObject<boolean>;
  removeAiHelpComposerEntries: (
    entries: DiagnosisPage['workspace']['chatEntries'],
  ) => DiagnosisPage['workspace']['chatEntries'];
  requestDiagnosisAutoScroll: (answerIndex: number) => void;
  setDiagnosisInteracted: (answerIndex: number) => void;
  updateWorkspace: (
    answerIndex: number,
    updater: (workspace: DiagnosisPage['workspace']) => DiagnosisPage['workspace'],
  ) => void;
};

export function useDiagnosisAiHelp({
  appendNextNode,
  createAiHelpActionsEntry,
  createAiHelpEntry,
  createBubbleEntry,
  createNodeEntry,
  isMountedRef,
  removeAiHelpComposerEntries,
  requestDiagnosisAutoScroll,
  setDiagnosisInteracted,
  updateWorkspace,
}: UseDiagnosisAiHelpParams) {
  const openAiHelpComposer = (page: DiagnosisPage, nodeKind: DiagnosisAiHelpNodeKind) => {
    const { answerIndex, workspace } = page;
    const activeNode = getActiveFlowNode(workspace);

    if (!workspace.flowDraft || !activeNode || activeNode.kind !== nodeKind) {
      return;
    }

    setDiagnosisInteracted(answerIndex);
    requestDiagnosisAutoScroll(answerIndex);
    if (process.env.EXPO_OS === 'ios') {
      Haptics.selectionAsync();
    }

    if (workspace.aiHelpUsed) {
      const fallbackDraft =
        nodeKind === 'explain'
          ? advanceFromExplain(workspace.flowDraft, 'dont_know')
          : advanceFromCheck(workspace.flowDraft);
      const nextNode = getNode(getDiagnosisFlow(fallbackDraft.methodId), fallbackDraft.currentNodeId);

      appendNextNode(answerIndex, page.methods, fallbackDraft, '모르겠습니다', {
        text:
          nextNode.kind === 'final'
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
        ...current.chatEntries.map((entry) =>
          entry.kind === 'method-selector' ||
          entry.kind === 'node' ||
          entry.kind === 'ai-help' ||
          entry.kind === 'ai-help-actions'
            ? { ...entry, interactive: false }
            : entry,
        ),
        createBubbleEntry(answerIndex, 'user', '모르겠습니다'),
        createAiHelpEntry(answerIndex, activeNode.id, nodeKind, true),
      ],
      flowDraft: appendAiHelpRequested(current.flowDraft!, activeNode.id, nodeKind),
    }));
  };

  const handleAiHelpInputChange = (answerIndex: number, text: string) => {
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

  const handleSubmitAiHelp = async (page: DiagnosisPage) => {
    const { answerIndex, methods, problem, workspace } = page;
    const activeNode = getActiveFlowNode(workspace);
    const aiHelpState = workspace.aiHelpState;

    if (
      workspace.status === 'completed' ||
      !workspace.flowDraft ||
      !workspace.methodId ||
      !aiHelpState ||
      aiHelpState.isLoading ||
      !aiHelpState.input.trim() ||
      !activeNode ||
      activeNode.kind !== aiHelpState.nodeKind
    ) {
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
      const methodLabelKo = getMethodLabel(workspace.methodId, methods);
      const result = await requestDiagnosisExplanation({
        methodId: workspace.methodId,
        methodLabelKo,
        nodeBody: 'body' in activeNode ? activeNode.body : undefined,
        nodeId: activeNode.id,
        nodeKind: aiHelpState.nodeKind,
        nodeOptions:
          activeNode.kind === 'check'
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
              .map((entry) =>
                entry.kind === 'method-selector' ||
                entry.kind === 'node' ||
                entry.kind === 'ai-help' ||
                entry.kind === 'ai-help-actions'
                  ? { ...entry, interactive: false }
                  : entry,
              )
              .filter((entry) => entry.kind !== 'ai-help'),
            createBubbleEntry(answerIndex, 'user', currentHelpState.input.trim()),
            createBubbleEntry(answerIndex, 'assistant', result.replyText, 'info'),
            createAiHelpActionsEntry(
              answerIndex,
              currentHelpState.nodeId,
              currentHelpState.nodeKind,
              true,
            ),
          ],
        };
      });
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      requestDiagnosisAutoScroll(answerIndex);
      const errorMessage =
        error instanceof Error && error.name === 'AbortError'
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

  const reopenCheckNode = (page: DiagnosisPage) => {
    const { answerIndex, methods, workspace } = page;
    const activeNode = getActiveFlowNode(workspace);

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
          .map((entry) =>
            entry.kind === 'method-selector' ||
            entry.kind === 'node' ||
            entry.kind === 'ai-help' ||
            entry.kind === 'ai-help-actions'
              ? { ...entry, interactive: false }
              : entry,
          )
          .filter((entry) => entry.kind !== 'ai-help'),
        createBubbleEntry(answerIndex, 'user', '문제를 다시 볼게요'),
        createBubbleEntry(answerIndex, 'assistant', '좋아요. 같은 확인 문제를 다시 볼게요.', 'positive'),
        createNodeEntry(answerIndex, workspace.methodId!, methods, activeNode, true),
      ],
      flowDraft: appendAiHelpContinue(current.flowDraft!, activeNode.id, 'check'),
    }));
  };

  const handleAiHelpContinue = (page: DiagnosisPage) => {
    const activeNode = getActiveFlowNode(page.workspace);

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

    const nextDraft = advanceFromExplain(
      appendAiHelpContinue(workspace.flowDraft!, activeNode.id, 'explain'),
      'continue',
    );

    appendNextNode(answerIndex, methods, nextDraft, '확인 문제로 넘어갈게요');
  };

  const handleAiHelpFallback = (page: DiagnosisPage) => {
    const { answerIndex, methods, workspace } = page;
    const activeNode = getActiveFlowNode(workspace);

    if (!workspace.flowDraft || !activeNode || (activeNode.kind !== 'explain' && activeNode.kind !== 'check')) {
      return;
    }

    setDiagnosisInteracted(answerIndex);
    if (process.env.EXPO_OS === 'ios') {
      Haptics.selectionAsync();
    }

    if (activeNode.kind === 'explain') {
      const nextDraft = advanceFromExplain(
        appendAiHelpFallback(workspace.flowDraft, activeNode.id, 'explain'),
        'dont_know',
      );
      const nextNode = getNode(getDiagnosisFlow(nextDraft.methodId), nextDraft.currentNodeId);

      appendNextNode(answerIndex, methods, nextDraft, '더 쉬운 설명으로 볼게요', {
        text:
          nextNode.kind === 'final'
            ? '괜찮아요. 지금은 기초부터 정리하는 쪽이 더 좋아 보여요.'
            : '괜찮아요. 더 쉬운 설명으로 다시 이어갈게요.',
        tone: 'neutral',
      });
      return;
    }

    const nextDraft = advanceFromCheck(
      appendAiHelpFallback(workspace.flowDraft, activeNode.id, 'check'),
    );
    const nextNode = getNode(getDiagnosisFlow(nextDraft.methodId), nextDraft.currentNodeId);

    appendNextNode(answerIndex, methods, nextDraft, '더 쉬운 설명으로 볼게요', {
      text:
        nextNode.kind === 'final'
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

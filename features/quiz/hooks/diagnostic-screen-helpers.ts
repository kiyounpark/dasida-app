import type { Problem } from '@/data/problemData';
import { problemData } from '@/data/problemData';
import type { DiagnosisMethodCardOption } from '@/features/quiz/components/diagnosis-method-selector-card';
import type { DiagnosisConversationEntry } from '@/features/quiz/components/diagnosis-conversation-page';
import type { DiagnosisFlowNode } from '@/data/detailedDiagnosisFlows';
import { diagnosisMethodRoutingCatalog } from '@/data/diagnosis-method-routing';
import { methodOptions, type SolveMethodId } from '@/data/diagnosisTree';
import {
  getDiagnosisFlow,
  getNode,
  type DiagnosisFlowDraft,
} from '@/features/quiz/diagnosis-flow-engine';
import type { DiagnosisRouterResult } from '@/features/quiz/diagnosis-router';

export type DiagnosisAiHelpNodeKind = 'explain' | 'check';

export type DiagnosisAiHelpState = {
  error: string;
  input: string;
  isLoading: boolean;
  nodeId: string;
  nodeKind: DiagnosisAiHelpNodeKind;
  replyText?: string;
};

export type DiagnosisWorkspace = {
  aiHelpState: DiagnosisAiHelpState | null;
  aiHelpUsed: boolean;
  analysisErrorMessage: string;
  answerIndex: number;
  chatEntries: DiagnosisConversationEntry[];
  diagnosisInput: string;
  flowDraft: DiagnosisFlowDraft | null;
  isAnalyzing: boolean;
  methodId: SolveMethodId | null;
  problemId: string;
  routerResult: DiagnosisRouterResult | null;
  status: 'pending' | 'in_progress' | 'completed';
};

export type DiagnosisPage = {
  answerIndex: number;
  methods: DiagnosisMethodCardOption[];
  problem: Problem;
  suggestedMethods: DiagnosisMethodCardOption[];
  workspace: DiagnosisWorkspace;
};

export const problemById = new Map(problemData.map((problem) => [problem.id, problem]));

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
] as const;

export function getMethodLabel(
  methodId: SolveMethodId,
  availableMethods: DiagnosisMethodCardOption[],
) {
  return (
    availableMethods.find((method) => method.id === methodId)?.labelKo ??
    methodOptions.find((method) => method.id === methodId)?.labelKo ??
    methodId
  );
}

export function getMethodSelectionText(methodId: SolveMethodId, methodLabel: string) {
  if (methodId === 'unknown') {
    return '잘 모르겠어요.';
  }

  return `${methodLabel}으로 풀었어요.`;
}

export function getDiagnosisStepLabel(index: number) {
  return diagnosisStepLabels[index] ?? `${index + 1}번째 문제`;
}

export function findNextIncompleteDiagnosisPageIndex(
  pages: DiagnosisPage[],
  currentIndex: number,
): number | null {
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

export function freezeConversationEntries(
  entries: DiagnosisConversationEntry[],
): DiagnosisConversationEntry[] {
  return entries.map((entry) =>
    entry.kind === 'method-selector' ||
    entry.kind === 'node' ||
    entry.kind === 'ai-help' ||
    entry.kind === 'ai-help-actions'
      ? { ...entry, interactive: false }
      : entry,
  );
}

export function buildMethodOptions(problem: Problem): DiagnosisMethodCardOption[] {
  return methodOptions
    .filter((option) => problem.diagnosisMethods.includes(option.id))
    .map((option) => {
      const info = diagnosisMethodRoutingCatalog[option.id];

      return {
        id: option.id,
        labelKo: option.labelKo,
        summary: info?.summary ?? option.labelKo,
        exampleUtterances: info?.exampleUtterances ?? [],
      };
    });
}

export function buildSuggestedMethods(
  routerResult: DiagnosisRouterResult | null,
  methods: DiagnosisMethodCardOption[],
): DiagnosisMethodCardOption[] {
  if (!routerResult?.needsManualSelection) {
    return [];
  }

  const suggestedIds = routerResult.candidateMethodIds
    .filter((methodId) => methodId !== 'unknown')
    .slice(0, 2);

  return suggestedIds
    .map((methodId) => methods.find((method) => method.id === methodId))
    .filter((method): method is DiagnosisMethodCardOption => Boolean(method));
}

export function createInitialDiagnosisWorkspace(
  answerIndex: number,
  problem: Problem,
): DiagnosisWorkspace {
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

export function getActiveFlowNode(workspace: DiagnosisWorkspace): DiagnosisFlowNode | null {
  if (!workspace.flowDraft) {
    return null;
  }

  return getNode(
    getDiagnosisFlow(workspace.flowDraft.methodId),
    workspace.flowDraft.currentNodeId,
  );
}

export function buildDiagnosisAnalysisText(workspace: DiagnosisWorkspace) {
  return workspace.diagnosisInput.trim();
}

export function buildDiagnosisMethodDescriptors(methods: DiagnosisMethodCardOption[]) {
  return methods.map((method) => ({
    exampleUtterances: method.exampleUtterances ?? [],
    id: method.id,
    labelKo: method.labelKo,
    summary: method.summary ?? method.labelKo,
  }));
}

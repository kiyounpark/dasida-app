import { diagnosisExplainTimeoutMs, diagnosisExplainUrl } from '@/constants/env';
import type { SolveMethodId } from '@/data/diagnosisTree';

export type DiagnosisExplainInput = {
  problemId: string;
  problemQuestion: string;
  methodId: SolveMethodId;
  methodLabelKo: string;
  nodeKind: 'explain' | 'check';
  nodeId: string;
  nodeTitle: string;
  nodeBody?: string;
  nodePrompt?: string;
  nodeOptions?: string[];
  userQuestion: string;
};

export type DiagnosisExplainResult = {
  replyText: string;
  source: 'openai-explainer';
};

export async function requestDiagnosisExplanation(
  input: DiagnosisExplainInput,
): Promise<DiagnosisExplainResult> {
  if (!diagnosisExplainUrl) {
    throw new Error('Diagnosis explain endpoint is not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), diagnosisExplainTimeoutMs);

  try {
    const response = await fetch(diagnosisExplainUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload || typeof payload.replyText !== 'string' || !payload.replyText.trim()) {
      throw new Error(
        (payload && typeof payload.error === 'string' && payload.error) ||
          'Failed to fetch diagnosis explanation',
      );
    }

    return {
      replyText: payload.replyText.trim(),
      source: 'openai-explainer',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

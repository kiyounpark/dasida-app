import { FieldValue, getFirestore } from 'firebase-admin/firestore';

export async function logDiagnosisMethodRun(input: {
  problemId: string;
  allowedMethodIds: string[];
  predictedMethodId: string;
  confidence: number;
  candidateMethodIds: string[];
  reason: string;
  needsManualSelection: boolean;
  model: string;
  responseId: string;
}) {
  const firestore = getFirestore();

  await firestore.collection('diagnosisMethodRuns').add({
    createdAt: FieldValue.serverTimestamp(),
    problemId: input.problemId,
    allowedMethodIds: input.allowedMethodIds,
    predictedMethodId: input.predictedMethodId,
    confidence: input.confidence,
    candidateMethodIds: input.candidateMethodIds,
    reason: input.reason,
    needsManualSelection: input.needsManualSelection,
    source: 'openai-router',
    model: input.model,
    responseId: input.responseId,
  });
}

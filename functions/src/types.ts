export type DiagnosisMethodDescriptor = {
  id: string;
  labelKo: string;
  summary: string;
  exampleUtterances: string[];
};

export type DiagnosisMethodRequest = {
  problemId: string;
  rawText: string;
  allowedMethodIds: string[];
  allowedMethods: DiagnosisMethodDescriptor[];
};

export type OpenAIDiagnosisResult = {
  predictedMethodId: string;
  confidence: number;
  candidateMethodIds: string[];
  reason: string;
};

export type DiagnosisExplainNodeKind = 'explain' | 'check';

export type DiagnosisExplainRequest = {
  problemId: string;
  problemQuestion: string;
  methodId: string;
  methodLabelKo: string;
  nodeKind: DiagnosisExplainNodeKind;
  nodeId: string;
  nodeTitle: string;
  nodeBody?: string;
  nodePrompt?: string;
  nodeOptions?: string[];
  userQuestion: string;
};

export type OpenAIDiagnosisExplainResult = {
  replyText: string;
};

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

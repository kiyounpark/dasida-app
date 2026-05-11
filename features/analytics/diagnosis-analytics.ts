import { logEvent } from './log-event';

export type DiagnosisCompletedSource = 'exam' | 'unit';

export interface LogDiagnosisCompletedParams {
  accountKey: string;
  source: DiagnosisCompletedSource;
  weaknessId: string;
  examId?: string;
  problemNumber?: number;
}

export function logDiagnosisCompleted(params: LogDiagnosisCompletedParams): void {
  const eventParams: {
    source: DiagnosisCompletedSource;
    weakness_id: string;
    exam_id?: string;
    problem_number?: number;
  } = {
    source: params.source,
    weakness_id: params.weaknessId,
  };

  if (params.examId !== undefined) {
    eventParams.exam_id = params.examId;
  }
  if (params.problemNumber !== undefined) {
    eventParams.problem_number = params.problemNumber;
  }

  logEvent('diagnosis_completed', eventParams);
}

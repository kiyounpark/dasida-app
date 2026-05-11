import { logDiagnosisCompleted } from '../diagnosis-analytics';
import { logEvent } from '../log-event';

jest.mock('../log-event', () => ({
  logEvent: jest.fn(),
}));

describe('logDiagnosisCompleted (migrated to GA4)', () => {
  beforeEach(() => {
    (logEvent as jest.Mock).mockReset();
  });

  it('fires diagnosis_completed via logEvent for authenticated user', () => {
    logDiagnosisCompleted({
      accountKey: 'user:firebase-uid-abc',
      source: 'exam',
      weaknessId: 'weakness-1',
      examId: 'exam-2024-09',
      problemNumber: 7,
    });

    expect(logEvent).toHaveBeenCalledWith('diagnosis_completed', {
      source: 'exam',
      weakness_id: 'weakness-1',
      exam_id: 'exam-2024-09',
      problem_number: 7,
    });
  });

  it('also fires for anonymous/guest users (no user: prefix)', () => {
    logDiagnosisCompleted({
      accountKey: 'guest:anon-123',
      source: 'unit',
      weaknessId: 'weakness-2',
    });

    expect(logEvent).toHaveBeenCalledWith('diagnosis_completed', {
      source: 'unit',
      weakness_id: 'weakness-2',
    });
  });

  it('omits undefined optional fields from params', () => {
    logDiagnosisCompleted({
      accountKey: 'user:uid',
      source: 'unit',
      weaknessId: 'w-3',
    });

    expect(logEvent).toHaveBeenCalledWith('diagnosis_completed', {
      source: 'unit',
      weakness_id: 'w-3',
    });
  });
});

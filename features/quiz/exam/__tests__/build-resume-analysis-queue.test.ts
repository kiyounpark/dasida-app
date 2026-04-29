import type { WeaknessId } from '@/data/diagnosisMap';
import type { DiagnosedNote } from '../exam-analysis-in-progress';
import { buildResumeAnalysisQueue } from '../build-resume-analysis-queue';

const w = (s: string) => s as unknown as WeaknessId;

describe('buildResumeAnalysisQueue', () => {
  it('진단된 문제 없으면 전체 wrongProblemNumbers를 그대로 반환한다', () => {
    expect(buildResumeAnalysisQueue([10, 15, 20, 25, 30], [])).toEqual([
      10, 15, 20, 25, 30,
    ]);
  });

  it('일부 진단 완료 — 미진단 문제만 원래 번호 순서대로 반환한다', () => {
    const diagnosedNotes: DiagnosedNote[] = [
      { problemNumber: 10, weaknessId: w('w_a') },
      { problemNumber: 20, weaknessId: w('w_b') },
    ];
    expect(buildResumeAnalysisQueue([10, 15, 20, 25, 30], diagnosedNotes)).toEqual([
      15, 25, 30,
    ]);
  });

  it('비순차 진단 케이스 — 진단 순서와 무관하게 원래 번호 순서 유지', () => {
    // 25번 → 30번 순으로 비순차 진단된 상태
    const diagnosedNotes: DiagnosedNote[] = [
      { problemNumber: 25, weaknessId: w('w_a') },
      { problemNumber: 30, weaknessId: w('w_b') },
    ];
    expect(buildResumeAnalysisQueue([10, 15, 20, 25, 30], diagnosedNotes)).toEqual([
      10, 15, 20,
    ]);
  });

  it('모두 진단 완료 — 빈 배열 반환', () => {
    const diagnosedNotes: DiagnosedNote[] = [
      { problemNumber: 10, weaknessId: w('w_a') },
      { problemNumber: 15, weaknessId: w('w_b') },
      { problemNumber: 20, weaknessId: w('w_c') },
    ];
    expect(buildResumeAnalysisQueue([10, 15, 20], diagnosedNotes)).toEqual([]);
  });

  it('diagnosedNotes에 wrongProblemNumbers 외 키가 있어도 무시 (재시도 케이스)', () => {
    const diagnosedNotes: DiagnosedNote[] = [
      { problemNumber: 10, weaknessId: w('w_a') },
      { problemNumber: 99, weaknessId: w('w_stale') },
    ];
    expect(buildResumeAnalysisQueue([10, 15, 20], diagnosedNotes)).toEqual([
      15, 20,
    ]);
  });
});

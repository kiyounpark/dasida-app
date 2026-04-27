import type { WeaknessId } from '@/data/diagnosisMap';
import type { ExamDiagnosisProgress } from '../exam-diagnosis-progress';
import { buildDiagnosisQueue } from '../build-diagnosis-queue';

describe('buildDiagnosisQueue', () => {
  it('진단된 문제 없으면 클릭한 문제 첫 자리, 나머지 원래 순서', () => {
    expect(buildDiagnosisQueue([1, 3, 5], {}, 1)).toEqual([1, 3, 5]);
    expect(buildDiagnosisQueue([1, 3, 5], {}, 3)).toEqual([3, 1, 5]);
  });

  it('일부 진단 완료 — 미진단만, 클릭한 문제 첫 자리', () => {
    const diagnosed: ExamDiagnosisProgress = { 5: 'formula_understanding' as WeaknessId };
    expect(buildDiagnosisQueue([1, 3, 5], diagnosed, 3)).toEqual([3, 1]);
    expect(buildDiagnosisQueue([1, 3, 5], diagnosed, 1)).toEqual([1, 3]);
  });

  it('마지막 한 개만 미진단 + 그것 클릭', () => {
    const diagnosed: ExamDiagnosisProgress = {
      3: 'calc_repeated_error' as WeaknessId,
      5: 'formula_understanding' as WeaknessId,
    };
    expect(buildDiagnosisQueue([1, 3, 5], diagnosed, 1)).toEqual([1]);
  });

  it('이미 진단 완료된 문제 클릭 — 빈 배열 (방어)', () => {
    const diagnosed: ExamDiagnosisProgress = { 3: 'calc_repeated_error' as WeaknessId };
    expect(buildDiagnosisQueue([1, 3, 5], diagnosed, 3)).toEqual([]);
  });

  it('allWrong에 없는 번호 클릭 — 빈 배열 (방어)', () => {
    expect(buildDiagnosisQueue([1, 3, 5], {}, 99)).toEqual([]);
  });

  it('JSON.parse 결과처럼 string 키여도 동작 (in 연산자 coercion)', () => {
    const diagnosed = JSON.parse('{"5":"formula_understanding"}') as ExamDiagnosisProgress;
    expect(buildDiagnosisQueue([1, 3, 5], diagnosed, 1)).toEqual([1, 3]);
  });
});

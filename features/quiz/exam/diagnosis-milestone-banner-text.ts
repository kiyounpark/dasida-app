import type { MilestoneFraction } from '@/features/quiz/exam/diagnosis-milestone';

export function getHeadline(fraction: MilestoneFraction): string {
  return fraction === 33 ? '벌써 절반 왔어.' : '한 문제만 더.';
}

export function getSub(fraction: MilestoneFraction, noteCount: number): string {
  return fraction === 33
    ? `${noteCount}문제 분석 완료 · 잘 하고 있어`
    : `${noteCount}문제 분석 완료 · 거의 다 왔어`;
}

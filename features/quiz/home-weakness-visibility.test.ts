import type { WeaknessProgressItem } from '@/features/learning/types';

import { shouldShowWeaknessSection } from './home-weakness-visibility';

const item = (reviewAccuracyByStage: WeaknessProgressItem['reviewAccuracyByStage']) =>
  ({ reviewAccuracyByStage }) as WeaknessProgressItem;

describe('shouldShowWeaknessSection', () => {
  it('복습을 한 번도 안 끝냈으면 안 띄운다 — 사진 1장 학생에게 빈 차트', () => {
    expect(shouldShowWeaknessSection([item({})], false)).toBe(false);
  });

  it('복습을 한 번 끝냈으면 띄운다', () => {
    expect(shouldShowWeaknessSection([item({}), item({ day1: 67 })], false)).toBe(true);
  });

  it('실모 분석 중이면 안 띄운다(지금 동작 유지)', () => {
    expect(shouldShowWeaknessSection([item({ day1: 67 })], true)).toBe(false);
  });

  it('항목이 없으면 안 띄운다', () => {
    expect(shouldShowWeaknessSection(undefined, false)).toBe(false);
  });
});

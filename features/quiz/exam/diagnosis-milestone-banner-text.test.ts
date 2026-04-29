import { getHeadline, getSub } from './diagnosis-milestone-banner-text';

describe('getHeadline', () => {
  it('returns 벌써 절반 왔어. at 33%', () => {
    expect(getHeadline(33)).toBe('벌써 절반 왔어.');
  });

  it('returns 한 문제만 더. at 67%', () => {
    expect(getHeadline(67)).toBe('한 문제만 더.');
  });
});

describe('getSub', () => {
  it('returns 잘 하고 있어 message at 33%', () => {
    expect(getSub(33, 15)).toBe('15문제 분석 완료 · 잘 하고 있어');
  });

  it('returns 거의 다 왔어 message at 67%', () => {
    expect(getSub(67, 30)).toBe('30문제 분석 완료 · 거의 다 왔어');
  });

  it('interpolates noteCount correctly', () => {
    expect(getSub(33, 1)).toBe('1문제 분석 완료 · 잘 하고 있어');
    expect(getSub(67, 0)).toBe('0문제 분석 완료 · 거의 다 왔어');
  });
});

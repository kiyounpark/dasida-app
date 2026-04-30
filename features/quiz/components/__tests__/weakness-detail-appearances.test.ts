import { formatAppearanceDateKst } from '../weakness-detail-appearances';

describe('formatAppearanceDateKst', () => {
  const CURRENT_YEAR = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCFullYear();

  it('올해 날짜는 "M월 D일" 형식', () => {
    const iso = `${CURRENT_YEAR}-03-02T10:00:00.000Z`;
    expect(formatAppearanceDateKst(iso)).toBe('3월 2일');
  });

  it('작년 날짜는 "YYYY년 M월 D일" 형식', () => {
    const pastYear = CURRENT_YEAR - 1;
    const iso = `${pastYear}-11-14T00:00:00.000Z`;
    expect(formatAppearanceDateKst(iso)).toBe(`${pastYear}년 11월 14일`);
  });

  it('UTC 자정이 KST 09:00이므로 날짜 변환이 KST 기준', () => {
    // UTC 2026-03-01T23:00:00Z = KST 2026-03-02T08:00:00+09:00
    const iso = `${CURRENT_YEAR}-03-01T23:00:00.000Z`;
    expect(formatAppearanceDateKst(iso)).toBe('3월 2일');
  });
});

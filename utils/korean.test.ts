import { getKoreanSubjectParticle } from './korean';

describe('getKoreanSubjectParticle', () => {
  it('받침 있는 한글로 끝나면 "이" 반환', () => {
    expect(getKoreanSubjectParticle('함수의 극한')).toBe('이');
    expect(getKoreanSubjectParticle('함')).toBe('이');
    expect(getKoreanSubjectParticle('미적분')).toBe('이');
    expect(getKoreanSubjectParticle('확률')).toBe('이');
  });

  it('받침 없는 한글로 끝나면 "가" 반환', () => {
    expect(getKoreanSubjectParticle('확률과 통계')).toBe('가');
    expect(getKoreanSubjectParticle('가')).toBe('가');
    expect(getKoreanSubjectParticle('수학의 정수')).toBe('가');
  });

  it('빈 문자열이면 "이" fallback', () => {
    expect(getKoreanSubjectParticle('')).toBe('이');
  });

  it('비한글 (ASCII / 숫자) 끝이면 "이" fallback', () => {
    expect(getKoreanSubjectParticle('f(x)')).toBe('이');
    expect(getKoreanSubjectParticle('test123')).toBe('이');
  });
});

import { getKoreanSubjectParticle, getKoreanTopicParticle } from './korean';

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

describe('getKoreanTopicParticle', () => {
  it('받침 있는 한글로 끝나면 "은" 반환', () => {
    expect(getKoreanTopicParticle('근의 공식')).toBe('은');
    expect(getKoreanTopicParticle('미분')).toBe('은');
  });

  it('ㄹ받침도 "은" (으로/로와 규칙이 다름)', () => {
    expect(getKoreanTopicParticle('서울')).toBe('은');
    expect(getKoreanTopicParticle('나머지정리 활용')).toBe('은');
  });

  it('받침 없는 한글로 끝나면 "는" 반환', () => {
    expect(getKoreanTopicParticle('인수분해')).toBe('는');
    expect(getKoreanTopicParticle('확률과 통계')).toBe('는');
  });

  it('빈 문자열·비한글 끝이면 "은" fallback', () => {
    expect(getKoreanTopicParticle('')).toBe('은');
    expect(getKoreanTopicParticle('f(x)')).toBe('은');
  });
});

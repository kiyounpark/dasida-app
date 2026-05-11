import {
  getJourneyStepDetailCopy,
  JOURNEY_STEP_KEYS,
} from './journey-step-detail-copy';

describe('journey-step-detail-copy', () => {
  it('JOURNEY_STEP_KEYS는 4개 키를 정확히 노출', () => {
    expect(JOURNEY_STEP_KEYS).toEqual(['diagnostic', 'analysis', 'review', 'exam']);
  });

  it.each(['diagnostic', 'analysis', 'review', 'exam'] as const)(
    '%s 키에 대한 카피가 정의되어 있음',
    (key) => {
      const copy = getJourneyStepDetailCopy(key);
      expect(copy).toBeDefined();
      expect(copy.label).toBe('지금 단계');
      expect(typeof copy.title).toBe('string');
      expect(copy.title.length).toBeGreaterThan(0);
      expect(typeof copy.bodyRich).toBe('string');
      expect(typeof copy.bodyCompact).toBe('string');
      expect(copy.bodyRich.length).toBeGreaterThan(copy.bodyCompact.length);
      expect(typeof copy.afterStepHint).toBe('string');
    },
  );

  it('STEP 1 (diagnostic)은 메타 정보 3종을 모두 가짐', () => {
    const copy = getJourneyStepDetailCopy('diagnostic');
    expect(copy.meta).toEqual({
      duration: '약 8분',
      difficulty: '기본',
      questionCount: '10문제',
    });
  });

  it('알 수 없는 키는 diagnostic으로 fallback', () => {
    // @ts-expect-error 의도적으로 잘못된 키 전달
    const copy = getJourneyStepDetailCopy('unknown');
    expect(copy.title).toBe(getJourneyStepDetailCopy('diagnostic').title);
  });
});

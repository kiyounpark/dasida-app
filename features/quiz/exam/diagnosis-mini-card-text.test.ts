import {
  buildMiniCardText,
  type MiniCardTextInput,
} from '@/features/quiz/exam/diagnosis-mini-card-text';

describe('buildMiniCardText', () => {
  it('methodLabel + lastNodeText (80자 이하) 그대로 반환', () => {
    const input: MiniCardTextInput = {
      methodLabel: '계산 실수',
      lastNodeText: '시간 압박 상황에서 부호를 놓쳤어요. 검산 한 번이면 잡을 수 있어요.',
    };
    expect(buildMiniCardText(input)).toEqual({
      patternName: '계산 실수',
      patternDescription: '시간 압박 상황에서 부호를 놓쳤어요. 검산 한 번이면 잡을 수 있어요.',
    });
  });

  it('lastNodeText 80자 초과 시 잘림 + ellipsis', () => {
    const long = '아주 긴 텍스트입니다. '.repeat(20);
    const input: MiniCardTextInput = {
      methodLabel: '개념 이해 부족',
      lastNodeText: long,
    };
    const result = buildMiniCardText(input);
    expect(result.patternName).toBe('개념 이해 부족');
    expect(result.patternDescription.length).toBeLessThanOrEqual(80);
    expect(result.patternDescription).toMatch(/…$/);
  });

  it('lastNodeText 없으면 fallback 설명', () => {
    const input: MiniCardTextInput = {
      methodLabel: '문제 해석 오류',
      lastNodeText: null,
    };
    expect(buildMiniCardText(input)).toEqual({
      patternName: '문제 해석 오류',
      patternDescription: '이 패턴을 알아둔 거예요. 다음에 같은 유형이 나오면 한 번 더 떠올려보세요.',
    });
  });

  it('methodLabel과 lastNodeText 둘 다 없으면 generic fallback', () => {
    const input: MiniCardTextInput = {
      methodLabel: null,
      lastNodeText: null,
    };
    expect(buildMiniCardText(input)).toEqual({
      patternName: '분석 완료',
      patternDescription: '한 문제 분석이 끝났어요. 학습 노트로 저장됐어요.',
    });
  });

  it('methodLabel 없지만 lastNodeText는 있는 경우: lastNodeText 보여줌', () => {
    const input: MiniCardTextInput = {
      methodLabel: null,
      lastNodeText: '풀이의 핵심은 검산이에요.',
    };
    expect(buildMiniCardText(input)).toEqual({
      patternName: '분석 완료',
      patternDescription: '풀이의 핵심은 검산이에요.',
    });
  });
});

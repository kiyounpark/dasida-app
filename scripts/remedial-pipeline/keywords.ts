import type { WeaknessId } from '../../data/diagnosisMap';

/**
 * 시험 풀이 intent 텍스트를 약점으로 분류하는 키워드 사전.
 * 매칭: intent 문자열에 keywords 중 하나라도 포함되면 해당 약점에 매핑.
 * Pilot: discriminant_calculation만 채움. 56개 확장 시 나머지 채움.
 */
export const weaknessKeywords: Partial<Record<WeaknessId, readonly string[]>> = {
  discriminant_calculation: [
    '판별식',
    '실근',
    '허근',
    '중근',
    '근의 개수',
    'b²-4ac',
    'b^2-4ac',
    '이차방정식의 근',
  ],
};

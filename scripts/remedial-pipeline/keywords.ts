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
  calc_repeated_error: [
    '대입',
    '음수 대입',
    '괄호',
    '부호 실수',
    '계산 실수',
    '항별 계산',
    '음수 제곱',
    '재계산',
  ],
  min_value_read_confusion: [
    '최솟값',
    '최댓값',
    '이차함수',
    '꼭짓점',
    '표준형',
    '(x-a)²+b',
    '최솟값을 갖는',
    '최솟값의 좌표',
    '함수의 최솟값',
  ],
  radical_simplification_error: [
    '제곱근',
    '근호',
    '√',
    '루트',
    '소인수분해',
    '근호 안의 수',
    '근호 밖',
    '간소화',
    '무리수',
  ],
  vertex_formula_memorization: [
    '꼭짓점의 좌표',
    '그래프의 꼭짓점',
    '대칭축',
  ],
  coefficient_sign_confusion: [
    '이차항의 계수',
    '일차항의 계수',
    '상수항',
    '최고차항의 계수',
  ],
};

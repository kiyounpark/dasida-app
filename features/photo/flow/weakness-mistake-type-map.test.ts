import { weaknessOrder, type WeaknessId } from '@/data/diagnosisMap';
import { diagnosisTree, type SolveMethodId } from '@/data/diagnosisTree';

import { MISTAKE_TYPE_IDS } from '../types';
import { weaknessCandidatesFor, weaknessMistakeType } from './weakness-mistake-type-map';

describe('통역표 (약점 59 → 실수 유형 6)', () => {
  it('약점 59개가 하나도 안 빠지고, 표에만 있는 유령 키도 없다', () => {
    const tagged = Object.keys(weaknessMistakeType).sort();
    expect(tagged).toEqual([...weaknessOrder].sort());
    expect(weaknessOrder).toHaveLength(59);
  });

  it('붙은 태그가 전부 실수 유형 6개 안에 있다', () => {
    const unknown = Object.entries(weaknessMistakeType).filter(
      ([, type]) => !MISTAKE_TYPE_IDS.includes(type),
    );
    expect(unknown).toEqual([]);
  });

  // docs/weakness-type-map/05-final.md "태그 분포" 줄. 옮기다 한 칸 틀리면 여기서 먼저 운다.
  it('태그 분포가 확정 문서와 같다', () => {
    const distribution = Object.values(weaknessMistakeType).reduce<Record<string, number>>(
      (acc, type) => ({ ...acc, [type]: (acc[type] ?? 0) + 1 }),
      {},
    );

    expect(distribution).toEqual({
      concept_gap: 19,
      calc_slip: 11,
      formula_recall: 20,
      procedure_miss: 4,
      setup_error: 3,
      answer_read: 2,
    });
  });
});

describe('weaknessCandidatesFor', () => {
  it('보통은 약점 하나로 좁혀진다', () => {
    expect(weaknessCandidatesFor('cps', 'concept_gap')).toEqual(['formula_understanding']);
    expect(weaknessCandidatesFor('cps', 'answer_read')).toEqual(['min_value_read_confusion']);
    expect(weaknessCandidatesFor('vertex', 'formula_recall')).toEqual([
      'vertex_formula_memorization',
    ]);
  });

  // 문서 ① "전혀 안 좁히는 곳 2개: 무리수(계산) · 명제(개념)". 두루뭉술한 것을 뺀 뒤에도 남는다.
  it('두루뭉술한 것을 빼고도 여럿 남는 자리는 후보를 그대로 돌려준다', () => {
    expect(weaknessCandidatesFor('radical', 'calc_slip')).toEqual([
      'radical_simplification_error',
      'rationalization_error',
      'g2_radical_rationalize',
    ]);
    expect(weaknessCandidatesFor('proposition', 'concept_gap')).toEqual([
      'g2_prop_contrapositive',
      'g2_prop_necessary_sufficient',
      'g2_prop_quantifier',
    ]);
  });

  // 기윤 판정(08.11) — 근거는 08.08 커밋 a76a9db "마음가짐 문구 금지".
  // '계산 실수 반복'·'기초 개념 학습 필요'의 tip이 08.07 조사에서 피하라고 한 그 문구다.
  describe('두루뭉술한 약점은 뒷순위', () => {
    it('구체적인 약점이 있으면 두루뭉술한 것은 안 고른다', () => {
      expect(weaknessCandidatesFor('quadratic', 'calc_slip')).toEqual(['discriminant_calculation']);
      expect(weaknessCandidatesFor('complex_number', 'calc_slip')).toEqual(['complex_calc_error']);
      expect(weaknessCandidatesFor('remainder_theorem', 'calc_slip')).toEqual([
        'remainder_substitution_error',
      ]);
      expect(weaknessCandidatesFor('counting', 'concept_gap')).toEqual([
        'counting_method_confusion',
      ]);
    });

    it('두루뭉술한 것뿐이면 그거라도 준다 (막다른 길 방지)', () => {
      expect(weaknessCandidatesFor('cps', 'calc_slip')).toEqual(['calc_repeated_error']);
      expect(weaknessCandidatesFor('unknown', 'concept_gap')).toEqual(['basic_concept_needed']);
    });
  });

  it('그 풀이법에 없는 유형이면 빈 배열', () => {
    expect(weaknessCandidatesFor('cps', 'setup_error')).toEqual([]);
  });

  // sequence는 선택지 3개가 전부 g3_sequence 하나다 — 중복을 안 걷으면 3개가 돌아온다
  it('같은 약점이 여러 번 달려 있어도 한 번만 돌려준다', () => {
    expect(weaknessCandidatesFor('sequence', 'formula_recall')).toEqual(['g3_sequence']);
  });

  // 고3·심화 풀이법 15개는 diagnosisTree의 선택지 3개가 전부 같은 약점이라
  // 실수 유형 6개 중 1개만 살고 5개는 빈다. 통역표가 아니라 진단 트리가 얕은 것 —
  // 저장을 붙이기 전에 정해야 할 구멍이라 숫자로 박아둔다. 트리가 깊어지면 여기가 먼저 운다.
  it('고3·심화 구간은 실수 유형 대부분이 아직 비어 있다 (기준선)', () => {
    expect(weaknessCandidatesFor('sequence', 'calc_slip')).toEqual([]);
    expect(weaknessCandidatesFor('statistics', 'calc_slip')).toEqual([]);
    expect(weaknessCandidatesFor('diff_advanced', 'calc_slip')).toEqual([]);

    let empty = 0;
    for (const methodId of Object.keys(diagnosisTree) as SolveMethodId[]) {
      for (const type of MISTAKE_TYPE_IDS) {
        if (weaknessCandidatesFor(methodId, type).length === 0) empty += 1;
      }
    }
    expect(empty).toBe(131); // 31개 풀이법 × 6개 유형 = 186 중 131
  });

  it('돌려주는 약점은 전부 그 풀이법에 실제로 달린 것이고 태그도 맞다', () => {
    for (const methodId of Object.keys(diagnosisTree) as SolveMethodId[]) {
      const attached = new Set(diagnosisTree[methodId].choices.map((c) => c.weaknessId));
      for (const type of MISTAKE_TYPE_IDS) {
        for (const id of weaknessCandidatesFor(methodId, type)) {
          expect(attached.has(id)).toBe(true);
          expect(weaknessMistakeType[id]).toBe(type);
        }
      }
    }
  });

  // 태그를 하나라도 옮기면 이 숫자가 흔들린다 — 저장 규칙을 정하기 전의 기준선.
  // 두루뭉술한 것 뒷순위 규칙(08.11) 적용 뒤 46 → 50. 남은 자리가 아직 안 정한 곳이다.
  // g3_log_exp_base는 서버가 아직 그 이름을 몰라 1.0.7에서 진단 갈래를 되돌렸다(08.25).
  // 서버 배포 뒤 갈래를 다시 걸면 지수·로그+공식이 2개가 되면서 50 → 49, 5 → 6.
  it('전체 조합 55개 중 50개가 하나로 좁혀진다 (기준선)', () => {
    let single = 0;
    let multiple = 0;
    const widest: Record<string, WeaknessId[]> = {};

    for (const methodId of Object.keys(diagnosisTree) as SolveMethodId[]) {
      for (const type of MISTAKE_TYPE_IDS) {
        const candidates = weaknessCandidatesFor(methodId, type);
        if (candidates.length === 0) continue;
        if (candidates.length === 1) single += 1;
        else {
          multiple += 1;
          widest[`${methodId}+${type}`] = candidates;
        }
      }
    }

    expect(single).toBe(50);
    expect(multiple).toBe(5);
    expect(widest['radical+calc_slip']).toHaveLength(3);
  });
});

import type { SolveMethodId } from './diagnosisTree';

export type DiagnosisMethodRoutingInfo = {
  id: SolveMethodId;
  labelKo: string;
  summary: string;
  keywords: string[];
  exampleUtterances: string[];
  followupLabel: string;
};

export const diagnosisMethodRoutingCatalog: Record<SolveMethodId, DiagnosisMethodRoutingInfo> = {
  cps: {
    id: 'cps',
    labelKo: '완전제곱식',
    summary: '이차식을 완전제곱식 형태로 변형하여 푸는 방식',
    keywords: ['완전제곱', '제곱식', '반의 제곱', '더하고 빼', '묶었'],
    exampleUtterances: [
      '완전제곱식으로 묶어서 풂',
      'x계수 반의 제곱을 더하고 빼서 만들었어요',
    ],
    followupLabel: '완전제곱식으로 변형',
  },
  vertex: {
    id: 'vertex',
    labelKo: '꼭짓점 공식',
    summary: '이차함수의 꼭짓점 공식을 이용하는 방식',
    keywords: ['꼭짓점', '공식', '-b/2a', '대칭축', '축의 방정식'],
    exampleUtterances: [
      '꼭짓점 공식으로 x좌표를 먼저 구했어요',
      '-b/2a 공식을 써서 대입했어요',
    ],
    followupLabel: '꼭짓점 공식을 사용',
  },
  diff: {
    id: 'diff',
    labelKo: '미분',
    summary: '함수를 미분하여 극댓값이나 극솟값을 찾는 방식',
    keywords: ['미분', '접선', '도함수', "f'(x)", '극값', '기울기 0'],
    exampleUtterances: [
      "미분해서 f'(x)=0 만들었어요",
      '도함수 구해서 0 되는 점 찾았어요',
    ],
    followupLabel: '미분으로 극값을 찾음',
  },
  factoring: {
    id: 'factoring',
    labelKo: '인수분해',
    summary: '다항식을 인수분해하여 해를 구하는 방식',
    keywords: ['인수', '인수분해', '묶', '곱의 형태', '크로스'],
    exampleUtterances: [
      '인수분해 공식을 써서 묶었어요',
      '공통인수로 묶어서 계산했어요',
    ],
    followupLabel: '인수분해를 활용함',
  },
  quadratic: {
    id: 'quadratic',
    labelKo: '근의 공식',
    summary: '이차방정식의 근의 공식을 사용하는 방식',
    keywords: ['근의 공식', '판별식', '루트', '2a분의'],
    exampleUtterances: [
      '바로 근의 공식에 대입했어요',
      '짝수 공식 써서 해를 구했어요',
    ],
    followupLabel: '근의 공식을 사용함',
  },
  radical: {
    id: 'radical',
    labelKo: '무리수 계산',
    summary: '루트(무리수)가 포함된 식을 계산하거나 유리화하는 방식',
    keywords: ['루트', '무리수', '유리화', '켤레', '제곱근'],
    exampleUtterances: [
      '분모 유리화하다가 헷갈렸어요',
      '루트 안의 숫자 빼내는 걸 실수했어요',
    ],
    followupLabel: '무리수 계산 및 유리화',
  },
  polynomial: {
    id: 'polynomial',
    labelKo: '다항식 전개',
    summary: '다항식을 전개하여 동류항끼리 정리하는 방식',
    keywords: ['전개', '전개식', '동류항', '풀어서', '전부 곱'],
    exampleUtterances: [
      '식을 다 전개해서 동류항끼리 묶었어요',
      '전개 과정에서 부호 실수를 했어요',
    ],
    followupLabel: '다항식을 전부 전개함',
  },
  complex_number: {
    id: 'complex_number',
    labelKo: '복소수 계산',
    summary: '허수 단위 i가 포함된 식을 계산하는 방식',
    keywords: ['복소수', '허수', 'i', '제곱해서 -1', '켤레복소수', '실수부', '허수부'],
    exampleUtterances: [
      'i제곱을 -1로 바꾸는 걸 까먹었어요',
      '실수부 허수부 따로 나눠서 계산했어요',
    ],
    followupLabel: '복소수 성질을 이용함',
  },
  remainder_theorem: {
    id: 'remainder_theorem',
    labelKo: '나머지정리',
    summary: '나머지정리 또는 인수정리를 이용하는 방식',
    keywords: ['나머지', '인수정리', '대입', '몫', '0으로 만드는'],
    exampleUtterances: [
      '나머지정리로 x에 특정 값을 대입했어요',
      '나누어 떨어지니까 인수정리 썼어요',
    ],
    followupLabel: '나머지/인수정리 활용',
  },
  counting: {
    id: 'counting',
    labelKo: '경우의 수',
    summary: '순열, 조합 등을 이용해 경우의 수를 구하는 방식',
    keywords: ['경우', '경우의수', '순열', '조합', '뽑', '배열', '수형도', '나열'],
    exampleUtterances: [
      '수형도로 일일이 다 셌어요',
      '조합 공식 써서 계산했어요',
    ],
    followupLabel: '경우의 수/확률 계산',
  },
  unknown: {
    id: 'unknown',
    labelKo: '잘 모르겠어',
    summary: '풀이 방식을 특정하기 어려운 경우',
    keywords: ['모르', '막혔', '어떻게', '뭘 해야', '감이 안'],
    exampleUtterances: [
      '어떻게 시작해야 할지 모르겠어요',
      '뭔가 해보긴 했는데 중간부터 막혔어요',
    ],
    followupLabel: '잘 모르겠어요',
  },
  set: {
    id: 'set',
    labelKo: '집합 연산',
    summary: '집합의 합집합·교집합·여집합 등을 이용하여 푸는 방식',
    keywords: ['집합', '합집합', '교집합', '여집합', '원소', 'n(A'],
    exampleUtterances: [
      '집합 연산 공식을 써서 원소 개수를 구했어요',
      '여집합 범위가 헷갈렸어요',
    ],
    followupLabel: '집합 연산을 사용함',
  },
  proposition: {
    id: 'proposition',
    labelKo: '명제 판별',
    summary: '명제의 참·거짓 판단, 역·이·대우, 필요·충분조건을 다루는 방식',
    keywords: ['명제', '역', '대우', '필요조건', '충분조건', '참', '거짓', '모든', '어떤'],
    exampleUtterances: [
      '역과 대우 중 어느 것을 써야 할지 헷갈렸어요',
      '필요조건 충분조건 구분이 어려웠어요',
    ],
    followupLabel: '명제 참·거짓 판별',
  },
  trig: {
    id: 'trig',
    labelKo: '삼각함수',
    summary: '삼각함수 정의, 단위원, 삼각방정식·부등식을 다루는 방식',
    keywords: ['삼각', '사인', '코사인', '탄젠트', 'sin', 'cos', 'tan', '단위원', '라디안'],
    exampleUtterances: [
      '삼각방정식 해 범위 설정에서 막혔어요',
      '단위원에서 값 읽는 게 헷갈렸어요',
    ],
    followupLabel: '삼각함수 활용',
  },
  integral: {
    id: 'integral',
    labelKo: '적분',
    summary: '부정적분·정적분 공식을 이용하여 푸는 방식',
    keywords: ['적분', '부정적분', '정적분', '넓이', 'F(b)-F(a)', '적분구간'],
    exampleUtterances: [
      '정적분 계산에서 끝값 대입을 잘못했어요',
      '부정적분 공식이 잘 안 떠올랐어요',
    ],
    followupLabel: '적분을 활용함',
  },
  linear_eq: {
    id: 'linear_eq',
    labelKo: '부등식·함수',
    summary: '이차부등식·함수의 정의역·치역을 다루는 방식',
    keywords: ['부등식', '정의역', '치역', '범위', '함수식', '이차부등식'],
    exampleUtterances: [
      '이차부등식 해의 범위를 반대로 썼어요',
      '함수의 정의역 설정이 헷갈렸어요',
    ],
    followupLabel: '부등식·함수 조건 활용',
  },
};

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
  sequence: {
    id: 'sequence',
    labelKo: '수열',
    summary: '등차·등비수열 일반항·합 공식 또는 점화식으로 푸는 방식',
    keywords: ['수열', '등차', '등비', '점화식', '일반항', '합 공식', 'Sₙ', '시그마'],
    exampleUtterances: [
      '등차수열 일반항으로 aₙ 구했어요',
      '점화식으로 일반항 유도했어요',
      '합 공식 Sₙ 써서 계산했어요',
    ],
    followupLabel: '수열 공식을 적용함',
  },
  log_exp: {
    id: 'log_exp',
    labelKo: '지수·로그',
    summary: '지수·로그 성질을 이용해 방정식·부등식을 푸는 방식',
    keywords: ['지수', '로그', 'log', '밑', '지수법칙', '로그 성질', '방정식', '상용로그'],
    exampleUtterances: [
      '로그 성질로 식을 변환했어요',
      '지수법칙으로 밑을 통일했어요',
      '양변에 로그 취해서 지수방정식 풀었어요',
    ],
    followupLabel: '지수·로그 성질을 활용함',
  },
  conic: {
    id: 'conic',
    labelKo: '이차곡선',
    summary: '포물선·타원·쌍곡선 표준형과 초점·점근선을 이용하는 방식',
    keywords: ['포물선', '타원', '쌍곡선', '초점', '점근선', '이차곡선', '표준형', '준선'],
    exampleUtterances: [
      '타원 표준형으로 초점 구했어요',
      '쌍곡선 점근선 공식 썼어요',
      '포물선 표준형으로 꼭짓점 찾았어요',
    ],
    followupLabel: '이차곡선 표준형을 활용함',
  },
  limit: {
    id: 'limit',
    labelKo: '극한',
    summary: '0/0·∞/∞ 부정형을 인수분해·유리화로 처리하는 방식',
    keywords: ['극한', 'lim', '0/0', '무한대', '인수분해', '부정형', '최고차항', '유리화'],
    exampleUtterances: [
      '0/0 꼴을 인수분해로 약분했어요',
      '∞/∞ 꼴에서 최고차항으로 나눴어요',
      '분자 유리화해서 극한값 구했어요',
    ],
    followupLabel: '극한값을 계산함',
  },
  vector: {
    id: 'vector',
    labelKo: '벡터',
    summary: '벡터의 합·내적·크기 계산 또는 벡터로 도형 조건을 식으로 세우는 방식',
    keywords: ['벡터', '내적', '크기', '방향', '단위벡터', '위치벡터', '성분'],
    exampleUtterances: [
      '두 벡터의 내적을 구했어요',
      '벡터의 크기로 조건을 세웠어요',
      '위치벡터로 좌표를 구했어요',
    ],
    followupLabel: '벡터 연산을 활용함',
  },
  probability: {
    id: 'probability',
    labelKo: '확률',
    summary: '조건부확률, 독립·종속 사건, 여사건을 이용하여 확률을 구하는 방식',
    keywords: ['확률', '조건부확률', '독립', '여사건', '경우의 수', 'P(A)'],
    exampleUtterances: [
      '조건부확률 공식으로 P(A|B)를 구했어요',
      '여사건을 이용해서 계산했어요',
      '독립 사건 곱의 법칙을 썼어요',
    ],
    followupLabel: '확률 공식을 적용함',
  },
  space_geometry: {
    id: 'space_geometry',
    labelKo: '공간기하',
    summary: '공간에서 직선·평면의 위치 관계, 정사영, 이면각을 다루는 방식',
    keywords: ['공간', '정사영', '평면', '직선', '이면각', '수선', '좌표공간'],
    exampleUtterances: [
      '정사영으로 두 평면이 이루는 각을 구했어요',
      '직선과 평면의 위치 관계를 따져봤어요',
      '공간좌표를 설정해서 풀었어요',
    ],
    followupLabel: '공간기하 성질을 활용함',
  },
  function: {
    id: 'function',
    labelKo: '함수',
    summary: '역함수·합성함수, 전사·단사 조건, 그래프 분석으로 푸는 방식',
    keywords: ['역함수', '합성함수', '전사', '단사', '정의역', '치역', '함수 조건'],
    exampleUtterances: [
      '역함수를 구해서 대입했어요',
      '합성함수 (f∘g)(x)를 계산했어요',
      '전사 단사 조건을 확인했어요',
    ],
    followupLabel: '함수 성질을 분석함',
  },
  statistics: {
    id: 'statistics',
    labelKo: '통계',
    summary: '정규분포 표준화, 이항분포 공식, 표준정규분포표를 활용하는 방식',
    keywords: ['정규분포', '이항분포', '표준화', '평균', '분산', '표준편차', '확률변수'],
    exampleUtterances: [
      'Z=(X-μ)/σ로 표준화해서 확률을 구했어요',
      '이항분포 B(n,p) 공식을 썼어요',
      '표준정규분포표에서 확률값을 읽었어요',
    ],
    followupLabel: '통계 분포를 활용함',
  },
  geometry: {
    id: 'geometry',
    labelKo: '도형',
    summary: '피타고라스 정리, 보조선, 삼각비로 변의 길이·넓이를 구하는 방식',
    keywords: ['피타고라스', '삼각비', '보조선', '직각삼각형', 'sin', 'cos', 'tan', '넓이'],
    exampleUtterances: [
      '피타고라스 정리로 빗변 길이를 구했어요',
      '보조선을 그어서 직각삼각형을 만들었어요',
      '삼각비로 높이를 구했어요',
    ],
    followupLabel: '도형 성질을 활용함',
  },
  permutation: {
    id: 'permutation',
    labelKo: '순열·조합',
    summary: '순열·조합 공식, 중복·제한 조건, 원순열을 이용하는 방식',
    keywords: ['순열', '조합', '중복', '원순열', 'P(n,r)', 'C(n,r)', '나열'],
    exampleUtterances: [
      '조합 C(n,r) 공식으로 가짓수를 구했어요',
      '원순열 공식을 써서 배열 수를 계산했어요',
      '중복 조합으로 풀었어요',
    ],
    followupLabel: '순열·조합을 적용함',
  },
  sequence_limit: {
    id: 'sequence_limit',
    labelKo: '수열의 극한',
    summary: '수열의 수렴·발산 판단, ∞/∞ 꼴 처리, 등비수열 극한을 다루는 방식',
    keywords: ['수열의 극한', '수렴', '발산', '등비수열', 'lim', '극한값', '무한등비급수'],
    exampleUtterances: [
      '수열이 수렴하는지 발산하는지 확인했어요',
      '∞/∞ 꼴을 최고차항으로 나눠서 극한값을 구했어요',
      '등비수열 극한 조건 |r|<1로 판단했어요',
    ],
    followupLabel: '수열의 극한을 계산함',
  },
  integral_advanced: {
    id: 'integral_advanced',
    labelKo: '심화 적분',
    summary: '치환적분·부분적분, 정적분 넓이 계산, 미적분 기본정리를 이용하는 방식',
    keywords: ['치환적분', '부분적분', '정적분', '넓이', '미적분 관계', '절댓값'],
    exampleUtterances: [
      '치환적분으로 변수를 바꿔서 계산했어요',
      '정적분으로 넓이를 구하는데 절댓값 처리가 막혔어요',
      '∫f(t)dt를 미분하는 관계식을 썼어요',
    ],
    followupLabel: '심화 적분을 활용함',
  },
  diff_advanced: {
    id: 'diff_advanced',
    labelKo: '심화 미분',
    summary: '합성함수 미분(chain rule), 극값·최솟값 탐색, 접선 방정식을 다루는 방식',
    keywords: ['합성함수 미분', 'chain rule', '극값', '최솟값', '접선', '도함수'],
    exampleUtterances: [
      '합성함수 chain rule을 써서 미분했어요',
      '극값을 찾아서 최솟값을 구했어요',
      '접선의 방정식을 미분으로 구했어요',
    ],
    followupLabel: '심화 미분을 활용함',
  },
};

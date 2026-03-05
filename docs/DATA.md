# DASIDA — 데이터 구조 정의
> problemData, practiceMap, diagnosisMap 전체 명세
> 마지막 업데이트: 2026.03.05

---

## 1. diagnosisMap (약점 태그 9개)
> 키값 절대 변경 금지 — 모든 화면이 이 키를 참조함

```ts
// data/diagnosisMap.ts
export const diagnosisMap: Record<string, string> = {
  '공식 이해 부족':       '완전제곱식 변환 원리 미숙',
  '계산 실수 반복':       '개념은 알지만 계산 과정 실수',
  '최솟값 읽기 혼동':     '(x-a)²+b에서 b vs a 혼동',
  '공식 암기 부족':       '꼭짓점 공식 -b/2a 불안정',
  '계수 구분 혼동':       'a, b, c 부호 포함 읽기 실수',
  '미분 계산 부족':       'xⁿ → nxⁿ⁻¹ 규칙 불안정',
  '풀이 순서 혼동':       "f'(x)=0 → 대입 순서 누락",
  '최댓값/최솟값 판단 혼동': 'a 부호로 판별 못함',
  '기초 개념 학습 필요':  '이차함수 최솟값 개념 미숙',
};
```

---

## 2. problemData (문제 10개)
> 고1 공통수학 기반 (추후 수능 공통과목으로 교체 예정)

```ts
// data/problemData.ts
export type Problem = {
  id: number;
  question: string;
  choices: string[];   // 5지선다
  answer: string;      // 정답 텍스트
  topic: string;       // 단원명
};

export const problemData: Problem[] = [
  // 문제 10개 작성 예정
  // 예시 구조:
  {
    id: 1,
    question: 'f(x) = x² - 4x + 5의 최솟값은?',
    choices: ['① 1', '② 2', '③ 3', '④ 4', '⑤ 5'],
    answer: '① 1',
    topic: '이차함수의 최솟값',
  },
  // ... 9개 더
];
```

**교체 시 주의:** 구조(타입) 그대로 유지하고 내용만 교체.

---

## 3. practiceMap (약점별 연습문제 9개)
> MVP: 하드코딩. 추후 AI 실시간 생성으로 교체 가능.

```ts
// data/practiceMap.ts
export type PracticeItem = {
  question: string;
  choices: string[];   // 5지선다
  answer: string;      // 정답 텍스트
  hint: string;
};

export const practiceMap: Record<string, PracticeItem> = {
  '공식 이해 부족': {
    question: '다음 중 x² - 6x + 9를 완전제곱식으로 바르게 변환한 것은?',
    choices: ['① (x-3)²', '② (x+3)²', '③ (x-3)²+0', '④ (x-6)²+9', '⑤ (x-9)²'],
    answer: '① (x-3)²',
    hint: 'x² - 2ax + a² = (x-a)² 공식을 활용하세요.',
  },
  '계산 실수 반복': {
    question: 'f(x) = -x² + 4x - 1에서 f(3)의 값은?',
    choices: ['① 1', '② 2', '③ -2', '④ -1', '⑤ 3'],
    answer: '② 2',
    hint: '부호에 주의하여 대입하세요. -（3）² = -9입니다.',
  },
  '최솟값 읽기 혼동': {
    question: 'f(x) = (x-2)² + 3의 최솟값은?',
    choices: ['① 2', '② 3', '③ 5', '④ -2', '⑤ 0'],
    answer: '② 3',
    hint: '(x-a)²+b 형태에서 최솟값은 b, 최솟값을 갖는 x는 a입니다.',
  },
  '공식 암기 부족': {
    question: 'f(x) = 2x² - 8x + 5의 꼭짓점 x좌표는?',
    choices: ['① 1', '② 2', '③ 3', '④ 4', '⑤ -2'],
    answer: '② 2',
    hint: '꼭짓점 x좌표 = -b/2a. a=2, b=-8을 대입하세요.',
  },
  '계수 구분 혼동': {
    question: 'f(x) = -3x² + 6x - 2에서 a, b, c의 값으로 옳은 것은?',
    choices: ['① a=-3, b=6, c=-2', '② a=3, b=6, c=2', '③ a=-3, b=-6, c=2', '④ a=3, b=-6, c=-2', '⑤ a=-3, b=6, c=2'],
    answer: '① a=-3, b=6, c=-2',
    hint: 'f(x) = ax² + bx + c 형태에서 각 항의 계수를 부호 포함해서 읽으세요.',
  },
  '미분 계산 부족': {
    question: "f(x) = x³ - 3x² + 2x일 때 f'(x)는?",
    choices: ["① 3x²-6x+2", "② x²-6x+2", "③ 3x²-3x+2", "④ 3x³-6x+2", "⑤ 3x²+6x+2"],
    answer: "① 3x²-6x+2",
    hint: 'xⁿ을 미분하면 nxⁿ⁻¹. 각 항을 순서대로 미분하세요.',
  },
  '풀이 순서 혼동': {
    question: "f(x) = x² - 4x + 3의 최솟값을 구하는 순서로 옳은 것은?",
    choices: [
      "① f'(x)=0 풀기 → x값 대입 → 최솟값 확인",
      "② x값 대입 → f'(x)=0 풀기",
      "③ 최솟값 먼저 확인 → x 계산",
      "④ b/2a 계산 → 최솟값 대입",
      "⑤ 순서 없이 계산"
    ],
    answer: "① f'(x)=0 풀기 → x값 대입 → 최솟값 확인",
    hint: "먼저 f'(x)=0으로 극값의 x를 구하고, 그 x를 f(x)에 대입합니다.",
  },
  '최댓값/최솟값 판단 혼동': {
    question: 'f(x) = -2x² + 4x - 1의 그래프는?',
    choices: ['① 아래로 볼록, 최솟값 존재', '② 위로 볼록, 최댓값 존재', '③ 아래로 볼록, 최댓값 존재', '④ 위로 볼록, 최솟값 존재', '⑤ 판단 불가'],
    answer: '② 위로 볼록, 최댓값 존재',
    hint: 'a < 0이면 위로 볼록(∩) → 최댓값 존재. a > 0이면 아래로 볼록(∪) → 최솟값 존재.',
  },
  '기초 개념 학습 필요': {
    question: 'f(x) = (x-1)² + 2에 대한 설명으로 옳은 것은?',
    choices: ['① 최솟값은 1이다', '② 최솟값은 2이다', '③ x=2일 때 최솟값', '④ 최댓값은 2이다', '⑤ 최솟값이 없다'],
    answer: '② 최솟값은 2이다',
    hint: '(x-a)²은 항상 0 이상이므로, 전체 식의 최솟값은 x=a일 때 상수 b입니다.',
  },
};
```

---

## 데이터 교체 계획

| 시점 | 교체 파일 | 내용 |
|------|-----------|------|
| 지금 (MVP) | — | 고1 공통수학 데이터 사용 |
| 1차 확장 | `problemData.ts` + `practiceMap.ts` | 수능 공통과목으로 교체 |
| 2차 확장 | 동일 | 선택과목 추가 |

**교체 시 절대 변경 금지:** `diagnosisMap.ts`의 키값

import type { SolveMethodId } from './diagnosisTree';

export type Problem = {
  id: string;
  question: string;
  choices: string[];
  answerIndex: number;
  topic: string;
  diagnosisMethods: SolveMethodId[];
};

export const problemData: Problem[] = [
  {
    id: 'q1',
    question: 'sqrt(75) - 6/sqrt(3) + sqrt(48)의 값은?',
    choices: ['5√3', '7√3', '9√3', '11√3', '13√3'],
    answerIndex: 1,
    topic: '무리수/실수',
    diagnosisMethods: ['unknown'],
  },
  {
    id: 'q2',
    question:
      '(2x + 3)(x - 4) - (x + 1)(x - 5)를 전개하여 정리한 식에서 x의 계수와 상수항의 합은?',
    choices: ['-12', '-8', '-4', '2', '6'],
    answerIndex: 1,
    topic: '다항식의 연산',
    diagnosisMethods: ['unknown'],
  },
  {
    id: 'q3',
    question: '(1 + 3i)(2 - i) - (1 - i)^2의 값이 a + bi일 때, a + b의 값은?',
    choices: ['6', '8', '10', '12', '14'],
    answerIndex: 3,
    topic: '복소수',
    diagnosisMethods: ['unknown'],
  },
  {
    id: 'q4',
    question: '이차방정식 2x^2 - 6x + k = 0의 두 근의 차가 4일 때, 상수 k의 값은?',
    choices: ['-9/2', '-7/2', '-5/2', '5/2', '7/2'],
    answerIndex: 1,
    topic: '이차방정식',
    diagnosisMethods: ['factoring', 'quadratic', 'unknown'],
  },
  {
    id: 'q5',
    question:
      'P(x)를 (x - 2)로 나눈 나머지가 11, (x + 1)로 나눈 나머지가 2일 때, (x - 2)(x + 1)로 나눈 나머지 R(x)=ax+b에서 a×b의 값은?',
    choices: ['5', '10', '12', '15', '18'],
    answerIndex: 3,
    topic: '나머지정리',
    diagnosisMethods: ['unknown'],
  },
  {
    id: 'q6',
    question:
      'x^2 - 5x + 4 <= 0을 만족하는 정수의 개수를 m, x^2 + 2x - 8 > 0을 만족하는 정수(-5 이상 5 이하)의 개수를 n이라 할 때 m + n의 값은?',
    choices: ['5', '7', '8', '9', '10'],
    answerIndex: 2,
    topic: '이차부등식',
    diagnosisMethods: ['factoring', 'unknown'],
  },
  {
    id: 'q7',
    question:
      '1부터 6까지 숫자 카드에서 3장을 뽑아 세 자리 자연수를 만들 때, 홀수인 경우의 수는?',
    choices: ['24', '36', '48', '60', '72'],
    answerIndex: 3,
    topic: '경우의 수',
    diagnosisMethods: ['unknown'],
  },
  {
    id: 'q8',
    question:
      'x^2 - 6x + k = 0과 x^2 + 2x - k + 4 = 0이 모두 실근을 가지도록 하는 정수 k의 개수는?',
    choices: ['3', '5', '7', '8', '10'],
    answerIndex: 2,
    topic: '이차방정식',
    diagnosisMethods: ['factoring', 'quadratic', 'unknown'],
  },
  {
    id: 'q9',
    question:
      '이차함수 f(x) = -x^2 + 2ax + b가 x=3에서 최댓값 12를 가질 때, f(5)의 값은?',
    choices: ['0', '4', '8', '12', '16'],
    answerIndex: 2,
    topic: '이차함수',
    diagnosisMethods: ['cps', 'vertex', 'diff', 'unknown'],
  },
  {
    id: 'q10',
    question:
      '1,2,3,4,5가 적힌 공 5개에서 2개를 꺼내 큰 수를 a, 작은 수를 b라 할 때, x^2 - ax + b = 0이 서로 다른 두 양의 실근을 가지는 경우의 수는?',
    choices: ['5', '6', '7', '9', '10'],
    answerIndex: 3,
    topic: '경우의 수/이차방정식',
    diagnosisMethods: ['factoring', 'quadratic', 'unknown'],
  },
];

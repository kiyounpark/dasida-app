export type ChallengeProblem = {
  id: string;
  question: string;
  choices: string[];
  answerIndex: number;
  hint: string;
  explanation: string;
};

export const challengeProblem: ChallengeProblem = {
  id: 'challenge_1',
  question: 'f(x)=x^2-10x+29의 최솟값은?',
  choices: ['2', '3', '4', '5', '10'],
  answerIndex: 2,
  hint: '완전제곱식으로 바꾸거나 꼭짓점 x=5를 구해 대입하세요.',
  explanation: 'f(x)=(x-5)^2+4 이므로 최솟값은 4입니다.',
};

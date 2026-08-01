import { makeCandidate } from './__fixtures__/analysis';
import { readCheckQuiz, readRetryQuiz } from './quiz-guard';

describe('readCheckQuiz', () => {
  it('정상 응답이면 그대로 읽어낸다', () => {
    expect(readCheckQuiz(makeCandidate())).toMatchObject({
      prompt: '뭘 더하고 빼야 할까?',
      answerIndex: 1,
    });
  });

  it('정답 번호가 보기 밖이면 null — 그대로 두면 정답이 "undefined"로 노출된다', () => {
    expect(readCheckQuiz(makeCandidate({ checkAnswerIndex: 3 }))).toBeNull();
  });

  it('보기가 하나뿐이면 null', () => {
    expect(readCheckQuiz(makeCandidate({ checkOptions: ['하나뿐'] }))).toBeNull();
  });

  it('상황 칸(checkSetup)은 없어도 된다 — 질문이 그 자체로 완결일 수 있다', () => {
    expect(readCheckQuiz(makeCandidate({ checkSetup: undefined }))?.setup).toBeUndefined();
  });
});

describe('readRetryQuiz', () => {
  it('정상 응답이면 그대로 읽어낸다', () => {
    expect(readRetryQuiz(makeCandidate())).toMatchObject({
      setup: '이번엔 x^2 + 10x 야.',
      answerIndex: 0,
    });
  });

  it('상황 칸이 없으면 null — 재도전은 새 숫자를 깔아야 성립한다', () => {
    expect(readRetryQuiz(makeCandidate({ retrySetup: undefined }))).toBeNull();
  });

  it('보기가 통째로 없으면 null', () => {
    expect(readRetryQuiz(makeCandidate({ retryOptions: undefined }))).toBeNull();
  });

  it('정답 번호가 정수가 아니면 null', () => {
    expect(readRetryQuiz(makeCandidate({ retryAnswerIndex: 1.5 }))).toBeNull();
  });

  it('후보 자체가 없으면 null', () => {
    expect(readRetryQuiz(undefined)).toBeNull();
  });
});

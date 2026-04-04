// functions/tests/review-feedback.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';

function buildUserContent(params: {
  stepTitle: string;
  stepBody: string;
  selectedChoiceText: string | null;
  userText: string | null;
}): string {
  return [
    `단계: ${params.stepTitle}`,
    `설명: ${params.stepBody}`,
    params.selectedChoiceText ? `학생이 선택한 답: ${params.selectedChoiceText}` : '',
    params.userText ? `학생이 직접 쓴 내용: ${params.userText}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

test('선택지 있을 때 선택지 텍스트가 포함된다', () => {
  const result = buildUserContent({
    stepTitle: 'a, b, c 부호 확인',
    stepBody: 'ax²+bx+c에서 각 계수를 부호 포함해서 먼저 읽는다.',
    selectedChoiceText: '음수 부호를 빠뜨리면 결과가 달라지니까',
    userText: null,
  });
  assert.ok(result.includes('학생이 선택한 답: 음수 부호를 빠뜨리면'));
  assert.ok(!result.includes('학생이 직접 쓴 내용'));
});

test('자유 입력만 있을 때 userText가 포함된다', () => {
  const result = buildUserContent({
    stepTitle: 'b² 먼저, 4ac 나중',
    stepBody: 'b²를 먼저 계산한다.',
    selectedChoiceText: null,
    userText: '단순한 것부터 계산하는 게 실수를 줄이기 때문입니다',
  });
  assert.ok(result.includes('학생이 직접 쓴 내용'));
  assert.ok(!result.includes('학생이 선택한 답'));
});

test('선택지와 자유 입력 모두 있으면 둘 다 포함된다', () => {
  const result = buildUserContent({
    stepTitle: '빼고 나서 판단',
    stepBody: '부호를 보고 근의 개수를 판단한다.',
    selectedChoiceText: '부호만 보면 된다',
    userText: '추가로 더 생각해보면...',
  });
  assert.ok(result.includes('학생이 선택한 답'));
  assert.ok(result.includes('학생이 직접 쓴 내용'));
});

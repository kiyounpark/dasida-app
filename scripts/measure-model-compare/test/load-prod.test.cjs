// 운영 소스를 디스크 컴파일·SDK 실행 없이 읽는지 확인한다.
// 사용: node --test 'scripts/measure-model-compare/test/*.test.cjs'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadProd } = require('../load-prod.cjs');

test('운영 프롬프트·스키마·문맥과 실제 카드 정화를 읽는다', () => {
  const prod = loadProd({ repoRoot: path.resolve(__dirname, '../../..') });
  assert.equal(prod.prompt.split('\n')[0], '당신은 한국 수능 수학 오답 사진 분석기입니다.');
  assert.ok(prod.prompt.includes('ok가 false인 줄은 짚기 전에 그 뒤 줄을 보세요'));
  assert.equal(prod.schema.required.length, 10);
  assert.ok(prod.methodContext.startsWith('허용된 풀이법 id: '));
  assert.match(prod.promptSha256, /^[a-f0-9]{64}$/);
  assert.match(prod.gitHead, /^[a-f0-9]{40}$/);
  assert.equal(typeof prod.functionsSrcDirty, 'boolean');
  const router = prod.buildPhotoRouterResult({
    hasSolvingWork: true, predictedMethodId: 'linear_eq', confidence: 1,
    candidateMethodIds: ['linear_eq'], errorConfidence: 1,
    errorCandidates: [{ quote: 'x=3', why: '부호', fix: '옮기면 → 표시',
      mistakeType: 'calc_slip', checkPrompt: '어느 항?', checkOptions: ['1', '2'], checkAnswerIndex: 0 }],
  });
  assert.deepEqual(router.errorCandidates, []);
});

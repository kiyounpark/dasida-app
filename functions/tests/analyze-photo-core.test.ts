import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPhotoRouterResult, buildMethodContextText } from '../src/analyze-photo-core';

test('확신 높은 결과는 needsManualSelection=false', () => {
  const result = buildPhotoRouterResult({
    hasSolvingWork: true,
    userAnswer: '3',
    transcription: '판별식 D>0 확인 후 근의 공식 대입',
    predictedMethodId: 'quadratic',
    confidence: 0.9,
    candidateMethodIds: ['quadratic'],
    reason: 'formula visible',
  });
  assert.equal(result.predictedMethodId, 'quadratic');
  assert.equal(result.needsManualSelection, false);
});

test('confidence 0.74 미만이면 needsManualSelection=true', () => {
  const result = buildPhotoRouterResult({
    hasSolvingWork: true,
    userAnswer: null,
    transcription: '식 몇 줄',
    predictedMethodId: 'quadratic',
    confidence: 0.5,
    candidateMethodIds: ['quadratic', 'factoring'],
    reason: 'ambiguous',
  });
  assert.equal(result.needsManualSelection, true);
  assert.deepEqual(result.candidateMethodIds, ['quadratic', 'factoring']);
});

test('허용 밖 methodId는 unknown으로 강등', () => {
  const result = buildPhotoRouterResult({
    hasSolvingWork: true,
    userAnswer: '2',
    transcription: '적당한 풀이',
    predictedMethodId: 'made_up_method',
    confidence: 0.95,
    candidateMethodIds: ['made_up_method', 'diff'],
    reason: 'x',
  });
  assert.equal(result.predictedMethodId, 'unknown');
  assert.equal(result.needsManualSelection, true);
  assert.deepEqual(result.candidateMethodIds, ['diff']);
});

test('풀이 흔적 없으면 confidence 높아도 needsManualSelection=true', () => {
  const result = buildPhotoRouterResult({
    hasSolvingWork: false,
    userAnswer: '5',
    transcription: '',
    predictedMethodId: 'diff',
    confidence: 0.9,
    candidateMethodIds: ['diff'],
    reason: 'no work shown',
  });
  assert.equal(result.needsManualSelection, true);
});

test('카탈로그 컨텍스트에 unknown은 빠지고 labelKo가 들어간다', () => {
  const text = buildMethodContextText();
  assert.ok(text.includes('근의 공식'));
  assert.ok(!text.includes('id: unknown'));
});

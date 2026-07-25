import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPhotoRouterResult,
  buildMethodContextText,
  sanitizeErrorCandidates,
  MISTAKE_TYPE_IDS,
} from '../src/analyze-photo-core';

test('확신 높은 결과는 needsManualSelection=false', () => {
  const result = buildPhotoRouterResult({
    hasSolvingWork: true,
    userAnswer: '3',
    transcription: '판별식 D>0 확인 후 근의 공식 대입',
    predictedMethodId: 'quadratic',
    confidence: 0.9,
    candidateMethodIds: ['quadratic'],
    reason: 'formula visible',
    errorCandidates: [],
    errorConfidence: 0,
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
    errorCandidates: [],
    errorConfidence: 0,
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
    errorCandidates: [],
    errorConfidence: 0,
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
    errorCandidates: [],
    errorConfidence: 0,
  });
  assert.equal(result.needsManualSelection, true);
});

test('confidence 정확히 0.74(경계값)는 needsManualSelection=false', () => {
  const result = buildPhotoRouterResult({
    hasSolvingWork: true,
    userAnswer: '1',
    transcription: '풀이',
    predictedMethodId: 'diff',
    confidence: 0.74,
    candidateMethodIds: ['diff'],
    reason: 'boundary',
    errorCandidates: [],
    errorConfidence: 0,
  });
  assert.equal(result.needsManualSelection, false);
});

test('예측·후보 전부 허용 밖이면 후보가 [unknown]으로 수렴', () => {
  const result = buildPhotoRouterResult({
    hasSolvingWork: true,
    userAnswer: null,
    transcription: '뭔가 씀',
    predictedMethodId: 'made_up',
    confidence: 0.9,
    candidateMethodIds: ['also_fake', 'still_fake'],
    reason: 'hallucination',
    errorCandidates: [],
    errorConfidence: 0,
  });
  assert.deepEqual(result.candidateMethodIds, ['unknown']);
  assert.equal(result.needsManualSelection, true);
});

test('카탈로그 컨텍스트에 unknown은 빠지고 labelKo가 들어간다', () => {
  const text = buildMethodContextText();
  assert.ok(text.includes('근의 공식'));
  assert.ok(!text.includes('id: unknown'));
});

const validCandidate = {
  quote: '= 3 ± 2√5',
  why: '√20을 2로 나누면 반으로 줄인 √5가 되어야 하는데 2를 곱했어.',
  mistakeType: 'calc_slip',
  fix: '계산을 한 단계 한 줄로 끊어 쓰자.',
  checkPrompt: '√36을 2로 나누면?',
  checkOptions: ['3', '√18', '6'],
  checkAnswerIndex: 0,
};

test('sanitizeErrorCandidates: 유효 후보는 통과, 최대 2개', () => {
  const out = sanitizeErrorCandidates([validCandidate, validCandidate, validCandidate], true);
  assert.equal(out.length, 2);
  assert.equal(out[0].mistakeType, 'calc_slip');
});

test('sanitizeErrorCandidates: 6종 밖 유형·빈 인용·보기 3개 아님·인덱스 초과는 탈락', () => {
  assert.equal(sanitizeErrorCandidates([{ ...validCandidate, mistakeType: 'lazy' }], true).length, 0);
  assert.equal(sanitizeErrorCandidates([{ ...validCandidate, quote: '  ' }], true).length, 0);
  assert.equal(sanitizeErrorCandidates([{ ...validCandidate, checkOptions: ['3'] }], true).length, 0);
  assert.equal(sanitizeErrorCandidates([{ ...validCandidate, checkAnswerIndex: 3 }], true).length, 0);
});

test('sanitizeErrorCandidates: 풀이 흔적 없으면 무조건 빈 배열', () => {
  assert.equal(sanitizeErrorCandidates([validCandidate], false).length, 0);
});

test('MISTAKE_TYPE_IDS는 정확히 6종', () => {
  assert.deepEqual([...MISTAKE_TYPE_IDS], [
    'concept_gap', 'formula_recall', 'setup_error',
    'calc_slip', 'procedure_miss', 'answer_read',
  ]);
});

test('sanitizeErrorCandidates: 배열 안 null·비객체는 던지지 않고 건너뛴다', () => {
  assert.equal(sanitizeErrorCandidates([null], true).length, 0);
  assert.equal(sanitizeErrorCandidates([null, validCandidate], true).length, 1);
  assert.equal(sanitizeErrorCandidates([undefined, 'x', 42, []], true).length, 0);
});

test('sanitizeErrorCandidates: 보기에 빈 값이 섞이면 정답 인덱스가 밀리므로 탈락', () => {
  assert.equal(
    sanitizeErrorCandidates(
      [{ ...validCandidate, checkOptions: ['', 'a', 'b', 'c'], checkAnswerIndex: 1 }],
      true,
    ).length,
    0,
  );
});

test('errorConfidence: 후보가 살아남으면 통과, 전부 탈락하면 0', () => {
  const kept = buildPhotoRouterResult({
    hasSolvingWork: true, userAnswer: '3', transcription: '풀이',
    predictedMethodId: 'quadratic', confidence: 0.9, candidateMethodIds: ['quadratic'],
    reason: 'r', errorCandidates: [validCandidate], errorConfidence: 0.9,
  });
  assert.equal(kept.errorCandidates.length, 1);
  assert.equal(kept.errorConfidence, 0.9);

  const dropped = buildPhotoRouterResult({
    hasSolvingWork: true, userAnswer: '3', transcription: '풀이',
    predictedMethodId: 'quadratic', confidence: 0.9, candidateMethodIds: ['quadratic'],
    reason: 'r', errorCandidates: [{ ...validCandidate, mistakeType: 'lazy' }], errorConfidence: 0.9,
  });
  assert.equal(dropped.errorCandidates.length, 0);
  assert.equal(dropped.errorConfidence, 0);
});

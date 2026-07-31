import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPhotoRouterResult,
  buildMethodContextText,
  sanitizeErrorCandidates,
  MISTAKE_TYPE_IDS,
} from '../src/analyze-photo-core';
import { PHOTO_ANALYSIS_SCHEMA } from '../src/openai-client';

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

const validRetry = {
  retrySetup: '이번엔 √50을 3으로 나누는 상황이야.',
  retryPrompt: '여기서 다음 한 수는?',
  retryOptions: ['5√2', '√50/3', '3√2'],
  retryAnswerIndex: 0,
};

test('sanitizeErrorCandidates: 유효한 retry 페이로드는 4개 필드 모두 유지', () => {
  const out = sanitizeErrorCandidates([{ ...validCandidate, ...validRetry }], true);
  assert.equal(out.length, 1);
  assert.equal(out[0].retrySetup, validRetry.retrySetup);
  assert.equal(out[0].retryPrompt, validRetry.retryPrompt);
  assert.deepEqual(out[0].retryOptions, validRetry.retryOptions);
  assert.equal(out[0].retryAnswerIndex, 0);
});

test('sanitizeErrorCandidates: retry 불량이어도 후보는 살고 retry 필드만 빠진다', () => {
  const allNull = sanitizeErrorCandidates(
    [{ ...validCandidate, retrySetup: null, retryPrompt: null, retryOptions: null, retryAnswerIndex: null }],
    true,
  );
  assert.equal(allNull.length, 1);
  assert.equal(allNull[0].quote, validCandidate.quote);
  assert.equal(allNull[0].checkAnswerIndex, validCandidate.checkAnswerIndex);
  assert.equal('retrySetup' in allNull[0], false);

  const shortOptions = sanitizeErrorCandidates(
    [{ ...validCandidate, ...validRetry, retryOptions: ['a', 'b'] }],
    true,
  );
  assert.equal(shortOptions.length, 1);
  assert.equal('retryOptions' in shortOptions[0], false);

  const badIndex = sanitizeErrorCandidates(
    [{ ...validCandidate, ...validRetry, retryAnswerIndex: 3 }],
    true,
  );
  assert.equal(badIndex.length, 1);
  assert.equal('retryAnswerIndex' in badIndex[0], false);

  const emptySetup = sanitizeErrorCandidates(
    [{ ...validCandidate, ...validRetry, retrySetup: '' }],
    true,
  );
  assert.equal(emptySetup.length, 1);
  assert.equal('retrySetup' in emptySetup[0], false);

  // 소수 인덱스: 범위 안이라 typeof 검사는 통과하지만 웹이 Number.isInteger로 되돌려보낸다
  const floatIndex = sanitizeErrorCandidates(
    [{ ...validCandidate, ...validRetry, retryAnswerIndex: 1.5 }],
    true,
  );
  assert.equal(floatIndex.length, 1);
  assert.equal('retryAnswerIndex' in floatIndex[0], false);
});

test('sanitizeErrorCandidates: retry 보기에 빈 값이 섞이면 정답 인덱스가 밀리므로 retry만 탈락', () => {
  // 인덱스 밀림 함정: 4개 중 빈 값 하나 → filter로 '고치면' 3개가 되어 정답 인덱스가 밀린다
  const shifted = sanitizeErrorCandidates(
    [{ ...validCandidate, ...validRetry, retryOptions: ['a', '', 'b', 'c'], retryAnswerIndex: 1 }],
    true,
  );
  assert.equal(shifted.length, 1);
  assert.equal('retryOptions' in shifted[0], false);
});

test('sanitizeErrorCandidates: retry는 전부 있거나 전부 없거나 — 반쪽 방출 금지', () => {
  // 모델이 앞 두 필드만 쓰고 포기하는 게 가장 흔한 실패 — 필드별로 흘리면 웹 hasRetry 검문소가 뚫린다
  const partial = sanitizeErrorCandidates(
    [{
      ...validCandidate,
      retrySetup: '새 상황', retryPrompt: '다음 한 수는?',
      retryOptions: null, retryAnswerIndex: null,
    }],
    true,
  );
  assert.equal(partial.length, 1); // 후보 자체는 살아야 한다
  for (const key of ['retrySetup', 'retryPrompt', 'retryOptions', 'retryAnswerIndex']) {
    assert.equal(key in partial[0], false);
  }
});

test('PHOTO_ANALYSIS_SCHEMA: strict 모드에서 properties와 required가 정확히 일치', () => {
  // strict: true는 properties의 모든 키가 required에도 있길 요구한다.
  // 선택 필드라고 required에서 빼면 빌드는 통과하고 실제 호출에서만 400 — 그래서 여기서 잠근다.
  assert.deepEqual(
    [...PHOTO_ANALYSIS_SCHEMA.required].sort(),
    Object.keys(PHOTO_ANALYSIS_SCHEMA.properties).sort(),
  );
  const items = PHOTO_ANALYSIS_SCHEMA.properties.errorCandidates.items;
  assert.deepEqual([...items.required].sort(), Object.keys(items.properties).sort());
});

test('sanitizeErrorCandidates: retry 키가 아예 없어도(기존 배포 형태) 그대로 통과', () => {
  const out = sanitizeErrorCandidates([validCandidate], true);
  assert.equal(out.length, 1);
  assert.equal('retrySetup' in out[0], false);
  assert.equal('retryPrompt' in out[0], false);
  assert.equal('retryOptions' in out[0], false);
  assert.equal('retryAnswerIndex' in out[0], false);
});

// 아래 3건: 2026-07-29 검증 배치(10장×3회)에서 실제로 학생 화면까지 나갔던 오염 보기 2종을 봉함.
// 보기 4개 이상을 3칸에 욱여넣다 두 표현이 구분자로 붙은 흔적 — 학생에겐 보기 하나가 두 개로 보인다.
test('sanitizeErrorCandidates: check 보기 오염이면 후보 탈락 (실측 2종)', () => {
  assert.equal(
    sanitizeErrorCandidates(
      [{ ...validCandidate, checkOptions: ['ar^2', 'ar^3', "ar^4','ar^5"] }],
      true,
    ).length,
    0,
  );
  assert.equal(
    sanitizeErrorCandidates(
      [{ ...validCandidate, checkOptions: ['6x(x-3)', 'x(3x-6)', '6x(x-3)」「x(3x-6)'] }],
      true,
    ).length,
    0,
  );
});

test('sanitizeErrorCandidates: retry 보기 오염이면 retry만 빠지고 후보는 산다', () => {
  const out = sanitizeErrorCandidates(
    [{ ...validCandidate, ...validRetry, retryOptions: ['ar, ar^3', 'ar^2, ar^4', "a, ar^2','a, ar^3"] }],
    true,
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].checkPrompt, validCandidate.checkPrompt);
  assert.equal('retryPrompt' in out[0], false);
});

// checkSetup(쪽지시험 상황 칸, 2026-07-30 신설): 있으면 유지, 없거나 null이어도 후보는 산다.
// 자기완결 위반(카드 밖 지칭) 9/21의 그릇 해결 — 재도전 retrySetup과 같은 패턴.
test('sanitizeErrorCandidates: checkSetup 있으면 유지, 없거나 null이면 필드만 생략', () => {
  const withSetup = sanitizeErrorCandidates(
    [{ ...validCandidate, checkSetup: '원래 식은 x²-4x+3이었다.' }],
    true,
  );
  assert.equal(withSetup.length, 1);
  assert.equal(withSetup[0].checkSetup, '원래 식은 x²-4x+3이었다.');

  const without = sanitizeErrorCandidates([validCandidate], true);
  assert.equal(without.length, 1);
  assert.equal('checkSetup' in without[0], false);

  const nullSetup = sanitizeErrorCandidates([{ ...validCandidate, checkSetup: null }], true);
  assert.equal(nullSetup.length, 1);
  assert.equal('checkSetup' in nullSetup[0], false);
});

test('sanitizeErrorCandidates: 정상 보기 안의 따옴표·쉼표는 오염으로 오인하지 않는다', () => {
  const quoted = sanitizeErrorCandidates(
    [{ ...validCandidate, checkOptions: ['"제곱"을 먼저 한다', '2로 나눈다', "'근'을 구한다"] }],
    true,
  );
  assert.equal(quoted.length, 1);

  const comma = sanitizeErrorCandidates(
    [{ ...validCandidate, ...validRetry, retryOptions: ['ar, ar^3', 'ar^2, ar^4', 'a, ar^2'] }],
    true,
  );
  assert.equal(comma.length, 1);
  assert.equal(comma[0].retryPrompt, validRetry.retryPrompt);
});

import type { AnalyzePhotoResult, ErrorCandidate } from '../../types';

/** 테스트용 오류 후보 한 개. 기본값은 쪽지시험·재도전이 둘 다 갖춰진 정상 응답. */
export function makeCandidate(overrides: Partial<ErrorCandidate> = {}): ErrorCandidate {
  return {
    quote: 'x^2 + 4x + 4',
    why: '완전제곱식을 만들 때 x계수 반의 제곱을 더했으면 같은 값을 빼줘야 해.',
    mistakeType: 'procedure_miss',
    fix: '더한 만큼 빼는 짝을 한 줄에 같이 쓰자.',
    checkSetup: 'x^2 + 6x 를 완전제곱식으로 바꾼다고 하자.',
    checkPrompt: '뭘 더하고 빼야 할까?',
    checkOptions: ['3을 더하고 뺀다', '9를 더하고 뺀다', '6을 더하고 뺀다'],
    checkAnswerIndex: 1,
    retrySetup: '이번엔 x^2 + 10x 야.',
    retryPrompt: '뭘 더하고 빼야 할까?',
    retryOptions: ['25를 더하고 뺀다', '10을 더하고 뺀다', '5를 더하고 뺀다'],
    retryAnswerIndex: 0,
    ...overrides,
  };
}

/** 테스트용 분석 결과. 기본값은 확신 높은 단언 갈래. */
export function makeResult(overrides: Partial<AnalyzePhotoResult> = {}): AnalyzePhotoResult {
  return {
    hasSolvingWork: true,
    userAnswer: null,
    transcription: '완전제곱식으로 묶어서 풀었다',
    predictedMethodId: 'cps',
    confidence: 0.9,
    candidateMethodIds: ['cps', 'vertex'],
    reason: '',
    needsManualSelection: false,
    errorCandidates: [],
    errorConfidence: 0,
    ...overrides,
  };
}

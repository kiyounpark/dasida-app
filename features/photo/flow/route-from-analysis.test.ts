import { makeCandidate, makeResult } from './__fixtures__/analysis';
import {
  canPointAtError,
  filterCandidates,
  firstSnippet,
  matchMethodsByKeywords,
  routeFromAnalysis,
} from './route-from-analysis';

describe('routeFromAnalysis — 네 갈래', () => {
  it('풀이 흔적이 없으면 다시 찍기로 간다', () => {
    expect(routeFromAnalysis(makeResult({ hasSolvingWork: false }))).toEqual({ kind: 'retake' });
  });

  it('확신이 높고 수동 선택이 필요 없으면 단언한다', () => {
    const route = routeFromAnalysis(makeResult());
    expect(route.kind).toBe('assert');
    expect(route).toMatchObject({ methodId: 'cps', label: '완전제곱식' });
  });

  it('수동 선택이 필요하고 확신이 중간이면 추측 확인으로 간다', () => {
    const route = routeFromAnalysis(
      makeResult({ needsManualSelection: true, confidence: 0.5 }),
    );
    expect(route.kind).toBe('soft-assert');
    expect(route).toMatchObject({ methodId: 'cps' });
  });

  it('수동 선택이 필요하고 확신이 하한 미만이면 후보 카드로 간다', () => {
    const route = routeFromAnalysis(
      makeResult({ needsManualSelection: true, confidence: 0.2 }),
    );
    expect(route).toEqual({ kind: 'candidates', methodIds: ['cps', 'vertex'] });
  });

  it('예측 방법이 unknown이면 단언하지 않고 후보로 넘긴다 — 카탈로그 드리프트 방어', () => {
    const route = routeFromAnalysis(makeResult({ predictedMethodId: 'unknown' }));
    expect(route).toEqual({ kind: 'candidates', methodIds: ['cps', 'vertex'] });
  });
});

describe('firstSnippet', () => {
  it('첫 문장만 잘라낸다', () => {
    expect(firstSnippet('완전제곱식으로 묶었다. 그다음 대입했다')).toBe('완전제곱식으로 묶었다');
  });

  it('40자를 넘으면 말줄임한다', () => {
    expect(firstSnippet('가'.repeat(50))).toBe(`${'가'.repeat(40)}…`);
  });

  it('빈 문자열이면 빈 문자열', () => {
    expect(firstSnippet('')).toBe('');
  });
});

describe('filterCandidates', () => {
  it('unknown과 이미 거절한 방법을 걸러낸다', () => {
    expect(filterCandidates(['cps', 'unknown', 'vertex'], ['cps'])).toEqual(['vertex']);
  });
});

describe('matchMethodsByKeywords', () => {
  it('풀이 내용의 키워드로 방법을 좁힌다', () => {
    expect(matchMethodsByKeywords('완전제곱식으로 묶었어요')).toContain('cps');
  });

  it('빈 텍스트면 빈 배열 — 막다른 길로 보내지 않고 호출부가 다음 폴백을 쓰게 한다', () => {
    expect(matchMethodsByKeywords('')).toEqual([]);
  });
});

describe('canPointAtError', () => {
  it('방법이 뒤집히면 주머니가 무효라 짚지 않는다', () => {
    const result = makeResult({ errorCandidates: [makeCandidate()], errorConfidence: 0.9 });
    expect(canPointAtError(result, 'vertex')).toBe(false);
  });

  it('자신감이 문턱 미만이면 짚지 않는다', () => {
    const result = makeResult({ errorCandidates: [makeCandidate()], errorConfidence: 0.4 });
    expect(canPointAtError(result, 'cps')).toBe(false);
  });

  it('주머니가 살아 있고 자신감이 문턱을 넘으면 짚는다', () => {
    const result = makeResult({ errorCandidates: [makeCandidate()], errorConfidence: 0.9 });
    expect(canPointAtError(result, 'cps')).toBe(true);
  });
});

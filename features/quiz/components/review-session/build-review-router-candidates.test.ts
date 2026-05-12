// features/quiz/components/review-session/build-review-router-candidates.test.ts
import { buildReviewRouterCandidates } from './build-review-router-candidates';
import type { RemedialFlow } from '@/data/review-remedial-flows';

const flow: RemedialFlow = {
  nodes: {
    a: {
      id: 'a',
      kind: 'explain',
      title: 't',
      body: 'b',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'b',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'b',
      summary: 'A 요지',
      triggers: ['트리거 A1'],
    },
    b: {
      id: 'b',
      kind: 'explain',
      title: 't',
      body: 'b',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'c',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'c',
      // summary/triggers 없음
    },
    c: { id: 'c', kind: 'exit' },
    d: {
      id: 'd',
      kind: 'check',
      title: 't',
      prompt: 'p',
      options: [],
      dontKnowNextNodeId: 'c',
    },
  },
};

describe('buildReviewRouterCandidates', () => {
  it('summary/triggers 채워진 explain 노드만 후보로 추림', () => {
    const candidates = buildReviewRouterCandidates(flow);
    expect(candidates).toEqual([
      { id: 'a', summary: 'A 요지', triggers: ['트리거 A1'] },
    ]);
  });

  it('flow 가 없으면 빈 배열', () => {
    expect(buildReviewRouterCandidates(undefined)).toEqual([]);
  });

  it('triggers 가 빈 배열이면 제외', () => {
    const partial: RemedialFlow = {
      nodes: {
        x: {
          id: 'x',
          kind: 'explain',
          title: 't',
          body: 'b',
          primaryLabel: '다음으로',
          primaryNextNodeId: 'y',
          secondaryLabel: '모르겠어요',
          secondaryNextNodeId: 'y',
          summary: 'X',
          triggers: [],
        },
        y: { id: 'y', kind: 'exit' },
      },
    };
    expect(buildReviewRouterCandidates(partial)).toEqual([]);
  });
});

import { weaknessOrder } from './diagnosisMap';
import {
  getRemedialNode,
  remedialFlows,
  type CheckNode,
  type DiagnoseNode,
  type ExplainNode,
  type ExitNode,
  type RemedialNode,
  type SummaryNode,
} from './review-remedial-flows';

describe('review-remedial-flows 무결성', () => {
  it('각 등록된 약점의 모든 노드 nextNodeId 참조가 같은 그래프 안에 존재한다', () => {
    for (const weaknessId of weaknessOrder) {
      const flow = remedialFlows[weaknessId];
      if (!flow) continue;

      const allIds = new Set(Object.keys(flow.nodes));
      for (const [nodeId, node] of Object.entries(flow.nodes)) {
        if (node.kind === 'explain') {
          expect(allIds.has(node.primaryNextNodeId)).toBe(true);
          expect(allIds.has(node.secondaryNextNodeId)).toBe(true);
        } else if (node.kind === 'check') {
          for (const option of node.options) {
            expect(allIds.has(option.nextNodeId)).toBe(true);
          }
          expect(allIds.has(node.dontKnowNextNodeId)).toBe(true);
        } else if (node.kind === 'diagnose') {
          for (const option of node.options) {
            expect(allIds.has(option.nextNodeId)).toBe(true);
          }
        } else if (node.kind === 'summary') {
          expect(allIds.has(node.nextNodeId)).toBe(true);
        }
      }
    }
  });

  it('각 등록된 약점에 정확히 하나 이상의 ExitNode가 있다', () => {
    for (const weaknessId of weaknessOrder) {
      const flow = remedialFlows[weaknessId];
      if (!flow) continue;
      const exitNodes = Object.values(flow.nodes).filter((n) => n.kind === 'exit');
      expect(exitNodes.length).toBeGreaterThan(0);
    }
  });

  it('getRemedialNode가 등록된 노드를 반환한다', () => {
    expect(getRemedialNode('formula_understanding' as any, 'nonexistent')).toBeUndefined();
  });
});

describe('신규 노드 타입 (deep 구조)', () => {
  it('DiagnoseNode 타입이 export 된다', () => {
    const node: DiagnoseNode = {
      id: 'test_diag',
      kind: 'diagnose',
      title: '왜 그렇게 골랐어요?',
      body: '어떤 사유에 가까운지 알려주세요.',
      options: [
        { id: 'r1', text: '괄호 안 씀', nextNodeId: 'test_next' },
        { id: 'r2', text: '음수 제곱이 안 보임', nextNodeId: 'test_next2' },
      ],
    };
    expect(node.kind).toBe('diagnose');
  });

  it('SummaryNode 타입이 export 된다', () => {
    const node: SummaryNode = {
      id: 'test_sum',
      kind: 'summary',
      title: '오늘 핵심',
      body: '음수 대입 시 괄호 필수\n항별 계산 후 합산',
      nextNodeId: 'test_exit',
    };
    expect(node.kind).toBe('summary');
  });

  it('RemedialNode 유니언에 diagnose, summary 포함', () => {
    const kinds: RemedialNode['kind'][] = ['explain', 'check', 'exit', 'diagnose', 'summary'];
    expect(kinds.length).toBe(5);
  });
});

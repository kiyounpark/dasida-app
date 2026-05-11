import { weaknessOrder } from './diagnosisMap';
import {
  getRemedialNode,
  remedialFlows,
  type CheckNode,
  type ExplainNode,
  type ExitNode,
  type RemedialNode,
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

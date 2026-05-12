import { weaknessOrder, type WeaknessId } from './diagnosisMap';
import { getReviewThinkingSteps, reviewContentMap } from './review-content-map';
import { remedialFlows } from './review-remedial-flows';

describe('review-content-map 콘텐츠 무결성', () => {
  it('콘텐츠가 있는 모든 약점의 선택지 feedback이 비어있지 않다', () => {
    for (const weaknessId of weaknessOrder) {
      const steps = getReviewThinkingSteps(weaknessId);
      if (!steps || steps.length === 0) continue;

      for (const step of steps) {
        for (const choice of step.choices) {
          expect(choice.feedback.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('review-content-map 신규 필드', () => {
  it('콘텐츠가 있는 모든 ThinkingStep이 고유한 id를 가진다', () => {
    const allIds: string[] = [];
    for (const weaknessId of weaknessOrder) {
      const steps = getReviewThinkingSteps(weaknessId);
      if (!steps || steps.length === 0) continue;
      for (const step of steps) {
        expect(typeof step.id).toBe('string');
        expect(step.id.length).toBeGreaterThan(0);
        allIds.push(step.id);
      }
    }
    const unique = new Set(allIds);
    expect(unique.size).toBe(allIds.length);
  });

  it('모든 오답 Choice는 remedialFlowStartNodeId를 가진다 (콘텐츠 작성된 약점만 검증)', () => {
    const authoredWeaknesses: string[] = ['formula_understanding'];
    for (const weaknessId of authoredWeaknesses) {
      const steps = getReviewThinkingSteps(weaknessId as any);
      for (const step of steps) {
        for (const choice of step.choices) {
          if (!choice.correct) {
            expect(typeof choice.remedialFlowStartNodeId).toBe('string');
            expect(choice.remedialFlowStartNodeId!.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});

describe('weaknessId membership (spec §2.1)', () => {
  const validIds = new Set<WeaknessId>(weaknessOrder);

  it('every weaknessId in review-content-map choices is in weaknessOrder', () => {
    const offenders: string[] = [];
    for (const [weaknessKey, content] of Object.entries(reviewContentMap)) {
      if (!content) continue;
      content.thinkingSteps.forEach((step, sIdx) => {
        step.choices.forEach((choice, cIdx) => {
          const id = choice.weaknessId;
          if (id !== undefined && !validIds.has(id)) {
            offenders.push(`${weaknessKey}.step${sIdx + 1}.choice${cIdx}=${id}`);
          }
        });
      });
    }
    expect(offenders).toEqual([]);
  });

  it('every weaknessId in remedial-flows nodes is in weaknessOrder', () => {
    const offenders: string[] = [];
    for (const [weaknessKey, flow] of Object.entries(remedialFlows)) {
      if (!flow) continue;
      for (const [nodeId, node] of Object.entries(flow.nodes)) {
        if (node.kind === 'explain') {
          const id = node.weaknessId;
          if (id !== undefined && !validIds.has(id)) {
            offenders.push(`${weaknessKey}.${nodeId}=${id}`);
          }
        }
        if (node.kind === 'check') {
          node.options.forEach((opt, oIdx) => {
            const id = opt.weaknessId;
            if (id !== undefined && !validIds.has(id)) {
              offenders.push(`${weaknessKey}.${nodeId}.opt${oIdx}=${id}`);
            }
          });
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('formula_understanding has weaknessId labels (spec §6, migration)', () => {
  it('at least one wrong choice in step1 has weaknessId', () => {
    const step1 = reviewContentMap.formula_understanding?.thinkingSteps[0];
    expect(step1).toBeDefined();
    if (!step1) return;
    const wrongChoices = step1.choices.filter((c) => !c.correct);
    const labeled = wrongChoices.filter((c) => c.weaknessId !== undefined);
    expect(labeled.length).toBeGreaterThan(0);
  });

  it('at least one check node option in fu_step1_A_check has weaknessId', () => {
    const flow = remedialFlows.formula_understanding;
    const node = flow?.nodes['fu_step1_A_check'];
    expect(node?.kind).toBe('check');
    if (node?.kind === 'check') {
      const labeled = node.options.filter((o) => o.weaknessId !== undefined);
      expect(labeled.length).toBeGreaterThan(0);
    }
  });
});

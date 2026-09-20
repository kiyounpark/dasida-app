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

  it('every correct:false choice has a weaknessId (spec 2026-05-17)', () => {
    const offenders: string[] = [];
    for (const [weaknessKey, content] of Object.entries(reviewContentMap)) {
      if (!content) continue;
      content.thinkingSteps.forEach((step, sIdx) => {
        step.choices.forEach((choice, cIdx) => {
          if (choice.correct === false && !choice.weaknessId) {
            offenders.push(`${weaknessKey}.step${sIdx + 1}.choice${cIdx}`);
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
  it('every wrong choice in formula_understanding has weaknessId', () => {
    const content = reviewContentMap.formula_understanding;
    expect(content).toBeDefined();
    if (!content) return;
    const unlabeled: string[] = [];
    content.thinkingSteps.forEach((step, sIdx) => {
      step.choices.forEach((choice, cIdx) => {
        if (!choice.correct && choice.weaknessId === undefined) {
          unlabeled.push(`step${sIdx + 1}.choice${cIdx}="${choice.text}"`);
        }
      });
    });
    expect(unlabeled).toEqual([]);
  });

  it('every check node wrong option in formula_understanding flow has weaknessId', () => {
    const flow = remedialFlows.formula_understanding;
    expect(flow).toBeDefined();
    if (!flow) return;
    const unlabeled: string[] = [];
    for (const [nodeId, node] of Object.entries(flow.nodes)) {
      if (node.kind !== 'check') continue;
      node.options.forEach((opt, oIdx) => {
        if (!opt.isCorrect && opt.weaknessId === undefined) {
          unlabeled.push(`${nodeId}.opt${oIdx}="${opt.text}"`);
        }
      });
    }
    expect(unlabeled).toEqual([]);
  });
});

/**
 * 이 파일의 다른 검사들은 전부 `steps.length === 0`이면 `continue`로 넘어간다.
 * 그래서 복습 단계가 통째로 없는 약점은 어느 검사에도 안 걸린다 —
 * 2026.09.19에 `g3_seq_sum_term`이 실제로 그렇게 들어갔다.
 *
 * 단계가 0개면 복습 화면이 `step`을 영영 못 잡는다. 지금은 안내 화면으로 빠지지만
 * (`review-session-screen-view.tsx`의 `totalSteps === 0` 가드) 그건 사고를 덜 아프게
 * 만든 것이지 없앤 게 아니다. 학생은 그 약점 복습을 못 한다.
 */
describe('복습 단계가 없는 약점', () => {
  // 아직 복습 콘텐츠를 안 만든 약점. **채우면 여기서 지운다.**
  // 새 약점을 여기 추가하는 것으로 검사를 통과시키지 마라 — 콘텐츠를 만들어라.
  const 아직_안_만든_것: readonly WeaknessId[] = [];

  it('알려진 것 말고는 모든 약점에 thinkingSteps가 있다', () => {
    const 빈_것 = weaknessOrder.filter((id) => getReviewThinkingSteps(id).length === 0);
    expect(빈_것).toEqual([...아직_안_만든_것]);
  });

  it('목록에 적어 둔 약점은 실제로 존재한다', () => {
    for (const id of 아직_안_만든_것) {
      expect(weaknessOrder).toContain(id);
    }
  });
});

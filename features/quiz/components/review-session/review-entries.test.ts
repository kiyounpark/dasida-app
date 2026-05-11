import {
  createStepCardEntry,
  createInputAreaEntry,
  createChoiceBubbleEntry,
  createFeedbackBannerEntry,
  createUserBubbleEntry,
  createAiBubbleEntry,
  createAiTypingEntry,
  createFallbackInputEntry,
  createRemedialNodeEntry,
  createDoneCtaEntry,
  lockAllEntries,
} from './review-entries';
import type { ExplainNode } from '@/data/review-remedial-flows';

describe('review-entries factories', () => {
  it('createStepCardEntry sets kind/stepIndex', () => {
    expect(createStepCardEntry(0)).toEqual({ kind: 'step-card', stepIndex: 0 });
  });

  it('createInputAreaEntry defaults interactive=true', () => {
    expect(createInputAreaEntry(2)).toEqual({
      kind: 'input-area',
      stepIndex: 2,
      interactive: true,
    });
  });

  it('createChoiceBubbleEntry carries correctness', () => {
    expect(createChoiceBubbleEntry(1, 'two halves', false)).toEqual({
      kind: 'choice-bubble',
      choiceIndex: 1,
      text: 'two halves',
      correct: false,
    });
  });

  it('createAiTypingEntry yields a non-interactive marker', () => {
    expect(createAiTypingEntry()).toEqual({ kind: 'ai-typing' });
  });

  it('createFallbackInputEntry sets turn and interactive', () => {
    expect(createFallbackInputEntry(2)).toEqual({
      kind: 'fallback-input',
      turn: 2,
      interactive: true,
    });
  });

  it('createRemedialNodeEntry wraps a node', () => {
    const node: ExplainNode = {
      id: 'n1',
      kind: 'explain',
      title: 't',
      body: 'b',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'n2',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'n3',
    };
    expect(createRemedialNodeEntry(node)).toEqual({
      kind: 'remedial-node',
      node,
      interactive: true,
    });
  });

  it('lockAllEntries sets interactive=false on every entry that supports it', () => {
    const input = [
      createInputAreaEntry(0),
      createAiBubbleEntry('hi'),
      createFallbackInputEntry(1),
    ];
    const out = lockAllEntries(input);
    expect(out[0]).toMatchObject({ interactive: false });
    expect(out[1]).toEqual({ kind: 'ai-bubble', text: 'hi' });
    expect(out[2]).toMatchObject({ interactive: false });
  });
});

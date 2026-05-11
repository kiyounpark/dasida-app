import {
  createNodeEntry,
  createUserBubbleEntry,
  createAiHelpInputEntry,
  createAiBubbleEntry,
  createAiHelpActionsEntry,
  createTransitionEntry,
  lockAllEntries,
} from './remedial-entries';

describe('remedial-entries 헬퍼', () => {
  it('createNodeEntry는 interactive=true로 시작한다', () => {
    const e = createNodeEntry({ id: 'a', kind: 'explain' } as any);
    expect(e.kind).toBe('node');
    expect(e.interactive).toBe(true);
  });

  it('lockAllEntries는 모든 entry의 interactive를 false로 만든다', () => {
    const entries = [createNodeEntry({ id: 'a' } as any)];
    const locked = lockAllEntries(entries);
    expect(locked[0].interactive).toBe(false);
  });

  it('createAiHelpActionsEntry는 두 액션을 가진다', () => {
    const e = createAiHelpActionsEntry('explain');
    expect(e.kind).toBe('ai-help-actions');
    expect(e.actions).toEqual(['continue', 'fallback']);
  });
});

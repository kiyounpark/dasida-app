import type { RemedialNode } from '@/data/review-remedial-flows';

export type RemedialEntry =
  | { kind: 'node'; interactive: boolean; payload: RemedialNode }
  | { kind: 'user-bubble'; interactive: false; text: string }
  | { kind: 'ai-help-input'; interactive: boolean; nodeId: string; nodeKind: 'explain' | 'check' }
  | { kind: 'ai-bubble'; interactive: false; text: string }
  | { kind: 'ai-help-actions'; interactive: boolean; sourceNodeKind: 'explain' | 'check'; actions: ['continue', 'fallback'] }
  | { kind: 'transition'; interactive: false; text: string };

export function createNodeEntry(
  _nodeKind: RemedialNode['kind'],
  payload: RemedialNode,
): Extract<RemedialEntry, { kind: 'node' }> {
  return { kind: 'node', interactive: true, payload };
}

export function createUserBubbleEntry(text: string): Extract<RemedialEntry, { kind: 'user-bubble' }> {
  return { kind: 'user-bubble', interactive: false, text };
}

export function createAiHelpInputEntry(
  nodeId: string,
  nodeKind: 'explain' | 'check',
): Extract<RemedialEntry, { kind: 'ai-help-input' }> {
  return { kind: 'ai-help-input', interactive: true, nodeId, nodeKind };
}

export function createAiBubbleEntry(text: string): Extract<RemedialEntry, { kind: 'ai-bubble' }> {
  return { kind: 'ai-bubble', interactive: false, text };
}

export function createAiHelpActionsEntry(
  sourceNodeKind: 'explain' | 'check',
): Extract<RemedialEntry, { kind: 'ai-help-actions' }> {
  return { kind: 'ai-help-actions', interactive: true, sourceNodeKind, actions: ['continue', 'fallback'] };
}

export function createTransitionEntry(text: string): Extract<RemedialEntry, { kind: 'transition' }> {
  return { kind: 'transition', interactive: false, text };
}

export function lockAllEntries(entries: readonly RemedialEntry[]): RemedialEntry[] {
  return entries.map((e) => ({ ...e, interactive: false }) as RemedialEntry);
}

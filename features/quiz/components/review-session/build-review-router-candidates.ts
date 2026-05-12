// features/quiz/components/review-session/build-review-router-candidates.ts
import type { RemedialFlow } from '@/data/review-remedial-flows';
import type { ReviewRouterCandidate } from '@/features/quiz/review-router';

export function buildReviewRouterCandidates(
  flow: RemedialFlow | undefined,
): ReviewRouterCandidate[] {
  if (!flow) return [];

  return Object.values(flow.nodes)
    .filter((node) => node.kind === 'explain')
    .filter((node) => Boolean(node.summary) && (node.triggers?.length ?? 0) > 0)
    .map((node) => ({
      id: node.id,
      summary: node.summary as string,
      triggers: node.triggers as ReadonlyArray<string>,
    }));
}

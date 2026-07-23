import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { detailedDiagnosisFlows } from './flow/detailedDiagnosisFlows';
import { methodOptions } from './flow/diagnosisTree';
import {
  advanceFromCheck,
  advanceFromChoice,
  advanceFromExplain,
  createDiagnosisFlowDraft,
  getDiagnosisFlow,
  getNode,
  type DiagnosisFlowDraft,
} from './flow/flow-engine';
import { diagnosisMethodRoutingCatalog } from './method-catalog';

// 진단 flow 를 서버에서 대신 걷는 엔드포인트.
// 목적: 문진표 트리·약점 매핑·키워드 규칙을 브라우저 번들에 넣지 않는다.
// 클라이언트에는 "지금 보여줄 노드 하나 + 다음 스텝용 draft 토큰"만 내려준다.
// 옵션의 nextNodeId·weaknessId·isCorrect 등 그래프 내부 정보는 절대 응답에 넣지 않는다.

const VALID_METHOD_IDS = new Set(Object.keys(detailedDiagnosisFlows));

function isValidMethodId(id: string): boolean {
  return VALID_METHOD_IDS.has(id);
}

// 선택 가능한 방법 목록 (unknown 제외) — 앱 methodOptions 순서 그대로.
const SELECTABLE_METHODS = methodOptions.filter((m) => m.id !== 'unknown');

function labelFor(id: string): string | null {
  const found = methodOptions.find((m) => m.id === id);
  return found ? found.labelKo : null;
}

// ── 화면용 노드 직렬화 (그래프 내부 정보 제거) ──
function toPresentation(draft: DiagnosisFlowDraft) {
  const flow = getDiagnosisFlow(draft.methodId);
  const node = getNode(flow, draft.currentNodeId);

  if (node.kind === 'choice') {
    return {
      kind: 'choice' as const,
      title: node.title,
      body: node.body ?? '',
      options: node.options.map((o) => ({ id: o.id, text: o.text })),
    };
  }
  if (node.kind === 'explain') {
    return {
      kind: 'explain' as const,
      title: node.title,
      body: node.body,
      primaryLabel: node.primaryLabel,
      secondaryLabel: node.secondaryLabel,
    };
  }
  if (node.kind === 'check') {
    return {
      kind: 'check' as const,
      title: node.title,
      prompt: node.prompt ?? '',
      options: node.options.map((o) => ({ id: o.id, text: o.text })),
    };
  }
  // final
  return {
    kind: 'final' as const,
    title: node.title,
    body: node.body,
  };
}

// ── 요청 스키마 ──
// draft 는 클라이언트가 왕복시키는 상태 토큰. 서버가 트리로 검증·전개하므로
// 조작돼도 노출되는 건 결국 그 학생이 걷는 경로 한 줄뿐이다(전체 트리 아님).
const DraftSchema = z.object({
  methodId: z.string().min(1).max(40),
  flowId: z.string().min(1).max(40),
  currentNodeId: z.string().min(1).max(120),
  visitedNodeIds: z.array(z.string().min(1).max(120)).max(200),
  events: z.array(z.record(z.string(), z.unknown())).max(200),
  usedDontKnow: z.boolean(),
});

const RequestSchema = z.discriminatedUnion('action', [
  // 후보/전체 방법 라벨 조회. ids 비면 전체 선택 목록.
  z.object({
    action: z.literal('labels'),
    ids: z.array(z.string().min(1).max(40)).max(40),
  }),
  // 자유 텍스트 → 키워드 매칭 상위 3개.
  z.object({
    action: z.literal('matchText'),
    text: z.string().trim().min(1).max(200),
  }),
  // 방법 확정 → flow 시작.
  z.object({
    action: z.literal('start'),
    methodId: z.string().min(1).max(40),
  }),
  // 다음 스텝.
  z.object({
    action: z.literal('advance'),
    draft: DraftSchema,
    event: z.discriminatedUnion('type', [
      z.object({ type: z.literal('choice'), optionId: z.string().min(1).max(120) }),
      z.object({ type: z.literal('explain'), reply: z.enum(['continue', 'dont_know']) }),
      z.object({ type: z.literal('check'), optionId: z.string().min(1).max(120).optional() }),
    ]),
  }),
]);

export const diagnoseFlow = onRequest(
  {
    region: 'asia-northeast3',
    timeoutSeconds: 20,
    cors: true,
    invoker: 'public',
    // 공개 엔드포인트 — 순수 계산이라 가볍지만 남용 상한을 둔다.
    maxInstances: 5,
    concurrency: 40,
  },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'method_not_allowed' });
      return;
    }

    const parsed = RequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: 'bad_request', detail: parsed.error.issues });
      return;
    }
    const req = parsed.data;

    try {
      if (req.action === 'labels') {
        const list =
          req.ids.length > 0
            ? req.ids
                .filter((id) => id !== 'unknown')
                .map((id) => ({ id, labelKo: labelFor(id) }))
                .filter((m): m is { id: string; labelKo: string } => m.labelKo !== null)
            : SELECTABLE_METHODS.map((m) => ({ id: m.id, labelKo: m.labelKo }));
        response.json({ methods: list });
        return;
      }

      if (req.action === 'matchText') {
        const text = req.text.toLowerCase();
        const matched = SELECTABLE_METHODS.map((m) => {
          const c = diagnosisMethodRoutingCatalog[m.id as keyof typeof diagnosisMethodRoutingCatalog];
          const hits = [...c.keywords, c.labelKo].reduce(
            (n, kw) => n + (text.includes(kw.toLowerCase()) ? 1 : 0),
            0,
          );
          return { id: m.id, labelKo: m.labelKo, hits };
        })
          .filter((s) => s.hits > 0)
          .sort((a, b) => b.hits - a.hits)
          .slice(0, 3)
          .map((s) => ({ id: s.id, labelKo: s.labelKo }));
        response.json({ methods: matched, matched: matched.length > 0 });
        return;
      }

      if (req.action === 'start') {
        if (!isValidMethodId(req.methodId)) {
          response.status(400).json({ error: 'unknown_method' });
          return;
        }
        const draft = createDiagnosisFlowDraft(req.methodId as DiagnosisFlowDraft['methodId']);
        response.json({ draft, node: toPresentation(draft) });
        return;
      }

      // advance
      const draft = req.draft as DiagnosisFlowDraft;
      if (!isValidMethodId(draft.methodId)) {
        response.status(400).json({ error: 'unknown_method' });
        return;
      }
      let next: DiagnosisFlowDraft;
      if (req.event.type === 'choice') {
        next = advanceFromChoice(draft, req.event.optionId);
      } else if (req.event.type === 'explain') {
        next = advanceFromExplain(draft, req.event.reply);
      } else {
        next = advanceFromCheck(draft, req.event.optionId);
      }
      response.json({ draft: next, node: toPresentation(next) });
    } catch (error) {
      // 잘못된 노드/옵션 조합 등 — 트리 밖으로 못 나가게 막고 400으로 응답.
      logger.warn('diagnoseFlow step failed', { message: (error as Error).message });
      response.status(400).json({ error: 'invalid_step' });
    }
  },
);

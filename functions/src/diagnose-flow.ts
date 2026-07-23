import { hkdfSync } from 'node:crypto';

import * as logger from 'firebase-functions/logger';
import { defineSecret } from 'firebase-functions/params';
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
import { SlidingWindowLimiter } from './flow/rate-limit';
import { createStateToken, verifyStateToken, type FlowStatePayload } from './flow/state-token';
import { diagnosisMethodRoutingCatalog } from './method-catalog';

// 진단 flow 를 서버에서 대신 걷는 엔드포인트.
// 목적: 문진표 트리·약점 매핑·키워드 규칙을 브라우저 번들에 넣지 않는다.
// 클라이언트에는 "지금 보여줄 노드 하나 + 서명된 상태 토큰"만 내려준다.
// 옵션의 nextNodeId·weaknessId·isCorrect 등 그래프 내부 정보는 절대 응답에 넣지 않는다.
//
// 크롤링 방어 (공개 API에서 완전한 비밀은 불가능 — 추출 비용을 키우는 층위 방어):
// ① HMAC 서명 토큰: currentNodeId 위조 불가 → start부터 정직하게 걷는 경로만 허용
// ② 스텝 상한(MAX_STEPS): 토큰 하나로 걸을 수 있는 길이 제한
// ③ IP당 슬라이딩 윈도우 속도 제한: BFS 전수 탐색에 필요한 대량 요청 차단
// ④ maxInstances 상한: 전역 처리량 자체를 제한
// 정식 서비스 전에는 Firebase Auth/App Check 추가를 권장.

// 서명 키는 기존 OPENAI_API_KEY 시크릿에서 HKDF로 유도 — 배포 절차 추가 없이
// 모든 인스턴스가 같은 키를 공유한다. (시크릿 로테이션 시 진행 중 토큰만 무효화 — flow 재시작으로 충분)
const openAiApiKey = defineSecret('OPENAI_API_KEY');
let signingKey: Buffer | null = null;
function getSigningKey(): Buffer {
  if (!signingKey) {
    signingKey = Buffer.from(
      hkdfSync('sha256', openAiApiKey.value(), 'dasida-flow-state', 'flow-token-v1', 32),
    );
  }
  return signingKey;
}

// 정직한 사용: 한 flow는 10스텝 안팎. 60이면 재시도 여유까지 충분하고 크롤링에는 부족하다.
const MAX_STEPS = 60;

// 학생 한 명의 정상 사용(문진 클릭)은 분당 몇 회 수준. 30/분이면 체감 제약 없이 크롤러만 걸린다.
const limiter = new SlidingWindowLimiter(30, 60_000);

function clientIp(headers: Record<string, unknown>, fallback: string | undefined): string {
  // Cloud Functions(=Cloud Run) 앞단 프록시는 실제 클라이언트 IP를 XFF 마지막에 덧붙인다.
  // 첫 항목은 클라이언트가 위조할 수 있으므로 마지막 항목을 쓴다.
  const xff = headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    const parts = xff.split(',');
    return parts[parts.length - 1].trim();
  }
  return fallback ?? 'unknown';
}

const VALID_METHOD_IDS = new Set(Object.keys(detailedDiagnosisFlows));

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

// 토큰 payload ↔ 엔진 draft 변환.
// 엔진은 methodId·currentNodeId만 있으면 다음 스텝을 계산한다.
// visitedNodeIds·events는 프로토타입에서 안 쓰므로 왕복시키지 않는다 (페이로드 증폭·위조 여지 제거).
function draftFromPayload(payload: FlowStatePayload): DiagnosisFlowDraft {
  return {
    methodId: payload.m as DiagnosisFlowDraft['methodId'],
    flowId: payload.m as DiagnosisFlowDraft['methodId'],
    currentNodeId: payload.n,
    visitedNodeIds: [payload.n],
    events: [],
    usedDontKnow: payload.d === 1,
  };
}

function payloadFromDraft(draft: DiagnosisFlowDraft, steps: number): FlowStatePayload {
  return {
    m: draft.methodId,
    n: draft.currentNodeId,
    d: draft.usedDontKnow ? 1 : 0,
    s: steps,
  };
}

// ── 요청 스키마 ──
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
  // 다음 스텝. token은 start/advance가 발급한 서명 토큰.
  z.object({
    action: z.literal('advance'),
    token: z.string().min(1).max(2048),
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
    secrets: [openAiApiKey],
    // 공개 엔드포인트 — 순수 계산이라 가볍지만 크롤링·남용 상한을 둔다.
    maxInstances: 3,
    concurrency: 40,
  },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'method_not_allowed' });
      return;
    }

    const ip = clientIp(request.headers as Record<string, unknown>, request.ip);
    if (!limiter.allow(ip, Date.now())) {
      response.status(429).json({ error: 'rate_limited' });
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
          // 트리 사본과 카탈로그 사본이 어긋나도(드리프트) 죽지 않게 방어
          if (!c) return { id: m.id, labelKo: m.labelKo, hits: 0 };
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
        if (!VALID_METHOD_IDS.has(req.methodId)) {
          response.status(400).json({ error: 'unknown_method' });
          return;
        }
        const draft = createDiagnosisFlowDraft(req.methodId as DiagnosisFlowDraft['methodId']);
        const token = createStateToken(payloadFromDraft(draft, 0), getSigningKey());
        response.json({ token, node: toPresentation(draft) });
        return;
      }

      // advance
      const payload = verifyStateToken(req.token, getSigningKey());
      if (!payload) {
        response.status(400).json({ error: 'invalid_token' });
        return;
      }
      if (payload.s >= MAX_STEPS) {
        response.status(400).json({ error: 'flow_too_long' });
        return;
      }
      if (!VALID_METHOD_IDS.has(payload.m)) {
        response.status(400).json({ error: 'unknown_method' });
        return;
      }
      const draft = draftFromPayload(payload);
      let next: DiagnosisFlowDraft;
      if (req.event.type === 'choice') {
        next = advanceFromChoice(draft, req.event.optionId);
      } else if (req.event.type === 'explain') {
        next = advanceFromExplain(draft, req.event.reply);
      } else {
        next = advanceFromCheck(draft, req.event.optionId);
      }
      const token = createStateToken(payloadFromDraft(next, payload.s + 1), getSigningKey());
      response.json({ token, node: toPresentation(next) });
    } catch (error) {
      // 잘못된 노드/옵션 조합 등 — 트리 밖으로 못 나가게 막고 400으로 응답.
      logger.warn('diagnoseFlow step failed', { message: (error as Error).message });
      response.status(400).json({ error: 'invalid_step' });
    }
  },
);

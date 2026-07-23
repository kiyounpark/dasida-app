// 진단 flow 상태 토큰 — HMAC 서명된 불투명 문자열.
// 목적: 클라이언트가 currentNodeId를 위조해 트리를 임의 지점부터 열람(크롤링)하는 것을 차단한다.
// 서명 없이는 start부터 정직하게 걷는 것만 가능하고, 스텝 상한·속도 제한과 합쳐져 전수 추출 비용을 키운다.
import { createHmac, timingSafeEqual } from 'node:crypto';

export type FlowStatePayload = {
  /** methodId */
  m: string;
  /** currentNodeId */
  n: string;
  /** usedDontKnow (0|1) */
  d: 0 | 1;
  /** 걸은 스텝 수 — 상한 검사용 */
  s: number;
};

export function createStateToken(payload: FlowStatePayload, key: Buffer): string {
  const body = Buffer.from(JSON.stringify(payload));
  const sig = createHmac('sha256', key).update(body).digest();
  return `${body.toString('base64url')}.${sig.toString('base64url')}`;
}

/** 서명·형식이 유효하면 payload, 아니면 null. 절대 throw하지 않는다. */
export function verifyStateToken(token: string, key: Buffer): FlowStatePayload | null {
  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1) return null;

  const body = Buffer.from(token.slice(0, dot), 'base64url');
  const sig = Buffer.from(token.slice(dot + 1), 'base64url');
  const expected = createHmac('sha256', key).update(body).digest();
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;

  try {
    const parsed: unknown = JSON.parse(body.toString());
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { m, n, d, s } = parsed as Record<string, unknown>;
    if (typeof m !== 'string' || m.length === 0) return null;
    if (typeof n !== 'string' || n.length === 0) return null;
    if (d !== 0 && d !== 1) return null;
    if (typeof s !== 'number' || !Number.isInteger(s) || s < 0) return null;
    return { m, n, d, s };
  } catch {
    return null;
  }
}

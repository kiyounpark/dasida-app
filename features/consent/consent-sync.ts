import {
  CONSENT_COPY_VERSION,
  needsConsentScreen,
  type ConsentDecisions,
  type ConsentDoc,
  type ConsentVia,
  type SaveConsentRequest,
} from '@/functions/src/photo-store-contract';

import type { ConsentRemote } from './consent-api';
import { clearLocalConsent, readLocalConsent, writeLocalConsent } from './consent-store';

/**
 * 동의 문서를 서버·기기 사본과 맞춘다 (1.0.11 1줄).
 *
 * 기기 사본은 서버 응답으로만 쓴다(🔒 10.02 줄 0 리뷰 — consent-store.ts 머리 주석).
 * - 켤 때: 기기 사본이 "됐음"이면 바로 통과하고 서버 확인은 뒤에서 한다(첫 화면을 안 붙잡는다).
 *   사본이 없거나 "다시 물어야 함"이면 서버를 기다린다 — 늦거나 끊기면 사본으로 정한다(오프라인).
 *   사본이 없으면 화면이 뜬다 — 동의를 지어내지 않는다.
 * - 넘길 때: 서버가 저장했다고 답해야만 사본을 쓰고 들어간다. 실패하면 던진다 — 화면에 머물러
 *   다시 누르게 한다. 앱을 끄면 다음 실행에 사본이 없으니 화면이 다시 뜬다("다음 실행에 다시").
 */

/** 켤 때 서버를 기다리는 상한. 헤더(최대 5초) + 요청을 한 번에 묶는다 */
export const CONSENT_CHECK_TIMEOUT_MS = 6_000;
/** [다음]을 누른 뒤 서버를 기다리는 상한 — 넘으면 실패로 보고 다시 누르게 한다 */
export const CONSENT_SUBMIT_TIMEOUT_MS = 10_000;

export type ConsentGateDecision = 'needed' | 'ok';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('consent timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function buildSaveConsentRequest(input: {
  accountKey: string;
  decisions: ConsentDecisions;
  via: ConsentVia;
  appVersion: string | null;
}): SaveConsentRequest {
  return {
    accountKey: input.accountKey,
    decisions: { ...input.decisions },
    copyVersion: { ...CONSENT_COPY_VERSION },
    via: input.via,
    appVersion: input.appVersion,
  };
}

/**
 * 서버 원본으로 기기 사본을 맞추고 그 문서를 돌려준다. 서버를 못 읽으면 던진다 — 부르는 쪽이 사본으로 정한다.
 */
export async function syncConsent(accountKey: string, remote: ConsentRemote): Promise<ConsentDoc | null> {
  const before = await readLocalConsent(accountKey);
  const serverDoc = await remote.fetch(accountKey);

  // 서버를 기다리는 사이 화면에서 넘겨 사본이 바뀌었으면(그것도 서버 응답이다) 그쪽이 새것이다 — 덮지 않는다
  const current = await readLocalConsent(accountKey);
  if ((current?.updatedAt ?? null) !== (before?.updatedAt ?? null)) return current;

  if (serverDoc) {
    await writeLocalConsent(accountKey, serverDoc);
  } else {
    await clearLocalConsent(accountKey);
  }
  return serverDoc;
}

/** 켤 때 동의 화면을 띄울지. 오프라인·느린 망이면 기기 사본으로 정한다 */
export async function decideConsentGate(
  accountKey: string,
  remote: ConsentRemote,
  timeoutMs: number = CONSENT_CHECK_TIMEOUT_MS,
): Promise<ConsentGateDecision> {
  const local = await readLocalConsent(accountKey);
  const sync = syncConsent(accountKey, remote);

  if (local && !needsConsentScreen(local)) {
    // 사본이 "됐음"이면 바로 통과. 서버가 다르게 말하면 사본만 고치고 다음 실행에 반영한다
    sync.catch(() => {});
    return 'ok';
  }

  let decided: ConsentDoc | null = local;
  try {
    decided = await withTimeout(sync, timeoutMs);
  } catch {
    // 오프라인·타임아웃 — 기기 사본(local)으로 정한다
  }
  return needsConsentScreen(decided) ? 'needed' : 'ok';
}

/** [다음]. 서버가 저장한 문서를 사본에 쓰고 돌려준다. 실패·타임아웃이면 던진다(사본은 안 건드린다) */
export async function submitConsent(input: {
  accountKey: string;
  decisions: ConsentDecisions;
  via: ConsentVia;
  appVersion: string | null;
  remote: ConsentRemote;
  timeoutMs?: number;
}): Promise<ConsentDoc> {
  const request = buildSaveConsentRequest(input);
  const saved = await withTimeout(input.remote.save(request), input.timeoutMs ?? CONSENT_SUBMIT_TIMEOUT_MS);
  await writeLocalConsent(input.accountKey, saved);
  return saved;
}

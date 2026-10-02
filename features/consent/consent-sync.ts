import {
  CONSENT_COPY_VERSION,
  needsConsentScreen,
  type ConsentDecisions,
  type ConsentDoc,
  type ConsentVia,
  type SaveConsentRequest,
} from '@/functions/src/photo-store-contract';

import type { ConsentRemote } from './consent-api';
import {
  clearLocalConsent,
  clearPendingConsent,
  readLocalConsent,
  readPendingConsent,
  writeLocalConsent,
  writePendingConsent,
} from './consent-store';

/**
 * 동의 문서를 서버·기기 사본과 맞춘다 (1.0.11 1줄).
 *
 * - 켤 때: 기기 사본이 "됐음"이면 바로 통과하고 서버 확인은 뒤에서 한다(첫 화면을 안 붙잡는다).
 *   사본이 없거나 "다시 물어야 함"이면 서버를 기다린다 — 늦거나 끊기면 사본으로 정한다(오프라인).
 * - 넘길 때: 서버 저장이 실패해도 학생은 들어간다. 기기에 임시 사본 + 밀린 저장을 두고 다음 실행에 다시 보낸다.
 */

/** 켤 때 서버를 기다리는 상한. 헤더(최대 5초) + 요청을 한 번에 묶는다 */
export const CONSENT_CHECK_TIMEOUT_MS = 6_000;
/** [다음]을 누른 뒤 서버를 기다리는 상한 — 넘으면 임시 사본으로 들어간다 */
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
 * 서버에 못 올렸을 때 기기에 두는 임시 사본. 켜짐/꺼짐만 맞으면 된다 —
 * 이 사본을 보는 건 needsConsentScreen과 2줄의 store 확인뿐이다.
 * 시각의 정본은 서버가 찍고, 밀린 저장이 올라가면 서버 문서로 덮인다.
 */
export function buildProvisionalConsentDoc(request: SaveConsentRequest, nowIso: string): ConsentDoc {
  const entry = (on: boolean, version: number) => ({
    version,
    agreedAt: on ? nowIso : null,
    revokedAt: null,
  });

  return {
    schemaVersion: 1,
    accountKey: request.accountKey,
    analysis: entry(request.decisions.analysis, request.copyVersion.analysis),
    store: entry(request.decisions.store, request.copyVersion.store),
    review: entry(request.decisions.review, request.copyVersion.review),
    via: request.via,
    updatedAt: nowIso,
    appVersion: request.appVersion,
  };
}

/**
 * 밀린 저장을 먼저 올리고, 서버 원본으로 기기 사본을 맞춘다. 가장 믿을 만한 문서를 돌려준다.
 * 서버를 못 읽으면 던진다 — 부르는 쪽이 기기 사본으로 정한다.
 */
export async function syncConsent(accountKey: string, remote: ConsentRemote): Promise<ConsentDoc | null> {
  const pending = await readPendingConsent(accountKey);
  if (pending) {
    try {
      const saved = await remote.save(pending);
      await writeLocalConsent(accountKey, saved);
      await clearPendingConsent(accountKey);
      return saved;
    } catch {
      // 아직 못 올림 — 기기의 임시 사본이 서버보다 새것이다
      return readLocalConsent(accountKey);
    }
  }

  const before = await readLocalConsent(accountKey);
  const serverDoc = await remote.fetch(accountKey);

  // 서버를 기다리는 사이 화면에서 넘겼으면(사본이 바뀌었으면) 그쪽이 새것이다 — 덮지 않는다
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

/**
 * [다음]. 서버에 저장되면 서버 문서를, 실패하면 임시 사본을 돌려준다 — 어느 쪽이든 학생은 들어간다.
 */
export async function submitConsent(input: {
  accountKey: string;
  decisions: ConsentDecisions;
  via: ConsentVia;
  appVersion: string | null;
  remote: ConsentRemote;
  timeoutMs?: number;
  now?: () => Date;
}): Promise<ConsentDoc> {
  const request = buildSaveConsentRequest(input);

  try {
    const saved = await withTimeout(input.remote.save(request), input.timeoutMs ?? CONSENT_SUBMIT_TIMEOUT_MS);
    await writeLocalConsent(input.accountKey, saved);
    await clearPendingConsent(input.accountKey);
    return saved;
  } catch (error) {
    console.warn('[consent] 서버 저장 실패 — 기기 사본으로 들어가고 다음 실행에 다시 보낸다', error);
    const provisional = buildProvisionalConsentDoc(request, (input.now?.() ?? new Date()).toISOString());
    await writePendingConsent(input.accountKey, request);
    await writeLocalConsent(input.accountKey, provisional);
    return provisional;
  }
}

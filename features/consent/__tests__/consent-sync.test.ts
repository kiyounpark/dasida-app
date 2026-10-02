import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  CONSENT_COPY_VERSION,
  needsConsentScreen,
  type ConsentDoc,
  type SaveConsentRequest,
} from '@/functions/src/photo-store-contract';

import type { ConsentRemote } from '../consent-api';
import {
  clearLocalConsent,
  getConsentStorageKey,
  getPendingConsentStorageKey,
  readLocalConsent,
  readPendingConsent,
  writeLocalConsent,
} from '../consent-store';
import { decideConsentGate, submitConsent, syncConsent } from '../consent-sync';

/**
 * 동의를 켤 때 정하고, 넘길 때 저장한다 (1.0.11 1줄).
 * lanes 끝 확인 중 시뮬레이터 없이 덮는 것: 다시 켜면 안 뜸 · 기존 가입자도 뜸 ·
 * 오프라인이면 기기 사본으로 판단 · 서버 저장 실패는 다음 실행에 다시.
 */

const ACCOUNT = 'user:abc';
const T1 = '2026-10-10T00:00:00.000Z';

const memory = new Map<string, string>();

beforeEach(() => {
  memory.clear();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => memory.get(key) ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    memory.set(key, value);
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    memory.delete(key);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

function serverDoc(overrides: Partial<ConsentDoc> = {}): ConsentDoc {
  return {
    schemaVersion: 1,
    accountKey: ACCOUNT,
    analysis: { version: CONSENT_COPY_VERSION.analysis, agreedAt: T1, revokedAt: null },
    store: { version: CONSENT_COPY_VERSION.store, agreedAt: T1, revokedAt: null },
    review: { version: CONSENT_COPY_VERSION.review, agreedAt: null, revokedAt: null },
    via: 'individual',
    updatedAt: T1,
    appVersion: '1.0.11',
    ...overrides,
  };
}

function makeRemote(overrides: Partial<ConsentRemote> = {}) {
  return {
    fetch: jest.fn<Promise<ConsentDoc | null>, [string]>(async () => null),
    save: jest.fn<Promise<ConsentDoc>, [SaveConsentRequest]>(async () => serverDoc()),
    ...overrides,
  };
}

const offline = () => Promise.reject(new TypeError('Network request failed'));
const never = () => new Promise<never>(() => {});

describe('켤 때 — 동의 화면을 띄울지', () => {
  it('기존 가입자: 기기 사본도 서버 문서도 없으면 화면을 띄운다', async () => {
    const remote = makeRemote({ fetch: jest.fn(async () => null) });

    await expect(decideConsentGate(ACCOUNT, remote)).resolves.toBe('needed');
    expect(remote.fetch).toHaveBeenCalledWith(ACCOUNT);
  });

  it('서버에 문서가 있으면 통과하고, 기기 사본을 서버 것으로 맞춘다', async () => {
    const remote = makeRemote({ fetch: jest.fn(async () => serverDoc()) });

    await expect(decideConsentGate(ACCOUNT, remote)).resolves.toBe('ok');
    await expect(readLocalConsent(ACCOUNT)).resolves.toEqual(serverDoc());
  });

  it('오프라인 + 기기 사본 "됨" → 통과(기기 사본으로 판단)', async () => {
    await writeLocalConsent(ACCOUNT, serverDoc());
    const remote = makeRemote({ fetch: jest.fn(offline) });

    await expect(decideConsentGate(ACCOUNT, remote)).resolves.toBe('ok');
  });

  it('오프라인 + 기기 사본 없음 → 화면(동의를 지어내지 않는다)', async () => {
    const remote = makeRemote({ fetch: jest.fn(offline) });

    await expect(decideConsentGate(ACCOUNT, remote)).resolves.toBe('needed');
  });

  it('기기 사본이 "됨"이면 서버를 기다리지 않는다', async () => {
    await writeLocalConsent(ACCOUNT, serverDoc());
    const remote = makeRemote({ fetch: jest.fn(never) });

    await expect(decideConsentGate(ACCOUNT, remote)).resolves.toBe('ok');
  });

  it('느린 망: 상한을 넘기면 기기 사본으로 정한다', async () => {
    const remote = makeRemote({ fetch: jest.fn(never) });

    await expect(decideConsentGate(ACCOUNT, remote, 10)).resolves.toBe('needed');
  });

  it('문구 판이 오른 사본(필수 칸 판 낮음)은 "다시 물음" — 서버를 본다', async () => {
    const stale = serverDoc({ store: { version: 0, agreedAt: T1, revokedAt: null } });
    await writeLocalConsent(ACCOUNT, stale);
    const remote = makeRemote({ fetch: jest.fn(async () => stale) });

    await expect(decideConsentGate(ACCOUNT, remote)).resolves.toBe('needed');
  });
});

describe('넘길 때 — [다음]', () => {
  it('서버 저장 성공: 기기 사본 = 서버 문서, 다시 켜면 안 뜬다(오프라인이어도)', async () => {
    const saved = serverDoc({ via: 'all', review: { version: 1, agreedAt: T1, revokedAt: null } });
    const remote = makeRemote({ save: jest.fn(async () => saved) });

    const doc = await submitConsent({
      accountKey: ACCOUNT,
      decisions: { analysis: true, store: true, review: true },
      via: 'all',
      appVersion: '1.0.11',
      remote,
    });

    expect(doc).toEqual(saved);
    expect(remote.save).toHaveBeenCalledWith({
      accountKey: ACCOUNT,
      decisions: { analysis: true, store: true, review: true },
      copyVersion: CONSENT_COPY_VERSION,
      via: 'all',
      appVersion: '1.0.11',
    });
    await expect(readPendingConsent(ACCOUNT)).resolves.toBeNull();

    // 다음 실행 — 서버가 안 닿아도 안 뜬다
    await expect(decideConsentGate(ACCOUNT, makeRemote({ fetch: jest.fn(offline) }))).resolves.toBe('ok');
  });

  it('서버 저장 실패: 임시 사본으로 들어가고(세 칸·via), 밀린 저장을 남긴다', async () => {
    const remote = makeRemote({ save: jest.fn(offline) });

    const doc = await submitConsent({
      accountKey: ACCOUNT,
      decisions: { analysis: true, store: true, review: false },
      via: 'individual',
      appVersion: '1.0.11',
      remote,
      now: () => new Date(T1),
    });

    expect(needsConsentScreen(doc)).toBe(false);
    expect(doc).toEqual({
      schemaVersion: 1,
      accountKey: ACCOUNT,
      analysis: { version: 1, agreedAt: T1, revokedAt: null },
      store: { version: 1, agreedAt: T1, revokedAt: null },
      review: { version: 1, agreedAt: null, revokedAt: null },
      via: 'individual',
      updatedAt: T1,
      appVersion: '1.0.11',
    });
    await expect(readPendingConsent(ACCOUNT)).resolves.toMatchObject({ via: 'individual' });
  });

  it('밀린 저장은 다음 실행에 다시 보내고, 성공하면 지운다', async () => {
    await submitConsent({
      accountKey: ACCOUNT,
      decisions: { analysis: true, store: true, review: false },
      via: 'individual',
      appVersion: '1.0.11',
      remote: makeRemote({ save: jest.fn(offline) }),
    });

    // 다음 실행 — 아직 오프라인: 기기 사본으로 통과, 밀린 저장은 남는다
    const stillOffline = makeRemote({ save: jest.fn(offline), fetch: jest.fn(offline) });
    await expect(decideConsentGate(ACCOUNT, stillOffline)).resolves.toBe('ok');
    await expect(readPendingConsent(ACCOUNT)).resolves.not.toBeNull();

    // 그다음 실행 — 망이 돌아옴: 밀린 요청을 그대로 보내고 서버 문서로 덮는다
    const back = makeRemote({ save: jest.fn(async () => serverDoc()) });
    await expect(syncConsent(ACCOUNT, back)).resolves.toEqual(serverDoc());
    expect(back.save).toHaveBeenCalledWith(expect.objectContaining({ accountKey: ACCOUNT, via: 'individual' }));
    expect(back.fetch).not.toHaveBeenCalled();
    await expect(readPendingConsent(ACCOUNT)).resolves.toBeNull();
    await expect(readLocalConsent(ACCOUNT)).resolves.toEqual(serverDoc());
  });

  it('서버 응답을 기다리는 사이 넘겼으면, 늦게 온 "문서 없음"이 기기 사본을 지우지 않는다', async () => {
    let answer: (doc: ConsentDoc | null) => void = () => {};
    const slow = makeRemote({
      fetch: jest.fn(() => new Promise<ConsentDoc | null>((resolve) => (answer = resolve))),
    });

    const sync = syncConsent(ACCOUNT, slow);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(slow.fetch).toHaveBeenCalled();
    await submitConsent({
      accountKey: ACCOUNT,
      decisions: { analysis: true, store: true, review: false },
      via: 'individual',
      appVersion: '1.0.11',
      remote: makeRemote({ save: jest.fn(async () => serverDoc({ updatedAt: '2026-10-10T00:00:05.000Z' })) }),
    });
    answer(null);
    await sync;

    const local = await readLocalConsent(ACCOUNT);
    expect(needsConsentScreen(local)).toBe(false);
  });
});

describe('로그아웃·탈퇴 때 지우기', () => {
  it('clearLocalConsent는 사본과 밀린 저장을 같이 지운다', async () => {
    memory.set(getConsentStorageKey(ACCOUNT), JSON.stringify(serverDoc()));
    memory.set(getPendingConsentStorageKey(ACCOUNT), JSON.stringify({ accountKey: ACCOUNT, decisions: {} }));

    await clearLocalConsent(ACCOUNT);

    expect(memory.size).toBe(0);
  });

  it('지우다 실패해도 던지지 않는다 — 로그아웃·탈퇴를 막으면 안 된다', async () => {
    (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(new Error('disk'));

    await expect(clearLocalConsent(ACCOUNT)).resolves.toBeUndefined();
  });
});

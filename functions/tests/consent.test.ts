import assert from 'node:assert/strict';
import test from 'node:test';

import type { Firestore } from 'firebase-admin/firestore';

import { parseConsentDoc, readConsentDoc } from '../src/get-consent';
import {
  CONSENT_COPY_VERSION,
  needsConsentScreen,
  type ConsentDoc,
  type SaveConsentRequest,
} from '../src/photo-store-contract';
import { buildNextConsentDoc, nextConsentEntry, purgeReviewPhotos, saveConsentDoc } from '../src/save-consent';

// 1.0.11 1줄 — saveConsent·getConsent 본문. 전이 규칙(약속 파일 §1 주석)과 문서 자리를 잠근다.

const T1 = '2026-10-10T00:00:00.000Z';
const T2 = '2026-10-11T00:00:00.000Z';

function makeRequest(overrides: Partial<SaveConsentRequest> = {}): SaveConsentRequest {
  return {
    accountKey: 'user:abc',
    decisions: { analysis: true, store: true, review: false },
    copyVersion: { ...CONSENT_COPY_VERSION },
    via: 'individual',
    appVersion: '1.0.11',
    ...overrides,
  };
}

/** runTransaction·경로만 흉내 낸다. 지나간 경로와 쓴 횟수를 같이 본다 */
function makeFakeFirestore(initial?: unknown) {
  const state = { stored: initial, writes: 0, path: [] as string[] };
  const ref = { id: 'consent' };
  const pathNode = (segment: string): unknown => ({
    doc: (id: string) => {
      state.path.push(segment, id);
      return {
        collection: (next: string) => pathNode(next),
        get: async () => ({ exists: state.stored !== undefined, data: () => state.stored }),
        ...ref,
      };
    },
  });
  const firestore = {
    collection: (name: string) => {
      state.path = [];
      return pathNode(name);
    },
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        get: async () => ({ exists: state.stored !== undefined, data: () => state.stored }),
        set: (_ref: unknown, data: unknown) => {
          state.stored = data;
          state.writes += 1;
        },
      }),
  } as unknown as Firestore;
  return { firestore, state };
}

test('처음 넘김: 켠 칸은 agreedAt=지금, 끈 칸은 둘 다 null, 세 칸·via가 다 찍힌다', () => {
  const doc = buildNextConsentDoc(null, makeRequest(), T1);

  assert.deepEqual(doc, {
    schemaVersion: 1,
    accountKey: 'user:abc',
    analysis: { version: 1, agreedAt: T1, revokedAt: null },
    store: { version: 1, agreedAt: T1, revokedAt: null },
    review: { version: 1, agreedAt: null, revokedAt: null },
    via: 'individual',
    updatedAt: T1,
    appVersion: '1.0.11',
  });
  assert.equal(needsConsentScreen(doc), false);
});

test('같은 선택 재전송: 문서가 그대로다(시각·updatedAt 안 바뀜)', () => {
  const first = buildNextConsentDoc(null, makeRequest(), T1);
  const again = buildNextConsentDoc(first, makeRequest(), T2);

  assert.equal(again, first);
});

test('켜져 있던 칸을 끄면 agreedAt은 남고 revokedAt=지금', () => {
  const on = buildNextConsentDoc(null, makeRequest({ decisions: { analysis: true, store: true, review: true } }), T1);
  const off = buildNextConsentDoc(on, makeRequest({ decisions: { analysis: true, store: true, review: false } }), T2);

  assert.deepEqual(off.review, { version: 1, agreedAt: T1, revokedAt: T2 });
  assert.equal(off.analysis, on.analysis);
  assert.equal(off.updatedAt, T2);
});

test('끈 칸을 다시 켜면 agreedAt=새 시각, revokedAt=null', () => {
  const entry = nextConsentEntry({ version: 1, agreedAt: T1, revokedAt: T1 }, true, 1, T2);

  assert.deepEqual(entry, { version: 1, agreedAt: T2, revokedAt: null });
});

test('계속 꺼져 있으면 시각을 안 바꾸고 판만 보낸 값으로', () => {
  const prev = { version: 1, agreedAt: T1, revokedAt: T2 };

  assert.equal(nextConsentEntry(prev, false, 1, '2026-10-12T00:00:00.000Z'), prev);
  assert.deepEqual(nextConsentEntry(prev, false, 2, '2026-10-12T00:00:00.000Z'), {
    version: 2,
    agreedAt: T1,
    revokedAt: T2,
  });
});

test('문구 판이 올라 다시 켜면 새 동의로 본다 — agreedAt을 새로 찍고 판을 올린다', () => {
  const entry = nextConsentEntry({ version: 1, agreedAt: T1, revokedAt: null }, true, 2, T2);

  assert.deepEqual(entry, { version: 2, agreedAt: T2, revokedAt: null });
});

test('누른 방식만 바뀌어도 문서는 새로 쓴다(updatedAt=지금), 칸 시각은 그대로', () => {
  const first = buildNextConsentDoc(null, makeRequest({ via: 'individual' }), T1);
  const next = buildNextConsentDoc(first, makeRequest({ via: 'all' }), T2);

  assert.equal(next.via, 'all');
  assert.equal(next.updatedAt, T2);
  assert.equal(next.analysis, first.analysis);
});

test('깨진 문서는 null — 처음 본 것처럼 다룬다', () => {
  assert.equal(parseConsentDoc({ schemaVersion: 1, accountKey: 'user:abc' }), null);
  assert.equal(parseConsentDoc(null), null);

  const doc = buildNextConsentDoc(null, makeRequest(), T1);
  assert.deepEqual(parseConsentDoc(doc), doc);
});

test('saveConsentDoc: users/{accountKey}/private/consent에 한 번 쓰고, 같은 요청은 안 쓴다', async () => {
  const { firestore, state } = makeFakeFirestore();

  const saved = await saveConsentDoc(firestore, makeRequest({ via: 'all' }), new Date(T1));
  assert.deepEqual(state.path, ['users', 'user:abc', 'private', 'consent']);
  assert.equal(state.writes, 1);
  assert.equal(saved.via, 'all');
  assert.equal((state.stored as ConsentDoc).analysis.agreedAt, T1);

  const again = await saveConsentDoc(firestore, makeRequest({ via: 'all' }), new Date(T2));
  assert.equal(state.writes, 1);
  assert.equal(again.updatedAt, T1);
});

test('saveConsentDoc: 저장된 문서가 깨져 있으면 새로 만든다', async () => {
  const { firestore, state } = makeFakeFirestore({ garbage: true });

  const saved = await saveConsentDoc(firestore, makeRequest(), new Date(T1));
  assert.equal(state.writes, 1);
  assert.equal(saved.schemaVersion, 1);
});

test('readConsentDoc: 없으면 null(≠ 전부 동의), 있으면 그대로', async () => {
  const empty = makeFakeFirestore();
  assert.equal(await readConsentDoc(empty.firestore, 'user:abc'), null);
  assert.deepEqual(empty.state.path, ['users', 'user:abc', 'private', 'consent']);

  const doc = buildNextConsentDoc(null, makeRequest(), T1);
  const filled = makeFakeFirestore(doc);
  assert.deepEqual(await readConsentDoc(filled.firestore, 'user:abc'), doc);
});

// 🔒 10.02 기윤 — 설정에서 [선택] 검토 동의를 끄면 그 계정의 검토본을 바로 지운다
test('purgeReviewPhotos: 원장에서 모은 검토본 경로를 전부 지우고 몇 개였는지 돌려준다', async () => {
  const deleted: string[] = [];
  const count = await purgeReviewPhotos(
    {
      collectReviewPhotoPaths: async (key) => {
        assert.equal(key, 'user:abc');
        return ['review/2026-10-10/user:abc/s1.jpg', 'review/2026-10-11/user:abc/s2.jpg'];
      },
      objects: { deleteIfExists: async (path) => void deleted.push(path) },
    },
    'user:abc',
  );

  assert.equal(count, 2);
  assert.deepEqual(deleted.sort(), ['review/2026-10-10/user:abc/s1.jpg', 'review/2026-10-11/user:abc/s2.jpg']);
});

test('purgeReviewPhotos: 검토본이 없으면 아무것도 안 지우고 0', async () => {
  const count = await purgeReviewPhotos(
    { collectReviewPhotoPaths: async () => [], objects: { deleteIfExists: async () => assert.fail('지울 게 없다') } },
    'user:abc',
  );
  assert.equal(count, 0);
});

test('purgeReviewPhotos: 하나라도 못 지우면 던진다 — 나머지는 다 시도한다(같은 선택 재전송이 마저 지운다)', async () => {
  const tried: string[] = [];
  await assert.rejects(
    purgeReviewPhotos(
      {
        collectReviewPhotoPaths: async () => ['review/a.jpg', 'review/b.jpg'],
        objects: {
          deleteIfExists: async (path) => {
            tried.push(path);
            if (path === 'review/a.jpg') throw new Error('storage down');
          },
        },
      },
      'user:abc',
    ),
    /Review photo delete failed \(1\/2\)/,
  );
  assert.deepEqual(tried.sort(), ['review/a.jpg', 'review/b.jpg']);
});

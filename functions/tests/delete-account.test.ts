import assert from 'node:assert/strict';
import test from 'node:test';

import { deleteAccountData, handleDeleteAccount, type DeleteAccountDeps } from '../src/delete-account';
import { LearningHistoryAuthError } from '../src/learning-history-auth';
import { firebasePhotoObjectStore, md5Base64 } from '../src/photo-storage';

// 1.0.11 2줄 — 탈퇴 순서(약속 파일 §6)와 "Storage 일부 실패 = 탈퇴 실패".

const ACCOUNT = 'user:abc';

function fakeDeps(
  options: { reviewPaths?: string[]; failPrefix?: boolean; failPath?: string } = {},
): { deps: DeleteAccountDeps; log: string[] } {
  const log: string[] = [];
  return {
    log,
    deps: {
      deleteConsent: async (accountKey) => {
        log.push(`consent:${accountKey}`);
      },
      collectReviewPhotoPaths: async () => {
        log.push('collect');
        return options.reviewPaths ?? [];
      },
      deleteFirestoreData: async () => {
        log.push('firestore');
      },
      objects: {
        deletePrefix: async (prefix) => {
          log.push(`prefix:${prefix}`);
          if (options.failPrefix) throw new Error('prefix failed');
        },
        deleteIfExists: async (path) => {
          log.push(`file:${path}`);
          if (path === options.failPath) throw new Error('file failed');
        },
      },
    },
  };
}

test('순서: ① consent → ② 검토본 경로 모으기 → ③ Storage(노트 prefix + 모은 경로) → ④ Firestore·원장', async () => {
  const review = ['review/2026-10-10/user:abc/sub_1.jpg', 'review/2026-10-11/user:abc/sub_2.jpg'];
  const { deps, log } = fakeDeps({ reviewPaths: review });

  await deleteAccountData(deps, ACCOUNT);

  assert.deepEqual(log, [
    'consent:user:abc',
    'collect',
    'prefix:photo-notes/user:abc/',
    `file:${review[0]}`,
    `file:${review[1]}`,
    'firestore',
  ]);
});

test('Storage에 아무것도 없는 기존 학생(1.0.10 이하) 탈퇴는 성공한다', async () => {
  const { deps, log } = fakeDeps({ reviewPaths: [] });

  await deleteAccountData(deps, ACCOUNT);

  assert.deepEqual(log, ['consent:user:abc', 'collect', 'prefix:photo-notes/user:abc/', 'firestore']);
});

test('Storage 일부 실패 = 탈퇴 실패 — 나머지 파일은 지우고, 원장·Firestore는 그대로 둔다', async () => {
  const review = ['review/2026-10-10/user:abc/sub_1.jpg', 'review/2026-10-11/user:abc/sub_2.jpg'];
  const { deps, log } = fakeDeps({ reviewPaths: review, failPath: review[0] });

  await assert.rejects(deleteAccountData(deps, ACCOUNT), /Storage delete failed \(1\/3\)/);
  assert.ok(log.includes(`file:${review[1]}`));
  assert.ok(!log.includes('firestore'));
});

test('노트 사진 prefix 지우기가 실패해도 탈퇴 실패 — Firestore 안 건드림', async () => {
  const { deps, log } = fakeDeps({ failPrefix: true });
  await assert.rejects(deleteAccountData(deps, ACCOUNT), /Storage delete failed/);
  assert.ok(!log.includes('firestore'));
});

test('Storage가 실패한 뒤 다시 탈퇴하면 원장이 남아 있어 검토본 경로를 다시 찾는다', async () => {
  // 원장 행은 Firestore 단계(④)에서만 지워진다
  let runs = ['review/2026-10-10/user:abc/sub_1.jpg'];
  let storageDown = true;
  const deleted: string[] = [];
  const deps: DeleteAccountDeps = {
    deleteConsent: async () => {},
    collectReviewPhotoPaths: async () => [...runs],
    deleteFirestoreData: async () => {
      runs = [];
    },
    objects: {
      deletePrefix: async () => {},
      deleteIfExists: async (path) => {
        if (storageDown) throw new Error('storage down');
        deleted.push(path);
      },
    },
  };

  await assert.rejects(deleteAccountData(deps, ACCOUNT));
  storageDown = false;
  await deleteAccountData(deps, ACCOUNT);

  assert.deepEqual(deleted, ['review/2026-10-10/user:abc/sub_1.jpg']);
  assert.deepEqual(runs, []);
});

test('Firestore 단계가 실패해도 탈퇴 실패', async () => {
  const { deps } = fakeDeps();
  deps.deleteFirestoreData = async () => {
    throw new Error('firestore down');
  };

  await assert.rejects(deleteAccountData(deps, ACCOUNT), /firestore down/);
});

// ── 핸들러 — 응답 모양은 지금(1.0.10 앱이 읽는 그대로) ──

function fakeResponse() {
  const sent: { status: number | null; body: unknown } = { status: null, body: undefined };
  return {
    sent,
    response: {
      status(code: number) {
        sent.status = code;
        return {
          json(body: unknown) {
            sent.body = body;
          },
        };
      },
    },
  };
}

const POST = { method: 'POST', headers: { 'x-dasida-account-key': ACCOUNT }, body: { accountKey: ACCOUNT } };
const authOk = async () => ({ kind: 'firebase' as const, accountKey: ACCOUNT, firebaseUid: 'abc' });

test('핸들러: 다 지우면 200 {success:true}', async () => {
  const { sent, response } = fakeResponse();
  await handleDeleteAccount(POST, response, { authenticate: authOk, data: () => fakeDeps().deps });

  assert.equal(sent.status, 200);
  assert.deepEqual(sent.body, { success: true });
});

test('핸들러: Storage 일부 실패면 500 — 탈퇴 성공으로 보고하지 않는다', async () => {
  const { sent, response } = fakeResponse();
  await handleDeleteAccount(POST, response, {
    authenticate: authOk,
    data: () => fakeDeps({ reviewPaths: ['review/x.jpg'], failPath: 'review/x.jpg' }).deps,
  });

  assert.equal(sent.status, 500);
  assert.deepEqual(sent.body, { error: 'Failed to delete account' });
});

test('핸들러: 인증 실패면 지우기 전에 그 상태 코드', async () => {
  const { sent, response } = fakeResponse();
  let touched = false;
  await handleDeleteAccount(POST, response, {
    authenticate: async () => {
      throw new LearningHistoryAuthError('Unauthorized account access', 403);
    },
    data: () => {
      touched = true;
      return fakeDeps().deps;
    },
  });

  assert.equal(sent.status, 403);
  assert.equal(touched, false);
});

// ── 실물 Storage 어댑터 — 버킷 호출 모양 ──

type FakeFile = {
  getMetadata?: () => Promise<[{ metadata?: Record<string, unknown>; md5Hash?: string }]>;
  save?: (bytes: Buffer, options: Record<string, unknown>) => Promise<void>;
  delete?: (options: Record<string, unknown>) => Promise<void>;
};

function fakeBucket(files: Record<string, FakeFile>, deleteFiles?: (query: Record<string, unknown>) => Promise<void>) {
  return {
    file: (path: string) => files[path] ?? {},
    deleteFiles: deleteFiles ?? (async () => {}),
  } as unknown as Parameters<typeof firebasePhotoObjectStore>[0];
}

test('어댑터: 파일 0개 prefix 지우기는 그냥 끝난다 · force:false(하나라도 실패하면 던진다)', async () => {
  let query: Record<string, unknown> | null = null;
  const store = firebasePhotoObjectStore(
    fakeBucket({}, async (q) => {
      query = q;
    }),
  );

  await store.deletePrefix('photo-notes/user:abc/');

  assert.deepEqual(query, { prefix: 'photo-notes/user:abc/', force: false });
});

test('어댑터: 개별 파일은 없으면 그냥 끝난다(ignoreNotFound)', async () => {
  let options: Record<string, unknown> | null = null;
  const store = firebasePhotoObjectStore(
    fakeBucket({
      'review/x.jpg': {
        delete: async (o) => {
          options = o;
        },
      },
    }),
  );

  await store.deleteIfExists('review/x.jpg');

  assert.deepEqual(options, { ignoreNotFound: true });
});

test('어댑터: 객체 읽기 — 없으면 null, 있으면 메타(문자열)와 md5Hash', async () => {
  const notFound = Object.assign(new Error('No such object'), { code: 404 });
  const store = firebasePhotoObjectStore(
    fakeBucket({
      'a.jpg': { getMetadata: async () => [{ metadata: { 'dasida-note-id': 'photo-1' }, md5Hash: 'abc==' }] },
      'b.jpg': {
        getMetadata: async () => {
          throw notFound;
        },
      },
    }),
  );

  assert.deepEqual(await store.readObjectInfo('a.jpg'), { metadata: { 'dasida-note-id': 'photo-1' }, md5Hash: 'abc==' });
  assert.equal(await store.readObjectInfo('b.jpg'), null);
});

test('md5Base64: GCS md5Hash와 같은 꼴(MD5 다이제스트의 base64)', () => {
  // echo -n "hello" | openssl md5 -binary | base64
  assert.equal(md5Base64(Buffer.from('hello')), 'XUFAKrxLKna5cZ2REBfFkg==');
});

test('어댑터: onlyIfAbsent면 ifGenerationMatch 0, 이미 있으면(412) exists — 덮지 않는다', async () => {
  const seen: Record<string, unknown>[] = [];
  const store = firebasePhotoObjectStore(
    fakeBucket({
      'new.jpg': {
        save: async (_bytes, options) => {
          seen.push(options);
        },
      },
      'old.jpg': {
        save: async () => {
          throw Object.assign(new Error('precondition'), { code: 412 });
        },
      },
    }),
  );
  const options = { contentType: 'image/jpeg', metadata: { k: 'v' }, onlyIfAbsent: true };

  assert.equal(await store.save('new.jpg', Buffer.from('x'), options), 'saved');
  assert.equal(await store.save('old.jpg', Buffer.from('x'), options), 'exists');
  assert.deepEqual(seen[0], {
    contentType: 'image/jpeg',
    metadata: { metadata: { k: 'v' } },
    resumable: false,
    preconditionOpts: { ifGenerationMatch: 0 },
  });
});

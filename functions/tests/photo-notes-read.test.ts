import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GetPhotoNoteImageQuerySchema,
  sendNotePhoto,
  type NotePhotoSource,
  type PhotoImageResponse,
} from '../src/get-photo-note-image';
import {
  listPhotoNotePage,
  ListPhotoNotesQuerySchema,
  type PhotoNotesQuery,
} from '../src/list-photo-notes';
import {
  buildPhotoNoteDoc,
  LIST_PHOTO_NOTES_DEFAULT_LIMIT,
  notePhotoPath,
  type PhotoNoteDoc,
} from '../src/photo-store-contract';

// 1.0.11 3줄 — 다른 기기 보기의 읽기 쪽 두 함수(listPhotoNotes · getPhotoNoteImage).

const ACCOUNT = 'user:abc';

function makeDoc(createdAt: string, overrides: Partial<PhotoNoteDoc> = {}): PhotoNoteDoc {
  const id = `photo-${createdAt}`;
  return {
    ...buildPhotoNoteDoc(
      {
        id,
        createdAt,
        schemaVersion: 1,
        dateLabel: '9/15',
        quote: 'q',
        why: 'w',
        fix: 'f',
        methodLabel: 'm',
        typeLabel: 't',
        methodId: 'cps',
        mistakeType: 'calc_slip',
        weaknessIds: [],
        primaryWeaknessId: null,
        checkPassed: true,
        retryResult: 'pass',
      },
      {
        accountKey: ACCOUNT,
        photoPath: notePhotoPath(ACCOUNT, id),
        submissionId: null,
        appVersion: '1.0.11',
        storedAt: '2026-10-02T00:00:00.000Z',
      },
    ),
    ...overrides,
  };
}

/** Firestore 쿼리의 세 연산(orderBy desc · where < · limit)을 같은 뜻으로 흉내 낸다. 받은 호출도 적는다 */
function fakeNotes(docs: PhotoNoteDoc[]) {
  const calls: string[] = [];
  function make(state: { desc: boolean; before?: string; limit?: number }): PhotoNotesQuery {
    return {
      orderBy(field, direction) {
        calls.push(`orderBy:${field}:${direction}`);
        return make({ ...state, desc: true });
      },
      where(field, op, value) {
        calls.push(`where:${field}:${op}:${value}`);
        return make({ ...state, before: value });
      },
      limit(count) {
        calls.push(`limit:${count}`);
        return make({ ...state, limit: count });
      },
      async get() {
        let rows = [...docs];
        if (state.desc) rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        if (state.before) rows = rows.filter((doc) => doc.createdAt < state.before!);
        if (state.limit !== undefined) rows = rows.slice(0, state.limit);
        return { docs: rows.map((doc) => ({ data: () => doc })) };
      },
    };
  }
  return { query: make({ desc: false }), calls };
}

const T1 = '2026-09-01T00:00:00.000Z';
const T2 = '2026-09-02T00:00:00.000Z';
const T3 = '2026-09-03T00:00:00.000Z';
const T4 = '2026-09-04T00:00:00.000Z';
const T5 = '2026-09-05T00:00:00.000Z';

// ── listPhotoNotes ──────────────────────────────────────────────────────────

test('목록: createdAt 내림차순(최신 먼저)으로 준다', async () => {
  const { query, calls } = fakeNotes([makeDoc(T2), makeDoc(T5), makeDoc(T1)]);
  const page = await listPhotoNotePage(query, {});

  assert.deepEqual(
    page.notes.map((note) => note.createdAt),
    [T5, T2, T1],
  );
  assert.ok(calls.includes('orderBy:createdAt:desc'));
  assert.equal(page.nextBefore, null);
});

test('목록: limit만큼 자르고, 더 있으면 nextBefore = 그 쪽 마지막 createdAt', async () => {
  const { query } = fakeNotes([makeDoc(T1), makeDoc(T2), makeDoc(T3), makeDoc(T4), makeDoc(T5)]);
  const page = await listPhotoNotePage(query, { limit: 2 });

  assert.deepEqual(
    page.notes.map((note) => note.createdAt),
    [T5, T4],
  );
  assert.equal(page.nextBefore, T4);
});

test('목록: before 커서는 그 시각보다 오래된 것만 — 커서로 끝까지 가면 빠짐·겹침이 없다', async () => {
  const all = [makeDoc(T1), makeDoc(T2), makeDoc(T3), makeDoc(T4), makeDoc(T5)];
  const seen: string[] = [];
  let before: string | undefined;

  for (let guard = 0; guard < 10; guard += 1) {
    const { query } = fakeNotes(all);
    const page = await listPhotoNotePage(query, { limit: 2, before });
    seen.push(...page.notes.map((note) => note.createdAt));
    if (!page.nextBefore) break;
    before = page.nextBefore;
  }

  assert.deepEqual(seen, [T5, T4, T3, T2, T1]);
});

test('목록: 딱 limit개면 nextBefore는 null(빈 쪽을 한 번 더 부르지 않게)', async () => {
  const { query } = fakeNotes([makeDoc(T1), makeDoc(T2)]);
  const page = await listPhotoNotePage(query, { limit: 2 });

  assert.equal(page.notes.length, 2);
  assert.equal(page.nextBefore, null);
});

test('목록: limit을 안 주면 약속 파일 기본값(100)으로 읽는다', async () => {
  const { query, calls } = fakeNotes([makeDoc(T1)]);
  await listPhotoNotePage(query, {});

  assert.ok(calls.includes(`limit:${LIST_PHOTO_NOTES_DEFAULT_LIMIT + 1}`));
});

test('목록: deletedAt 있는 문서도 준다 — "안 올라감"과 "지웠음"을 가르려면 필요하다', async () => {
  const deleted = makeDoc(T2, { deletedAt: '2026-10-01T00:00:00.000Z' });
  const { query } = fakeNotes([makeDoc(T1), deleted]);
  const page = await listPhotoNotePage(query, {});

  assert.equal(page.notes.length, 2);
  assert.equal(page.notes[0].deletedAt, '2026-10-01T00:00:00.000Z');
});

test('목록 쿼리: limit은 문자열로 와도 숫자로, 200 넘으면 거절', () => {
  const ok = ListPhotoNotesQuerySchema.safeParse({ accountKey: ACCOUNT, limit: '50', before: T3 });
  assert.equal(ok.success, true);
  assert.equal(ok.success && ok.data.limit, 50);

  assert.equal(ListPhotoNotesQuerySchema.safeParse({ accountKey: ACCOUNT, limit: '201' }).success, false);
  assert.equal(ListPhotoNotesQuerySchema.safeParse({ limit: '10' }).success, false);
});

// ── getPhotoNoteImage ───────────────────────────────────────────────────────

function fakeResponse() {
  const record: { status?: number; headers: Record<string, string>; body?: unknown; json?: unknown } = {
    headers: {},
  };
  const response: PhotoImageResponse = {
    set(field, value) {
      record.headers[field] = value;
      return response;
    },
    status(code) {
      record.status = code;
      return {
        json(body) {
          record.json = body;
        },
        send(body) {
          record.body = body;
        },
      };
    },
  };
  return { response, record };
}

function fakeSource(
  note: Pick<PhotoNoteDoc, 'photoPath' | 'deletedAt'> | null,
  photo: Buffer | null,
) {
  const reads: string[] = [];
  const source: NotePhotoSource = {
    async readNote() {
      return note;
    },
    async readPhoto(path) {
      reads.push(path);
      return photo;
    },
  };
  return { source, reads };
}

const NOTE_ID = `photo-${T1}`;
const PHOTO_PATH = notePhotoPath(ACCOUNT, NOTE_ID);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

test('사진: 문서의 photoPath를 서버가 읽어 JPEG 바이트로 — Cache-Control: private, no-store', async () => {
  const { source, reads } = fakeSource({ photoPath: PHOTO_PATH, deletedAt: null }, JPEG);
  const { response, record } = fakeResponse();

  await sendNotePhoto(source, ACCOUNT, NOTE_ID, response);

  assert.equal(record.status, 200);
  assert.equal(record.body, JPEG);
  assert.equal(record.headers['Content-Type'], 'image/jpeg');
  assert.equal(record.headers['Cache-Control'], 'private, no-store');
  assert.deepEqual(reads, [PHOTO_PATH]);
});

test('사진: 사진 없이 올린 노트(photoPath null)는 404 PHOTO_MISSING', async () => {
  const { source, reads } = fakeSource({ photoPath: null, deletedAt: null }, JPEG);
  const { response, record } = fakeResponse();

  await sendNotePhoto(source, ACCOUNT, NOTE_ID, response);

  assert.equal(record.status, 404);
  assert.deepEqual(record.json, { error: 'Note has no photo', code: 'PHOTO_MISSING', retryable: false });
  assert.deepEqual(reads, []);
});

test('사진: 문서는 있는데 Storage 객체가 없으면 404 PHOTO_MISSING', async () => {
  const { source } = fakeSource({ photoPath: PHOTO_PATH, deletedAt: null }, null);
  const { response, record } = fakeResponse();

  await sendNotePhoto(source, ACCOUNT, NOTE_ID, response);

  assert.equal(record.status, 404);
  assert.equal((record.json as { code: string }).code, 'PHOTO_MISSING');
  assert.equal(record.body, undefined);
});

test('사진: 노트 문서가 없어도 404 PHOTO_MISSING', async () => {
  const { source } = fakeSource(null, JPEG);
  const { response, record } = fakeResponse();

  await sendNotePhoto(source, ACCOUNT, NOTE_ID, response);

  assert.equal(record.status, 404);
  assert.equal((record.json as { code: string }).code, 'PHOTO_MISSING');
});

test('사진: 지운 노트(deletedAt)는 410 NOTE_DELETED, 사진을 읽지도 않는다', async () => {
  const { source, reads } = fakeSource(
    { photoPath: PHOTO_PATH, deletedAt: '2026-10-01T00:00:00.000Z' },
    JPEG,
  );
  const { response, record } = fakeResponse();

  await sendNotePhoto(source, ACCOUNT, NOTE_ID, response);

  assert.equal(record.status, 410);
  assert.equal((record.json as { code: string }).code, 'NOTE_DELETED');
  assert.deepEqual(reads, []);
});

test('사진: deletedAt 칸이 아예 없는 문서도 안 지워진 것으로 보고 준다(isNoteStored와 같은 == null)', async () => {
  const { source } = fakeSource({ photoPath: PHOTO_PATH } as Pick<PhotoNoteDoc, 'photoPath' | 'deletedAt'>, JPEG);
  const { response, record } = fakeResponse();

  await sendNotePhoto(source, ACCOUNT, NOTE_ID, response);

  assert.equal(record.status, 200);
  assert.equal(record.body, JPEG);
});

test('사진: photoPath가 이 계정 폴더 밖이면 주지 않는다(남의 사진이 나가는 길 0)', async () => {
  const { source, reads } = fakeSource(
    { photoPath: notePhotoPath('user:other', NOTE_ID), deletedAt: null },
    JPEG,
  );
  const { response, record } = fakeResponse();

  await sendNotePhoto(source, ACCOUNT, NOTE_ID, response);

  assert.equal(record.status, 404);
  assert.deepEqual(reads, []);
});

test('사진 쿼리: 앱이 경로를 실어 보내도 버린다 — 서버는 accountKey·noteId만 본다', () => {
  const parsed = GetPhotoNoteImageQuerySchema.safeParse({
    accountKey: ACCOUNT,
    noteId: NOTE_ID,
    photoPath: 'photo-notes/user:other/x.jpg',
  });
  assert.equal(parsed.success, true);
  assert.deepEqual(parsed.success && Object.keys(parsed.data).sort(), ['accountKey', 'noteId']);
});

test("사진 쿼리: noteId에 '/'가 섞이면 거절(Firestore 경로로 읽히지 않게)", () => {
  assert.equal(
    GetPhotoNoteImageQuerySchema.safeParse({ accountKey: ACCOUNT, noteId: 'a/b' }).success,
    false,
  );
  assert.equal(
    GetPhotoNoteImageQuerySchema.safeParse({ accountKey: ACCOUNT, noteId: NOTE_ID }).success,
    true,
  );
});

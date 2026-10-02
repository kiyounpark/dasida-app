import assert from 'node:assert/strict';
import test from 'node:test';

import {
  notePhotoPath,
  PHOTO_OBJECT_META_NOTE_ID,
  PHOTO_OBJECT_META_SUBMISSION_ID,
  type ConsentDoc,
  type ConsentEntry,
  type PhotoNoteDoc,
  type PhotoNoteWire,
  type SavePhotoNoteRequest,
} from '../src/photo-store-contract';
import {
  SavePhotoNoteRequestSchema,
  savePhotoNoteCore,
  type SavePhotoNoteDeps,
  type SavePhotoNoteOutcome,
} from '../src/save-photo-note';

// 1.0.11 2줄 — 약속 파일 「저장 규칙」 ①~④가 그대로 도는지.
// ☁ 「저장됨」은 이 함수의 200 응답으로만 판정한다 — 로컬 저장은 증거가 아니다.

const ACCOUNT = 'user:abc';
const NOW = new Date('2026-10-10T03:00:00.000Z');
const IMAGE = `data:image/jpeg;base64,${Buffer.from('jpeg-bytes').toString('base64')}`;

const NOTE: PhotoNoteWire = {
  id: 'photo-2026-10-10T02:59:00.000Z',
  createdAt: '2026-10-10T02:59:00.000Z',
  schemaVersion: 1,
  dateLabel: '10/10',
  quote: '−12×(−2)=−24',
  why: '음수끼리 곱했다',
  fix: '부호부터 정하자',
  methodLabel: '근의 공식',
  typeLabel: '계산 실수',
  methodId: 'quadratic',
  mistakeType: 'calc_slip',
  weaknessIds: ['formula_understanding'],
  primaryWeaknessId: 'formula_understanding',
  checkPassed: true,
  checkSkipped: false,
  retryResult: 'pass',
};

function request(overrides: Partial<SavePhotoNoteRequest> = {}): SavePhotoNoteRequest {
  return { accountKey: ACCOUNT, note: NOTE, imageDataUrl: IMAGE, submissionId: 'sub_12345678', appVersion: '1.0.11', ...overrides };
}

const ON: ConsentEntry = { version: 1, agreedAt: '2026-10-09T00:00:00.000Z', revokedAt: null };

function codeOf(outcome: SavePhotoNoteOutcome) {
  return outcome.status === 200 ? null : outcome.code;
}

function consent(store = ON): ConsentDoc {
  return {
    schemaVersion: 1,
    accountKey: ACCOUNT,
    analysis: ON,
    store,
    review: { version: 0, agreedAt: null, revokedAt: null },
    via: 'all',
    updatedAt: '2026-10-09T00:00:00.000Z',
    appVersion: '1.0.11',
  };
}

type Fake = {
  deps: SavePhotoNoteDeps;
  notes: Map<string, PhotoNoteDoc>;
  objects: Map<string, { bytes: Buffer; contentType: string; metadata: Record<string, string> }>;
  log: string[];
};

function fake(
  options: {
    consent?: ConsentDoc | null;
    uploadFails?: boolean;
    /** create 직전에 다른 요청이 같은 id 문서를 먼저 만든다 */
    raceWith?: PhotoNoteDoc;
  } = {},
): Fake {
  const notes = new Map<string, PhotoNoteDoc>();
  const objects = new Map<string, { bytes: Buffer; contentType: string; metadata: Record<string, string> }>();
  const log: string[] = [];
  const deps: SavePhotoNoteDeps = {
    readConsent: async () => ('consent' in options ? options.consent ?? null : consent()),
    readNote: async (_accountKey, noteId) => {
      log.push('readNote');
      return notes.get(noteId) ?? null;
    },
    createNote: async (_accountKey, noteId, doc) => {
      log.push('createNote');
      if (options.raceWith) notes.set(noteId, options.raceWith);
      if (notes.has(noteId)) return 'exists';
      notes.set(noteId, doc);
      return 'created';
    },
    objects: {
      readCustomMetadata: async (path) => objects.get(path)?.metadata ?? null,
      save: async (path, bytes, { contentType, metadata }) => {
        log.push('upload');
        if (options.uploadFails) throw new Error('storage down');
        objects.set(path, { bytes, contentType, metadata });
        return 'saved';
      },
    },
    now: () => NOW,
  };
  return { deps, notes, objects, log };
}

// ① 동의

test('① 보관 동의 문서가 없으면 403 CONSENT_REQUIRED — 아무것도 안 쓴다', async () => {
  const f = fake({ consent: null });
  const outcome = await savePhotoNoteCore(f.deps, ACCOUNT, request());

  assert.equal(outcome.status, 403);
  assert.equal(codeOf(outcome), 'CONSENT_REQUIRED');
  assert.deepEqual(f.log, []);
});

test('① 보관을 껐거나 판이 낮으면 403', async () => {
  for (const store of [
    { version: 1, agreedAt: '2026-10-09T00:00:00.000Z', revokedAt: '2026-10-09T01:00:00.000Z' },
    { version: 0, agreedAt: '2026-10-09T00:00:00.000Z', revokedAt: null },
  ]) {
    const outcome = await savePhotoNoteCore(fake({ consent: consent(store) }).deps, ACCOUNT, request());
    assert.equal(outcome.status, 403);
  }
});

// 처음 저장

test('사진 먼저 올리고 문서를 만든다 — photo-notes/{계정}/{stem}.jpg, 메타에 noteId·submissionId', async () => {
  const f = fake();
  const outcome = await savePhotoNoteCore(f.deps, ACCOUNT, request());

  assert.equal(outcome.status, 200);
  assert.deepEqual(outcome.status === 200 && outcome.body, {
    noteId: NOTE.id,
    photoPath: 'photo-notes/user:abc/photo-2026-10-10T02-59-00-000Z.jpg',
    storedAt: NOW.toISOString(),
    alreadyStored: false,
  });
  assert.deepEqual(f.log, ['readNote', 'upload', 'createNote']);

  const object = f.objects.get(notePhotoPath(ACCOUNT, NOTE.id));
  assert.equal(object?.contentType, 'image/jpeg');
  assert.equal(object?.bytes.toString(), 'jpeg-bytes');
  assert.deepEqual(object?.metadata, { [PHOTO_OBJECT_META_NOTE_ID]: NOTE.id, [PHOTO_OBJECT_META_SUBMISSION_ID]: 'sub_12345678' });

  const doc = f.notes.get(NOTE.id);
  assert.equal(doc?.accountKey, ACCOUNT);
  assert.equal(doc?.photoPath, notePhotoPath(ACCOUNT, NOTE.id));
  assert.equal(doc?.submissionId, 'sub_12345678');
  assert.equal(doc?.appVersion, '1.0.11');
  assert.equal(doc?.storedAt, NOW.toISOString());
  assert.equal(doc?.deletedAt, null);
  assert.equal(doc?.quote, NOTE.quote);
});

test('사진 없이 온 노트는 photoPath null로 문서만 — 「저장됨 · 사진 없음」', async () => {
  const f = fake();
  const outcome = await savePhotoNoteCore(f.deps, ACCOUNT, request({ imageDataUrl: null, submissionId: null }));

  assert.equal(outcome.status, 200);
  assert.equal(outcome.status === 200 && outcome.body.photoPath, null);
  assert.deepEqual(f.log, ['readNote', 'createNote']);
  assert.equal(f.notes.get(NOTE.id)?.photoPath, null);
  assert.equal(f.notes.get(NOTE.id)?.submissionId, null);
});

test('③ 사진 올리기가 실패하면 500 TEMPORARY_FAILURE(재시도) — 문서를 안 쓴다', async () => {
  const f = fake({ uploadFails: true });
  const outcome = await savePhotoNoteCore(f.deps, ACCOUNT, request());

  assert.equal(outcome.status, 500);
  assert.equal(codeOf(outcome), 'TEMPORARY_FAILURE');
  assert.equal(f.notes.size, 0);
  assert.ok(!f.log.includes('createNote'));
});

test('undefined 칸(checkSkipped 없음)은 문서에 안 남는다 — Firestore가 undefined를 거절한다', async () => {
  const f = fake();
  const { checkSkipped: _skip, ...withoutSkip } = NOTE;
  await savePhotoNoteCore(f.deps, ACCOUNT, request({ note: withoutSkip }));

  const doc = f.notes.get(NOTE.id)!;
  assert.equal('checkSkipped' in doc, false);
  assert.ok(Object.values(doc).every((value) => value !== undefined));
});

// ② 다시 보냄

test('② 같은 요청을 다시 보내면 200 alreadyStored — 사진도 문서도 다시 안 쓴다', async () => {
  const f = fake();
  const first = await savePhotoNoteCore(f.deps, ACCOUNT, request());
  f.log.length = 0;

  const again = await savePhotoNoteCore(f.deps, ACCOUNT, request());

  assert.equal(again.status, 200);
  assert.deepEqual(again.status === 200 && again.body, {
    noteId: NOTE.id,
    photoPath: first.status === 200 ? first.body.photoPath : null,
    storedAt: NOW.toISOString(),
    alreadyStored: true,
  });
  assert.deepEqual(f.log, ['readNote']);
});

test('② 칸 순서가 달라도 같은 내용이면 alreadyStored (canonicalNoteJson)', async () => {
  const f = fake();
  await savePhotoNoteCore(f.deps, ACCOUNT, request());

  const reordered = Object.fromEntries(Object.entries(NOTE).reverse()) as PhotoNoteWire;
  const again = await savePhotoNoteCore(f.deps, ACCOUNT, request({ note: reordered, submissionId: null, appVersion: '1.0.12' }));

  assert.equal(again.status === 200 && again.body.alreadyStored, true);
});

test('② 같은 id·다른 내용이면 409 NOTE_CONFLICT — 덮지 않는다', async () => {
  const f = fake();
  await savePhotoNoteCore(f.deps, ACCOUNT, request());

  const outcome = await savePhotoNoteCore(f.deps, ACCOUNT, request({ note: { ...NOTE, why: '다른 이유' } }));

  assert.equal(outcome.status, 409);
  assert.equal(codeOf(outcome), 'NOTE_CONFLICT');
  assert.equal(f.notes.get(NOTE.id)?.why, NOTE.why);
});

test('② 지운 노트(deletedAt 있음)면 410 NOTE_DELETED', async () => {
  const f = fake();
  await savePhotoNoteCore(f.deps, ACCOUNT, request());
  f.notes.set(NOTE.id, { ...f.notes.get(NOTE.id)!, deletedAt: '2026-10-11T00:00:00.000Z' });

  const outcome = await savePhotoNoteCore(f.deps, ACCOUNT, request());

  assert.equal(outcome.status, 410);
  assert.equal(codeOf(outcome), 'NOTE_DELETED');
});

// ③ 경로 충돌

test('③ 같은 파일명에 다른 노트 사진이 있으면 409 PATH_CONFLICT — 남의 사진을 덮지 않는다', async () => {
  const f = fake();
  // 'photo-a:b'와 'photo-a-b'는 파일명이 같다(safeNoteFileStem)
  const other = { ...NOTE, id: 'photo-2026-10-10T02-59-00-000Z' };
  await savePhotoNoteCore(f.deps, ACCOUNT, request({ note: other }));
  const before = f.objects.get(notePhotoPath(ACCOUNT, NOTE.id));

  const outcome = await savePhotoNoteCore(f.deps, ACCOUNT, request());

  assert.equal(outcome.status, 409);
  assert.equal(codeOf(outcome), 'PATH_CONFLICT');
  assert.equal(f.objects.get(notePhotoPath(ACCOUNT, NOTE.id)), before);
  assert.equal(f.notes.has(NOTE.id), false);
});

test('③ 앞선 시도가 사진만 올리고 끊겼으면(같은 noteId 메타) 다시 올려 문서를 만든다', async () => {
  const f = fake();
  f.objects.set(notePhotoPath(ACCOUNT, NOTE.id), {
    bytes: Buffer.from('old'),
    contentType: 'image/jpeg',
    metadata: { [PHOTO_OBJECT_META_NOTE_ID]: NOTE.id },
  });

  const outcome = await savePhotoNoteCore(f.deps, ACCOUNT, request());

  assert.equal(outcome.status === 200 && outcome.body.alreadyStored, false);
  assert.equal(f.notes.has(NOTE.id), true);
});

// ④ 동시에 두 번

test('④ create가 ALREADY_EXISTS면 ②로 돌아가 판정 — 같은 내용이면 alreadyStored', async () => {
  const winner: PhotoNoteDoc = {
    ...NOTE,
    accountKey: ACCOUNT,
    photoPath: notePhotoPath(ACCOUNT, NOTE.id),
    submissionId: 'sub_12345678',
    appVersion: '1.0.11',
    storedAt: '2026-10-10T02:59:30.000Z',
    deletedAt: null,
  };
  const f = fake({ raceWith: winner });

  const outcome = await savePhotoNoteCore(f.deps, ACCOUNT, request());

  assert.deepEqual(outcome.status === 200 && outcome.body, {
    noteId: NOTE.id,
    photoPath: winner.photoPath,
    storedAt: winner.storedAt,
    alreadyStored: true,
  });
});

test('④ 먼저 생긴 문서가 다른 내용이면 409', async () => {
  const winner: PhotoNoteDoc = {
    ...NOTE,
    why: '다른 기기',
    accountKey: ACCOUNT,
    photoPath: null,
    submissionId: null,
    appVersion: '1.0.11',
    storedAt: '2026-10-10T02:59:30.000Z',
    deletedAt: null,
  };
  const outcome = await savePhotoNoteCore(fake({ raceWith: winner }).deps, ACCOUNT, request());
  assert.equal(outcome.status, 409);
});

// 요청 모양

test('요청: 문서 id로 못 쓰는 노트 id(/ · . · __x__)는 400', () => {
  for (const id of ['a/b', '.', '..', '__photo__']) {
    assert.equal(SavePhotoNoteRequestSchema.safeParse(request({ note: { ...NOTE, id } })).success, false, id);
  }
  assert.equal(SavePhotoNoteRequestSchema.safeParse(request()).success, true);
});

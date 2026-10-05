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
import { md5Base64 } from '../src/photo-storage';

// 1.0.11 2줄 — 약속 파일 「저장 규칙」 ①~④가 그대로 도는지.
// ☁ 「저장됨」은 이 함수의 200 응답으로만 판정한다 — 로컬 저장은 증거가 아니다.

const ACCOUNT = 'user:abc';
const NOW = new Date('2026-10-10T03:00:00.000Z');
/** JPEG 머리(FF D8)로 시작하는 가짜 사진 */
function jpeg(tail: string): Buffer {
  return Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from(tail)]);
}
function dataUrl(bytes: Buffer): string {
  return `data:image/jpeg;base64,${bytes.toString('base64')}`;
}
const IMAGE = dataUrl(jpeg('photo-A'));

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
      readObjectInfo: async (path) => {
        log.push('readObject');
        const object = objects.get(path);
        return object ? { metadata: object.metadata, md5Hash: md5Base64(object.bytes) } : null;
      },
      save: async (path, bytes, { contentType, metadata, onlyIfAbsent }) => {
        log.push(onlyIfAbsent ? 'upload-if-absent' : 'upload');
        if (options.uploadFails) throw new Error('storage down');
        if (onlyIfAbsent && objects.has(path)) return 'exists'; // 412
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

test('사진 먼저(조건부 생성) 올리고 문서를 만든다 — photo-notes/{계정}/{stem}.jpg, 메타에 noteId·submissionId', async () => {
  const f = fake();
  const outcome = await savePhotoNoteCore(f.deps, ACCOUNT, request());

  assert.equal(outcome.status, 200);
  assert.deepEqual(outcome.status === 200 && outcome.body, {
    noteId: NOTE.id,
    photoPath: 'photo-notes/user:abc/photo-2026-10-10T02-59-00-000Z.jpg',
    storedAt: NOW.toISOString(),
    alreadyStored: false,
  });
  // 검사 → 업로드가 아니라 조건부 생성 하나(덮어쓰기 금지). 객체를 미리 읽지 않는다
  assert.deepEqual(f.log, ['readNote', 'upload-if-absent', 'createNote']);

  const object = f.objects.get(notePhotoPath(ACCOUNT, NOTE.id));
  assert.equal(object?.contentType, 'image/jpeg');
  assert.ok(object?.bytes.equals(jpeg('photo-A')));
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

test('③ JPEG 머리(FF D8)가 아니거나 비었으면 400 — 아무것도 안 쓴다', async () => {
  for (const imageDataUrl of [dataUrl(Buffer.from('not-a-jpeg')), 'data:image/jpeg;base64,']) {
    const f = fake();
    const outcome = await savePhotoNoteCore(f.deps, ACCOUNT, request({ imageDataUrl }));

    assert.equal(outcome.status, 400);
    assert.equal(codeOf(outcome), 'INVALID_REQUEST');
    assert.equal(f.objects.size, 0);
    assert.equal(f.notes.size, 0);
  }
});

test('③ 사진 올리기가 실패하면(412 말고) 500 TEMPORARY_FAILURE(재시도) — 문서를 안 쓴다', async () => {
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

test('③ 412 + 메타 noteId가 다르면 409 PATH_CONFLICT — 남의 사진을 덮지 않는다', async () => {
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

test('③ 412 + 같은 noteId·같은 사진(md5) = 앞선 시도가 사진만 올리고 끊김 → 업로드 생략하고 문서를 만든다', async () => {
  const f = fake();
  const path = notePhotoPath(ACCOUNT, NOTE.id);
  const earlier = { bytes: jpeg('photo-A'), contentType: 'image/jpeg', metadata: { [PHOTO_OBJECT_META_NOTE_ID]: NOTE.id } };
  f.objects.set(path, earlier);

  const outcome = await savePhotoNoteCore(f.deps, ACCOUNT, request());

  assert.equal(outcome.status, 200);
  assert.equal(outcome.status === 200 && outcome.body.alreadyStored, false);
  assert.deepEqual(f.log, ['readNote', 'upload-if-absent', 'readObject', 'createNote']);
  assert.equal(f.objects.get(path), earlier);
  assert.equal(f.notes.get(NOTE.id)?.photoPath, path);
});

test('③ 412 + 같은 noteId·다른 사진(md5) → 409 NOTE_CONFLICT — "A의 글 + B의 사진"을 안 남긴다', async () => {
  const f = fake();
  const path = notePhotoPath(ACCOUNT, NOTE.id);
  const earlier = { bytes: jpeg('photo-B'), contentType: 'image/jpeg', metadata: { [PHOTO_OBJECT_META_NOTE_ID]: NOTE.id } };
  f.objects.set(path, earlier);

  const outcome = await savePhotoNoteCore(f.deps, ACCOUNT, request());

  assert.equal(outcome.status, 409);
  assert.equal(codeOf(outcome), 'NOTE_CONFLICT');
  assert.equal(f.objects.get(path), earlier);
  assert.equal(f.notes.has(NOTE.id), false);
});

test('③ 412 뒤에 객체가 사라졌으면 500(재시도하면 새로 만든다)', async () => {
  const f = fake();
  f.deps.objects.save = async () => 'exists';
  f.deps.objects.readObjectInfo = async () => null;

  const outcome = await savePhotoNoteCore(f.deps, ACCOUNT, request());

  assert.equal(outcome.status, 500);
  assert.equal(f.notes.has(NOTE.id), false);
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

// 1.0.12 ⑵ — 쪽지·재도전·개념 설명. 없어도 되고(1.0.11 앱), 있으면 풀 수 있는 모양만 받는다

const CHECK_QUIZ = { setup: 'x²+6x를 완전제곱식으로', prompt: '무엇을 더하고 빼나?', options: ['3', '9', '36'], answerIndex: 1 };
const RETRY_QUIZ = { setup: 'x²+10x', prompt: '무엇을 더하나?', options: ['5', '25', '100'], answerIndex: 1 };
const CONCEPT = { rule: '완전제곱식은 일차항 계수 절반의 제곱을 더한다', violation: '6의 제곱을 더했다' };
const NOTE_WITH_QUIZ: PhotoNoteWire = { ...NOTE, checkQuiz: CHECK_QUIZ, retryQuiz: RETRY_QUIZ, concept: CONCEPT };

test('⑵ 문제·개념 설명 칸이 있는 노트를 받아 그대로 문서에 남긴다', async () => {
  const f = fake();
  const outcome = await savePhotoNoteCore(f.deps, ACCOUNT, request({ note: NOTE_WITH_QUIZ }));

  assert.equal(outcome.status, 200);
  assert.equal(SavePhotoNoteRequestSchema.safeParse(request({ note: NOTE_WITH_QUIZ })).success, true);
  const doc = f.notes.get(NOTE.id)!;
  assert.deepEqual(doc.checkQuiz, CHECK_QUIZ);
  assert.deepEqual(doc.retryQuiz, RETRY_QUIZ);
  assert.deepEqual(doc.concept, CONCEPT);
});

test('⑵ 문제 칸 없는 1.0.11 노트도 그대로 받는다', () => {
  assert.equal(SavePhotoNoteRequestSchema.safeParse(request()).success, true);
  const { checkSkipped: _s, ...legacy } = NOTE;
  assert.equal(SavePhotoNoteRequestSchema.safeParse(request({ note: legacy })).success, true);
});

test('⑵ 풀 수 없는 문제는 400 — 정답 번호가 보기 밖 · 보기 1개 · 정수 아님 · 빈 질문', () => {
  const bad = [
    { ...CHECK_QUIZ, answerIndex: 3 },
    { ...CHECK_QUIZ, answerIndex: -1 },
    { ...CHECK_QUIZ, answerIndex: 0.5 },
    { ...CHECK_QUIZ, options: ['9'], answerIndex: 0 },
    { ...CHECK_QUIZ, prompt: '' },
  ];
  for (const checkQuiz of bad) {
    const note = { ...NOTE, checkQuiz } as PhotoNoteWire;
    assert.equal(SavePhotoNoteRequestSchema.safeParse(request({ note })).success, false, JSON.stringify(checkQuiz));
    const retryNote = { ...NOTE, retryQuiz: checkQuiz } as PhotoNoteWire;
    assert.equal(SavePhotoNoteRequestSchema.safeParse(request({ note: retryNote })).success, false, JSON.stringify(checkQuiz));
  }
});

test('⑵ 문제·개념 칸 안에 모르는 칸이 섞이면 400(.strict)', () => {
  const quizExtra = { ...NOTE, checkQuiz: { ...CHECK_QUIZ, picked: 0 } } as unknown as PhotoNoteWire;
  const conceptExtra = { ...NOTE, concept: { ...CONCEPT, shown: true } } as unknown as PhotoNoteWire;
  const conceptEmpty = { ...NOTE, concept: { rule: '', violation: 'v' } } as PhotoNoteWire;
  for (const note of [quizExtra, conceptExtra, conceptEmpty]) {
    assert.equal(SavePhotoNoteRequestSchema.safeParse(request({ note })).success, false);
  }
});

test('⑵ 문제 칸 안의 키 순서가 바뀌어 다시 와도 alreadyStored — Firestore 왕복 뒤 409 방지', async () => {
  const f = fake();
  await savePhotoNoteCore(f.deps, ACCOUNT, request({ note: NOTE_WITH_QUIZ }));
  const reverse = <T extends object>(value: T) => Object.fromEntries(Object.entries(value).reverse()) as T;
  // 서버 문서 쪽 안쪽 객체 키 순서를 뒤집는다 — Firestore가 맵을 다른 순서로 돌려준 경우
  const stored = f.notes.get(NOTE.id)!;
  f.notes.set(NOTE.id, { ...stored, checkQuiz: reverse(stored.checkQuiz!), concept: reverse(stored.concept!) });

  const again = await savePhotoNoteCore(f.deps, ACCOUNT, request({ note: { ...NOTE_WITH_QUIZ, retryQuiz: reverse(RETRY_QUIZ) } }));

  assert.equal(again.status === 200 && again.body.alreadyStored, true);
});

test('⑵ 보기 순서가 다르면 다른 노트(409) — 정답 번호가 그 순서를 가리킨다', async () => {
  const f = fake();
  await savePhotoNoteCore(f.deps, ACCOUNT, request({ note: NOTE_WITH_QUIZ }));

  const swapped = { ...CHECK_QUIZ, options: ['9', '3', '36'] };
  const outcome = await savePhotoNoteCore(f.deps, ACCOUNT, request({ note: { ...NOTE_WITH_QUIZ, checkQuiz: swapped } }));

  assert.equal(codeOf(outcome), 'NOTE_CONFLICT');
});

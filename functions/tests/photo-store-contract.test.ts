import assert from 'node:assert/strict';
import test from 'node:test';

import {
  accountNotePhotoPrefix,
  buildPhotoNoteDoc,
  isConsentOn,
  isNoteStored,
  reviewExpiresAt,
  reviewPhotoPath,
  toLocalNote,
  type PhotoNoteWire,
} from '../src/photo-store-contract';
import { SaveConsentRequestSchema } from '../src/save-consent';
import { SavePhotoNoteRequestSchema } from '../src/save-photo-note';

// 1.0.11 줄 0 — 약속 파일과 껍데기 스키마가 세 줄이 기대는 뜻대로 도는지.

const NOTE: PhotoNoteWire = {
  id: 'photo-2026-09-15T12:34:56.789Z',
  createdAt: '2026-09-15T12:34:56.789Z',
  schemaVersion: 1,
  dateLabel: '9/15',
  quote: 'q',
  why: 'w',
  fix: 'f',
  methodLabel: 'm',
  typeLabel: 't',
  methodId: 'cps',
  mistakeType: 'calc_slip',
  weaknessIds: ['g3_seq_sum_term'],
  primaryWeaknessId: 'g3_seq_sum_term',
  checkPassed: true,
  retryResult: 'pass',
};

const SAVE_REQUEST = {
  accountKey: 'user:abc',
  note: NOTE,
  imageDataUrl: 'data:image/jpeg;base64,AAAA',
  submissionId: 'sub_12345678',
  appVersion: '1.0.11',
};

test('동의: 같은 시각에 켜고 끈 건 꺼짐으로 본다', () => {
  const t = '2026-10-10T00:00:00.000Z';
  assert.equal(isConsentOn({ version: 1, agreedAt: t, revokedAt: t }, 'review'), false);
});

test('동의: 판이 낮으면 꺼짐(재동의 대상)', () => {
  assert.equal(
    isConsentOn({ version: 0, agreedAt: '2026-10-10T00:00:00.000Z', revokedAt: null }, 'store'),
    false,
  );
});

test('검토본 경로·만료·탈퇴 prefix', () => {
  assert.equal(
    reviewPhotoPath('2026-10-10', 'user:abc', 'sub_12345678'),
    'review/2026-10-10/user:abc/sub_12345678.jpg',
  );
  assert.equal(reviewExpiresAt('2026-10-10T00:00:00.000Z'), '2026-11-09T00:00:00.000Z');
  assert.equal(accountNotePhotoPrefix('user:abc'), 'photo-notes/user:abc/');
});

test('노트 문서: 만들면 저장됨, 내려받으면 서버 칸이 빠지고 cloudStoredAt이 붙는다', () => {
  const doc = buildPhotoNoteDoc(NOTE, {
    accountKey: 'user:abc',
    photoPath: 'photo-notes/user:abc/x.jpg',
    submissionId: null,
    appVersion: '1.0.11',
    storedAt: '2026-10-10T00:00:00.000Z',
  });
  assert.equal(isNoteStored(doc), true);
  assert.equal(isNoteStored({ ...doc, deletedAt: '2026-10-11T00:00:00.000Z' }), false);

  const local = toLocalNote(doc, 'file:///doc/photo-notes/x.jpg');
  assert.equal(local.cloudStoredAt, '2026-10-10T00:00:00.000Z');
  assert.equal('accountKey' in local, false);
  assert.equal('photoPath' in local, false);
});

test('savePhotoNote 요청: 맞는 모양은 통과', () => {
  assert.equal(SavePhotoNoteRequestSchema.safeParse(SAVE_REQUEST).success, true);
  assert.equal(
    SavePhotoNoteRequestSchema.safeParse({ ...SAVE_REQUEST, imageDataUrl: null, submissionId: null }).success,
    true,
  );
});

test('savePhotoNote 요청: 폰 전용 칸(photoUri)이 섞이면 거절', () => {
  const withPhotoUri = { ...SAVE_REQUEST, note: { ...NOTE, photoUri: 'file:///x.jpg' } };
  assert.equal(SavePhotoNoteRequestSchema.safeParse(withPhotoUri).success, false);
});

test('savePhotoNote 요청: 실수 유형은 6개 밖이면 거절, png는 거절', () => {
  const badType = { ...SAVE_REQUEST, note: { ...NOTE, mistakeType: 'typo' } };
  assert.equal(SavePhotoNoteRequestSchema.safeParse(badType).success, false);
  const png = { ...SAVE_REQUEST, imageDataUrl: 'data:image/png;base64,AAAA' };
  assert.equal(SavePhotoNoteRequestSchema.safeParse(png).success, false);
});

test('saveConsent 요청: 세 칸 전부와 누른 방식이 있어야 한다', () => {
  const ok = {
    accountKey: 'user:abc',
    decisions: { analysis: true, store: true, review: false },
    copyVersion: { analysis: 1, store: 1, review: 1 },
    via: 'individual',
    appVersion: '1.0.11',
  };
  assert.equal(SaveConsentRequestSchema.safeParse(ok).success, true);
  assert.equal(SaveConsentRequestSchema.safeParse({ ...ok, via: 'swipe' }).success, false);
  assert.equal(
    SaveConsentRequestSchema.safeParse({ ...ok, decisions: { analysis: true, store: true } }).success,
    false,
  );
});

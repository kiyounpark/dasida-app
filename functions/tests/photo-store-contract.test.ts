import assert from 'node:assert/strict';
import test from 'node:test';

import {
  accountNotePhotoPrefix,
  buildPhotoNoteDoc,
  isConsentOn,
  isNoteStored,
  readApiErrorBody,
  reviewExpiresAt,
  reviewPhotoPath,
  toLocalNote,
  type PhotoNoteWire,
} from '../src/photo-store-contract';
import { requireFirebaseAccount } from '../src/photo-store-http';
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

test('저장됨: deletedAt 칸이 아예 없는 문서(콘솔에서 손으로 넣은 것)도 저장됨', () => {
  const doc = buildPhotoNoteDoc(NOTE, {
    accountKey: 'user:abc',
    photoPath: null,
    submissionId: null,
    appVersion: null,
    storedAt: '2026-10-10T00:00:00.000Z',
  });
  const { deletedAt: _d, ...withoutDeletedAt } = doc;
  assert.equal(isNoteStored(withoutDeletedAt as typeof doc), true);
});

test('오류 응답 읽기: 아는 code만 받고, 403 동의 필요를 인증 실패와 가른다', () => {
  assert.deepEqual(readApiErrorBody({ error: 'x', code: 'CONSENT_REQUIRED', retryable: false }), {
    error: 'x',
    code: 'CONSENT_REQUIRED',
    retryable: false,
  });
  assert.equal(readApiErrorBody({ error: 'Authenticated users only' }), null);
  assert.equal(readApiErrorBody({ error: 'x', code: 'SOMETHING_NEW' }), null);
  assert.equal(readApiErrorBody(null), null);
  assert.equal(readApiErrorBody({ code: 'TEMPORARY_FAILURE' })?.retryable, true);
});

test('인증 도우미: user: 아닌 키는 공용 인증(Firestore 쓰기)까지 가기 전에 403', async () => {
  let status = 0;
  let body: unknown = null;
  const response = {
    status(code: number) {
      status = code;
      return {
        json(payload: unknown) {
          body = payload;
          return payload;
        },
      };
    },
  };
  // 헤더·세션 비밀을 다 갖춰도 — 공용 함수였다면 users/probe-anon/private/auth를 썼을 요청
  const headers = { 'x-dasida-account-key': 'probe-anon', 'x-dasida-session-secret': 'secret' };
  const result = await requireFirebaseAccount(headers, 'probe-anon', response);
  assert.equal(result, null);
  assert.equal(status, 403);
  assert.equal((body as { code?: string }).code, 'UNAUTHORIZED');
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

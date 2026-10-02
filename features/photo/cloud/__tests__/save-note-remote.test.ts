import { photoStoreUrl } from '@/functions/src/photo-store-contract';

import { setPhotoNoteCloudStoredAt } from '../../note-store';
import type { PhotoNote } from '../../types';
import {
  cloudStateFromOutcome,
  getCloudNoteState,
  saveNoteRemote,
  toPhotoNoteWire,
  uploadPhotoNote,
} from '../save-note-remote';

// 로컬 표시 쓰기는 note-store.test.ts가 본다 — 여기선 "서버가 저장됐다고 답한 뒤에만 부르는가"
jest.mock('../../note-store', () => ({
  setPhotoNoteCloudStoredAt: jest.fn(async () => true),
}));

const mockSetStoredAt = setPhotoNoteCloudStoredAt as jest.Mock;
const ACCOUNT = 'user:abc';
const IMAGE = 'data:image/jpeg;base64,AAAA';
const AUTH = { 'x-dasida-account-key': ACCOUNT, Authorization: 'Bearer token' };
const NO_RETRY_WAIT = [0, 0];

function note(overrides: Partial<PhotoNote> = {}): PhotoNote {
  return {
    id: 'photo-2026-10-10T02:59:00.000Z',
    createdAt: '2026-10-10T02:59:00.000Z',
    schemaVersion: 1,
    dateLabel: '10/10',
    photoUri: 'file:///document/photo-notes/photo-2026-10-10T02-59-00-000Z.jpg',
    quote: 'q',
    why: 'w',
    fix: 'f',
    methodLabel: '근의 공식',
    typeLabel: '계산 실수',
    methodId: 'quadratic',
    mistakeType: 'calc_slip',
    weaknessIds: ['formula_understanding'],
    primaryWeaknessId: 'formula_understanding',
    checkPassed: true,
    checkSkipped: false,
    retryResult: 'pass',
    submissionId: '8f14e45f-ceea-467a-9575-1b2c3d4e5f60',
    ...overrides,
  };
}

function reply(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

const STORED = {
  noteId: 'photo-2026-10-10T02:59:00.000Z',
  photoPath: 'photo-notes/user:abc/photo-2026-10-10T02-59-00-000Z.jpg',
  storedAt: '2026-10-10T03:00:00.000Z',
  alreadyStored: false,
};

const fetchMock = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('toPhotoNoteWire', () => {
  it('폰 전용 칸 셋(photoUri·submissionId·cloudStoredAt)을 싣지 않는다 — 서버가 .strict', () => {
    const wire = toPhotoNoteWire(note({ cloudStoredAt: '2026-10-10T00:00:00.000Z' }));

    expect('photoUri' in wire).toBe(false);
    expect('submissionId' in wire).toBe(false);
    expect('cloudStoredAt' in wire).toBe(false);
    expect(wire.id).toBe('photo-2026-10-10T02:59:00.000Z');
  });

  it('옛 노트: primaryWeaknessId 없으면 null, checkSkipped 없으면 칸 없음, 모르는 칸은 버린다', () => {
    const legacy = { ...note(), legacyField: 'x' } as PhotoNote & { legacyField: string };
    delete (legacy as Partial<PhotoNote>).primaryWeaknessId;
    delete (legacy as Partial<PhotoNote>).checkSkipped;

    const wire = toPhotoNoteWire(legacy);

    expect(wire.primaryWeaknessId).toBeNull();
    expect('checkSkipped' in wire).toBe(false);
    expect('legacyField' in wire).toBe(false);
  });
});

describe('saveNoteRemote', () => {
  it('savePhotoNote로 노트·축소본·submissionId를 인증 헤더와 함께 보낸다', async () => {
    fetchMock.mockResolvedValue(reply(200, STORED));

    const outcome = await saveNoteRemote({
      accountKey: ACCOUNT,
      note: note(),
      imageDataUrl: IMAGE,
      getHeaders: async () => AUTH,
    });

    expect(outcome).toEqual({ ok: true, response: STORED });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(photoStoreUrl('savePhotoNote'));
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json', Authorization: 'Bearer token' });
    const body = JSON.parse(init.body);
    expect(body).toEqual({
      accountKey: ACCOUNT,
      note: toPhotoNoteWire(note()),
      imageDataUrl: IMAGE,
      submissionId: '8f14e45f-ceea-467a-9575-1b2c3d4e5f60',
      appVersion: null,
    });
  });

  it('옛 노트(submissionId 없음)는 null — 지어내지 않는다. 패턴 밖 번호도 null', async () => {
    fetchMock.mockResolvedValue(reply(200, STORED));

    await saveNoteRemote({ accountKey: ACCOUNT, note: note({ submissionId: undefined }), imageDataUrl: null, getHeaders: async () => AUTH });
    await saveNoteRemote({ accountKey: ACCOUNT, note: note({ submissionId: 'sub-1' }), imageDataUrl: null, getHeaders: async () => AUTH });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).submissionId).toBeNull();
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).submissionId).toBeNull();
  });

  it('500(재시도 가능)이면 같은 요청을 다시 보낸다 — 두 번째가 alreadyStored면 저장됨', async () => {
    fetchMock
      .mockResolvedValueOnce(reply(500, { error: 'x', code: 'TEMPORARY_FAILURE', retryable: true }))
      .mockResolvedValueOnce(reply(200, { ...STORED, alreadyStored: true }));

    const outcome = await saveNoteRemote({
      accountKey: ACCOUNT,
      note: note(),
      imageDataUrl: IMAGE,
      getHeaders: async () => AUTH,
      retryDelaysMs: NO_RETRY_WAIT,
    });

    expect(outcome.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].body).toBe(fetchMock.mock.calls[0][1].body);
  });

  it('망이 끊겨도 다시 보낸다(최대 3번) — 끝까지 안 되면 재시도 가능한 실패', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    const outcome = await saveNoteRemote({
      accountKey: ACCOUNT,
      note: note(),
      imageDataUrl: IMAGE,
      getHeaders: async () => AUTH,
      retryDelaysMs: NO_RETRY_WAIT,
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(outcome).toEqual({ ok: false, status: null, code: 'NETWORK_ERROR', retryable: true });
  });

  it.each([
    [403, 'CONSENT_REQUIRED'],
    [409, 'NOTE_CONFLICT'],
    [409, 'PATH_CONFLICT'],
    [410, 'NOTE_DELETED'],
    [400, 'INVALID_REQUEST'],
  ])('%s %s는 다시 안 보낸다', async (status, code) => {
    fetchMock.mockResolvedValue(reply(status, { error: 'x', code, retryable: false }));

    const outcome = await saveNoteRemote({
      accountKey: ACCOUNT,
      note: note(),
      imageDataUrl: IMAGE,
      getHeaders: async () => AUTH,
      retryDelaysMs: NO_RETRY_WAIT,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(outcome).toEqual({ ok: false, status, code, retryable: false });
  });

  it('토큰을 못 받으면(계정 키만) 사진을 안 보낸다 — 재시도 가능한 실패', async () => {
    const outcome = await saveNoteRemote({
      accountKey: ACCOUNT,
      note: note(),
      imageDataUrl: IMAGE,
      getHeaders: async () => ({ 'x-dasida-account-key': ACCOUNT }),
      retryDelaysMs: NO_RETRY_WAIT,
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(outcome).toEqual({ ok: false, status: null, code: 'NO_AUTH', retryable: true });
  });
});

describe('cloudStateFromOutcome', () => {
  it('서버 응답만 「저장됨」이 된다 — 사진 경로가 없으면 「사진 없음」', () => {
    expect(cloudStateFromOutcome({ ok: true, response: STORED })).toEqual({
      kind: 'stored',
      storedAt: STORED.storedAt,
      hasPhoto: true,
    });
    expect(cloudStateFromOutcome({ ok: true, response: { ...STORED, photoPath: null } })).toMatchObject({
      hasPhoto: false,
    });
    expect(cloudStateFromOutcome({ ok: false, status: 409, code: 'NOTE_CONFLICT', retryable: false })).toEqual({
      kind: 'failed',
      retryable: false,
    });
  });
});

describe('uploadPhotoNote', () => {
  it('「저장 중」 → 서버 응답 뒤 「저장됨」, 로컬 저장이 끝난 뒤에 cloudStoredAt을 적는다', async () => {
    const order: string[] = [];
    let resolveFetch: (value: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (resolveFetch = resolve)));
    mockSetStoredAt.mockImplementation(async () => {
      order.push('mark');
      return true;
    });
    const localSaved = Promise.resolve().then(() => order.push('local'));
    const target = note({ id: 'photo-upload-1' });

    const done = uploadPhotoNote({ accountKey: ACCOUNT, note: target, imageDataUrl: IMAGE, getHeaders: async () => AUTH, localSaved });
    expect(getCloudNoteState(target.id)).toEqual({ kind: 'saving' });

    await Promise.resolve();
    resolveFetch(reply(200, { ...STORED, noteId: target.id }));
    const state = await done;

    expect(state).toEqual({ kind: 'stored', storedAt: STORED.storedAt, hasPhoto: true });
    expect(getCloudNoteState(target.id)).toEqual(state);
    expect(mockSetStoredAt).toHaveBeenCalledWith(ACCOUNT, target.id, STORED.storedAt);
    expect(order).toEqual(['local', 'mark']);
  });

  it('서버가 거절하면 「저장 못 함」 — 로컬 표시는 안 적는다', async () => {
    fetchMock.mockResolvedValue(reply(403, { error: 'x', code: 'CONSENT_REQUIRED', retryable: false }));
    const target = note({ id: 'photo-upload-2' });

    const state = await uploadPhotoNote({ accountKey: ACCOUNT, note: target, imageDataUrl: IMAGE, getHeaders: async () => AUTH });

    expect(state).toEqual({ kind: 'failed', retryable: false });
    expect(getCloudNoteState(target.id)).toEqual(state);
    expect(mockSetStoredAt).not.toHaveBeenCalled();
  });
});

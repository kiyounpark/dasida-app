/**
 * 다른 기기 보기 — 읽기 쪽 (1.0.11 3줄).
 * 서버(readLearningHistoryApiJson)·파일(expo-file-system)·기기 저장(note-store)은 전부 목이다.
 */

const mockDownload = jest.fn();
const mockFs = { deleted: [] as string[] };

jest.mock('expo-file-system', () => {
  class FakeFile {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((part) => (typeof part === 'string' ? part : part.uri)).join('/');
    }
    get exists() {
      return true;
    }
    delete() {
      mockFs.deleted.push(this.uri);
    }
    static downloadFileAsync(...args: unknown[]) {
      return mockDownload(...args);
    }
  }
  return {
    File: FakeFile,
    Paths: {
      get cache() {
        return new FakeFile('file:///cache');
      },
    },
  };
});

jest.mock('@/features/learning/firebase-learning-history-api', () => {
  const actual = jest.requireActual('@/features/learning/firebase-learning-history-api');
  return { ...actual, readLearningHistoryApiJson: jest.fn() };
});

jest.mock('../note-store', () => ({ savePhotoNote: jest.fn(async () => []) }));

jest.mock('../photo-file-store', () => ({
  persistNotePhoto: jest.fn(
    (noteId: string) => `file:///document/photo-notes/${noteId.replace(/[^A-Za-z0-9_-]/g, '-')}.jpg`,
  ),
  deleteNotePhoto: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  LearningHistoryApiError,
  readLearningHistoryApiJson,
} from '@/features/learning/firebase-learning-history-api';
import {
  buildPhotoNoteDoc,
  notePhotoPath,
  type PhotoNoteDoc,
} from '@/functions/src/photo-store-contract';

import { savePhotoNote } from '../note-store';
import { deleteNotePhoto, persistNotePhoto } from '../photo-file-store';
import type { PhotoNote } from '../types';
import {
  downloadRemoteNotePhoto,
  listRemotePhotoNotes,
  loadRemotePhotoNotes,
  mergePhotoNotes,
} from './remote-note-store';

const ACCOUNT = 'user:abc';
const HEADERS = { 'x-dasida-account-key': ACCOUNT, Authorization: 'Bearer token-1' };
const STORED_AT = '2026-10-02T06:00:00.000Z';

const mockReadJson = readLearningHistoryApiJson as jest.Mock;
const mockSave = savePhotoNote as jest.Mock;
const mockPersist = persistNotePhoto as jest.Mock;
const mockDeletePhoto = deleteNotePhoto as jest.Mock;

function serverDoc(createdAt: string, overrides: Partial<PhotoNoteDoc> = {}): PhotoNoteDoc {
  const id = `photo-${createdAt}`;
  return {
    ...buildPhotoNoteDoc(
      {
        id,
        createdAt,
        schemaVersion: 1,
        dateLabel: '9/20',
        quote: '서버 인용',
        why: '서버 이유',
        fix: '서버 처방',
        methodLabel: '서버 풀이',
        typeLabel: '계산 실수',
        methodId: 'quadratic',
        mistakeType: 'calc_slip',
        weaknessIds: ['formula_understanding'],
        primaryWeaknessId: 'formula_understanding',
        checkPassed: true,
        retryResult: 'pass',
      },
      {
        accountKey: ACCOUNT,
        photoPath: notePhotoPath(ACCOUNT, id),
        submissionId: 'sub_12345678',
        appVersion: '1.0.11',
        storedAt: STORED_AT,
      },
    ),
    ...overrides,
  };
}

function localNote(createdAt: string, overrides: Partial<PhotoNote> = {}): PhotoNote {
  return {
    id: `photo-${createdAt}`,
    createdAt,
    schemaVersion: 1,
    dateLabel: '9/15',
    photoUri: 'file:///document/photo-notes/local.jpg',
    quote: '로컬 인용',
    why: '로컬 이유',
    fix: '로컬 처방',
    methodLabel: '근의 공식',
    typeLabel: '계산 실수',
    methodId: 'quadratic',
    mistakeType: 'calc_slip',
    weaknessIds: ['formula_understanding'],
    primaryWeaknessId: 'formula_understanding',
    checkPassed: true,
    retryResult: 'pass',
    ...overrides,
  };
}

function serverReplies(...pages: { notes: unknown[]; nextBefore: string | null }[]) {
  for (const page of pages) mockReadJson.mockResolvedValueOnce(page);
}

const T1 = '2026-09-15T01:00:00.000Z';
const T2 = '2026-09-20T01:00:00.000Z';
const T3 = '2026-09-25T01:00:00.000Z';

beforeEach(() => {
  jest.clearAllMocks();
  mockFs.deleted = [];
  mockDownload.mockImplementation(async (_url: string, destination: { uri: string }) => destination);
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  (console.warn as jest.Mock).mockRestore();
});

async function run(local: PhotoNote[], options: { cancelAfterDownload?: boolean } = {}) {
  const updates: PhotoNote[][] = [];
  let cancelled = false;
  if (options.cancelAfterDownload) {
    mockDownload.mockImplementation(async (_url: string, destination: { uri: string }) => {
      cancelled = true;
      return destination;
    });
  }

  await loadRemotePhotoNotes(ACCOUNT, local, async () => HEADERS, {
    isCancelled: () => cancelled,
    onUpdate: (notes) => updates.push(notes),
  });
  return updates;
}

describe('서버 목록 읽기', () => {
  it('계정·쪽 크기만 싣고 같은 헤더로 GET — 커서(nextBefore)를 따라 끝까지 읽는다', async () => {
    serverReplies(
      { notes: [serverDoc(T3)], nextBefore: T3 },
      { notes: [serverDoc(T2)], nextBefore: null },
    );

    const docs = await listRemotePhotoNotes(ACCOUNT, HEADERS);

    expect(docs.map((doc) => doc.createdAt)).toEqual([T3, T2]);
    const [firstUrl, init] = mockReadJson.mock.calls[0];
    expect(firstUrl).toBe(
      `https://asia-northeast3-dasida-app.cloudfunctions.net/listPhotoNotes?accountKey=${encodeURIComponent(ACCOUNT)}&limit=200`,
    );
    expect(init).toEqual({ method: 'GET', headers: HEADERS });
    expect(mockReadJson.mock.calls[1][0]).toContain(`&before=${encodeURIComponent(T3)}`);
  });

  it('커서가 안 나아가면 멈춘다(같은 쪽을 계속 부르지 않게)', async () => {
    serverReplies(
      { notes: [serverDoc(T2)], nextBefore: T2 },
      { notes: [], nextBefore: T2 },
    );

    await listRemotePhotoNotes(ACCOUNT, HEADERS);

    expect(mockReadJson).toHaveBeenCalledTimes(2);
  });

  it('모양이 깨진 문서는 버린다 — 카드가 죽지 않게', async () => {
    serverReplies({ notes: [serverDoc(T2), { id: 'x' }, null], nextBefore: null });

    const docs = await listRemotePhotoNotes(ACCOUNT, HEADERS);

    expect(docs).toHaveLength(1);
  });
});

describe('사진 내려받기', () => {
  it('앱은 경로를 안 보낸다 — accountKey·noteId만, 같은 인증 헤더로', async () => {
    const uri = await downloadRemoteNotePhoto(ACCOUNT, `photo-${T2}`, HEADERS);

    const [url, destination, options] = mockDownload.mock.calls[0];
    expect(url).toBe(
      `https://asia-northeast3-dasida-app.cloudfunctions.net/getPhotoNoteImage?accountKey=${encodeURIComponent(ACCOUNT)}&noteId=${encodeURIComponent(`photo-${T2}`)}`,
    );
    expect(url).not.toContain('photo-notes/');
    expect(options).toEqual({ headers: HEADERS, idempotent: true });
    // 캐시에 받고 → 문서 폴더로 같은 파일명 규칙(safeNoteFileStem)으로 옮긴 뒤 캐시는 치운다
    expect(destination.uri).toBe('file:///cache/remote-note-photo-2026-09-20T01-00-00-000Z.jpg');
    expect(mockPersist).toHaveBeenCalledWith(`photo-${T2}`, destination.uri);
    expect(uri).toBe('file:///document/photo-notes/photo-2026-09-20T01-00-00-000Z.jpg');
    expect(mockFs.deleted).toEqual([destination.uri]);
  });

  it('서버가 404·500이거나 망이 끊기면 null', async () => {
    mockDownload.mockRejectedValueOnce(new Error('UnableToDownload: 404'));

    await expect(downloadRemoteNotePhoto(ACCOUNT, `photo-${T2}`, HEADERS)).resolves.toBeNull();
    expect(mockPersist).not.toHaveBeenCalled();
  });
});

describe('로컬 + 서버 합치기', () => {
  it('같은 id면 로컬 우선 — 서버 것을 받지도 남기지도 않는다', async () => {
    const local = [localNote(T2)];
    serverReplies({ notes: [serverDoc(T2)], nextBefore: null });

    const updates = await run(local);

    expect(updates).toEqual([]);
    expect(mockDownload).not.toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
    expect(mergePhotoNotes(local, [localNote(T2, { why: '서버 이유' })])[0].why).toBe('로컬 이유');
  });

  it('서버에만 있는 노트 — 글 먼저 한 번, 사진까지 받고 한 번 더. 최신순', async () => {
    serverReplies({ notes: [serverDoc(T3), serverDoc(T2)], nextBefore: null });

    const updates = await run([localNote(T1)]);

    expect(updates).toHaveLength(2);
    expect(updates[0].map((note) => note.createdAt)).toEqual([T3, T2, T1]);
    expect(updates[0][0].photoUri).toBeNull();
    expect(updates[1][0].photoUri).toBe('file:///document/photo-notes/photo-2026-09-25T01-00-00-000Z.jpg');
  });

  it('가져온 노트는 폰 모양으로 — 서버 칸이 빠지고 cloudStoredAt이 붙어 기기에 남는다', async () => {
    serverReplies({ notes: [serverDoc(T2)], nextBefore: null });

    await run([]);

    expect(mockSave).toHaveBeenCalledTimes(1);
    const [account, saved] = mockSave.mock.calls[0];
    expect(account).toBe(ACCOUNT);
    expect(saved).toMatchObject({
      id: `photo-${T2}`,
      why: '서버 이유',
      photoUri: 'file:///document/photo-notes/photo-2026-09-20T01-00-00-000Z.jpg',
      submissionId: 'sub_12345678',
      cloudStoredAt: STORED_AT,
    });
    for (const serverOnly of ['accountKey', 'photoPath', 'appVersion', 'storedAt', 'deletedAt']) {
      expect(saved).not.toHaveProperty(serverOnly);
    }
  });

  it('deletedAt 있는 노트는 그리지도 받지도 않는다', async () => {
    serverReplies({
      notes: [serverDoc(T3, { deletedAt: '2026-10-01T00:00:00.000Z' }), serverDoc(T2)],
      nextBefore: null,
    });

    const updates = await run([]);

    expect(updates.at(-1)?.map((note) => note.createdAt)).toEqual([T2]);
    expect(mockDownload).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it('사진 없이 올린 노트(photoPath null)는 내려받지 않고 글만 남긴다', async () => {
    serverReplies({ notes: [serverDoc(T2, { photoPath: null })], nextBefore: null });

    await run([]);

    expect(mockDownload).not.toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalledWith(ACCOUNT, expect.objectContaining({ photoUri: null }));
  });

  it('사진을 못 받으면 이번엔 글만 보여 주고 기기에 남기지 않는다 — 다음에 열 때 다시 받게', async () => {
    serverReplies({ notes: [serverDoc(T2)], nextBefore: null });
    mockDownload.mockRejectedValueOnce(new Error('network'));

    const updates = await run([]);

    expect(updates.at(-1)?.[0].photoUri).toBeNull();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('서버 실패·오프라인 = 로컬만: 아무것도 안 넘기고 던지지 않는다', async () => {
    mockReadJson.mockRejectedValueOnce(
      new LearningHistoryApiError('네트워크 연결을 확인한 뒤 다시 시도해 주세요.', 0, 'NETWORK_ERROR'),
    );

    await expect(run([localNote(T1)])).resolves.toEqual([]);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('인증 실패(401)도 로컬만', async () => {
    mockReadJson.mockRejectedValueOnce(new LearningHistoryApiError('Missing Firebase ID token', 401, 'UNAUTHORIZED'));

    await expect(run([])).resolves.toEqual([]);
  });

  it('401·403에서 토큰 갱신·재전송을 하지 않는다 — 헤더 한 번, 요청 한 번(403 CONSENT_REQUIRED가 그 길로 안 가게)', async () => {
    const getHeaders = jest.fn(async () => HEADERS);
    mockReadJson.mockRejectedValueOnce(new LearningHistoryApiError('Consent required', 403, 'UNAUTHORIZED'));

    await loadRemotePhotoNotes(ACCOUNT, [], getHeaders, { isCancelled: () => false, onUpdate: () => {} });

    expect(getHeaders).toHaveBeenCalledTimes(1);
    expect(mockReadJson).toHaveBeenCalledTimes(1);
  });

  it('deletedAt 칸이 아예 없는 문서(콘솔에서 손으로 넣은 것)는 안 지워진 것으로 본다', async () => {
    const { deletedAt: _omit, ...withoutDeletedAt } = serverDoc(T2, { photoPath: null });
    serverReplies({ notes: [withoutDeletedAt], nextBefore: null });

    const updates = await run([]);

    expect(updates.at(-1)?.map((note) => note.createdAt)).toEqual([T2]);
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it('화면을 떠나면(로그아웃일 수 있다) 남기지 않고, 받아 둔 사진은 치운다', async () => {
    serverReplies({ notes: [serverDoc(T2)], nextBefore: null });

    const updates = await run([], { cancelAfterDownload: true });

    expect(mockSave).not.toHaveBeenCalled();
    expect(mockDeletePhoto).toHaveBeenCalledWith(
      'file:///document/photo-notes/photo-2026-09-20T01-00-00-000Z.jpg',
    );
    expect(updates).toHaveLength(1); // 글만 먼저 넘긴 한 번 — 떠난 뒤엔 안 넘긴다
  });

  it('복원하며 복습 과제를 다시 만들지 않는다 — 부르는 서버는 목록뿐, 기기에 쓰는 건 노트 저장뿐', async () => {
    serverReplies({ notes: [serverDoc(T3), serverDoc(T2, { photoPath: null })], nextBefore: null });

    await run([]);

    expect(mockReadJson).toHaveBeenCalledTimes(1);
    expect(mockReadJson.mock.calls[0][0]).toContain('/listPhotoNotes?');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalledTimes(2);
  });
});

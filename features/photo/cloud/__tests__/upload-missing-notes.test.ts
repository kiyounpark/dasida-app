import { ImageManipulator } from 'expo-image-manipulator';

import { downscaleToDataUrl } from '../../flow/analyze-photo-request';
import type { PhotoNote } from '../../types';
import { setCloudNoteState, uploadPhotoNote } from '../save-note-remote';
import { findNotesMissingOnServer, readStoredPhotoDataUrl, uploadMissingNotes } from '../upload-missing-notes';

// 올리기 자체(서버 응답 → ☁ 줄·cloudStoredAt)는 save-note-remote.test.ts가 본다 — 여기선 고르기·사진 읽기·순서
jest.mock('../save-note-remote', () => ({
  uploadPhotoNote: jest.fn(),
  setCloudNoteState: jest.fn(),
}));

jest.mock('../../flow/analyze-photo-request', () => ({
  downscaleToDataUrl: jest.fn(async () => 'data:image/jpeg;base64,SMALL'),
}));

const mockExisting = new Set<string>();
jest.mock('expo-file-system', () => ({
  File: class {
    uri: string;
    constructor(uri: string) {
      this.uri = uri;
    }
    get exists() {
      return mockExisting.has(this.uri);
    }
  },
}));

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: jest.fn() },
}));

const mockUpload = uploadPhotoNote as jest.Mock;
const mockSetState = setCloudNoteState as jest.Mock;
const mockDownscale = downscaleToDataUrl as jest.Mock;
const mockManipulate = ImageManipulator.manipulate as jest.Mock;

const ACCOUNT = 'user:abc';
const getHeaders = jest.fn(async () => ({ Authorization: 'Bearer t' }));
const PHOTO = 'file:///document/photo-notes/photo-1.jpg';

function note(id: string, overrides: Partial<PhotoNote> = {}): PhotoNote {
  return {
    id,
    createdAt: '2026-09-15T01:00:00.000Z',
    schemaVersion: 1,
    dateLabel: '9/15',
    photoUri: null,
    quote: 'q',
    why: 'w',
    fix: 'f',
    methodLabel: '근의 공식',
    typeLabel: '계산 실수',
    methodId: 'quadratic',
    mistakeType: 'calc_slip',
    weaknessIds: [],
    primaryWeaknessId: null,
    checkPassed: true,
    retryResult: 'pass',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockExisting.clear();
  mockManipulate.mockReturnValue({ renderAsync: async () => ({ width: 3024, height: 4032 }) });
  mockUpload.mockImplementation(async ({ note: n }: { note: PhotoNote }) => ({
    kind: 'stored',
    storedAt: `stored-${n.id}`,
    hasPhoto: false,
  }));
});

describe('고르기 — findNotesMissingOnServer', () => {
  it('서버 응답으로 저장된 적 없고(cloudStoredAt 없음) 서버 목록에도 없는 노트만', () => {
    const notes = [
      note('a'),
      note('b', { cloudStoredAt: '2026-10-02T06:00:00.000Z' }),
      note('c'),
    ];

    expect(findNotesMissingOnServer(notes, new Set(['c'])).map((n) => n.id)).toEqual(['a']);
  });

  it('서버에서 지운 노트(목록엔 있음)도 다시 올리지 않는다 — 올리면 410이다', () => {
    expect(findNotesMissingOnServer([note('gone')], new Set(['gone']))).toEqual([]);
  });
});

describe('기기 사진 읽기 — readStoredPhotoDataUrl', () => {
  it('사진이 없으면 null(「저장됨 · 사진 없음」으로 올린다)', async () => {
    await expect(readStoredPhotoDataUrl(null)).resolves.toBeNull();
    await expect(readStoredPhotoDataUrl(PHOTO)).resolves.toBeNull(); // 파일이 지워졌다
    expect(mockDownscale).not.toHaveBeenCalled();
  });

  it('사진이 있으면 흐름 끝과 같은 축소(downscaleToDataUrl)에 원본 크기를 넘긴다', async () => {
    mockExisting.add(PHOTO);

    await expect(readStoredPhotoDataUrl(PHOTO)).resolves.toBe('data:image/jpeg;base64,SMALL');
    expect(mockDownscale).toHaveBeenCalledWith({ uri: PHOTO, width: 3024, height: 4032 });
  });
});

describe('올리기 — uploadMissingNotes', () => {
  it('한 장씩 차례로 올리고, 사진은 줄인 data URL·없으면 null', async () => {
    mockExisting.add(PHOTO);
    const order: string[] = [];
    mockUpload.mockImplementation(async ({ note: n }: { note: PhotoNote }) => {
      order.push(`start-${n.id}`);
      await Promise.resolve();
      order.push(`end-${n.id}`);
      return { kind: 'stored', storedAt: 's', hasPhoto: !!n.photoUri };
    });

    const results = await uploadMissingNotes({
      accountKey: ACCOUNT,
      notes: [note('a', { photoUri: PHOTO }), note('b')],
      getHeaders,
    });

    expect(order).toEqual(['start-a', 'end-a', 'start-b', 'end-b']);
    expect(mockUpload).toHaveBeenNthCalledWith(1, expect.objectContaining({ accountKey: ACCOUNT, imageDataUrl: 'data:image/jpeg;base64,SMALL', getHeaders }));
    expect(mockUpload).toHaveBeenNthCalledWith(2, expect.objectContaining({ imageDataUrl: null }));
    expect([...results.keys()]).toEqual(['a', 'b']);
  });

  it('사진은 있는데 못 읽으면 그 장은 안 올리고 「저장 못 함」 — 사진 없이 굳히지 않는다', async () => {
    mockExisting.add(PHOTO);
    mockManipulate.mockReturnValue({
      renderAsync: async () => {
        throw new Error('decode failed');
      },
    });

    const results = await uploadMissingNotes({
      accountKey: ACCOUNT,
      notes: [note('a', { photoUri: PHOTO }), note('b')],
      getHeaders,
    });

    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockUpload).toHaveBeenCalledWith(expect.objectContaining({ note: expect.objectContaining({ id: 'b' }) }));
    expect(results.get('a')).toEqual({ kind: 'failed', retryable: true });
    expect(mockSetState).toHaveBeenCalledWith('a', { kind: 'failed', retryable: true });
  });

  it('진행을 알리고, 화면을 떠나면 다음 장부터 멈춘다', async () => {
    let gone = false;
    const progress: [number, number][] = [];
    mockUpload.mockImplementation(async () => {
      gone = true;
      return { kind: 'stored', storedAt: 's', hasPhoto: false };
    });

    await uploadMissingNotes({
      accountKey: ACCOUNT,
      notes: [note('a'), note('b'), note('c')],
      getHeaders,
      isCancelled: () => gone,
      onProgress: (done, total) => progress.push([done, total]),
    });

    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(progress).toEqual([[1, 3]]);
  });
});

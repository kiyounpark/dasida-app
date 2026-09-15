/**
 * 사진을 문서 폴더로 옮기는 자리 (4칸 ③).
 *
 * jest.setup.js의 전역 목은 "아무 파일도 없다"로 고정돼 있다 — 다른 테스트가
 * 파일을 안 건드리게 하려는 것이다. 여기서는 복사 자체가 관심사라 목을 따로 건다.
 */

const mockFs = {
  existing: new Set<string>(),
  created: [] as string[],
  deleted: [] as string[],
  copied: [] as { from: string; to: string }[],
  throwOnCopy: false,
};

jest.mock('expo-file-system', () => {
  class FakeEntry {
    uri: string;

    constructor(...uris: (string | { uri: string })[]) {
      this.uri = uris.map((item) => (typeof item === 'string' ? item : item.uri)).join('/');
    }

    get exists() {
      return mockFs.existing.has(this.uri);
    }

    create() {
      mockFs.created.push(this.uri);
      mockFs.existing.add(this.uri);
    }

    delete() {
      mockFs.deleted.push(this.uri);
      mockFs.existing.delete(this.uri);
    }

    copy(destination: { uri: string }) {
      if (mockFs.throwOnCopy) throw new Error('디스크 꽉 참');
      mockFs.copied.push({ from: this.uri, to: destination.uri });
      mockFs.existing.add(destination.uri);
    }
  }

  return {
    File: FakeEntry,
    Directory: FakeEntry,
    Paths: {
      get document() {
        return new FakeEntry('file:///document');
      },
      get cache() {
        return new FakeEntry('file:///cache');
      },
    },
  };
});

import { deleteNotePhoto, deleteNotePhotos, persistNotePhoto } from './photo-file-store';

const DIR = 'file:///document/photo-notes';
const CACHE_PHOTO = 'file:///cache/ImagePicker/abc.jpg';

beforeEach(() => {
  mockFs.existing = new Set([CACHE_PHOTO]);
  mockFs.created = [];
  mockFs.deleted = [];
  mockFs.copied = [];
  mockFs.throwOnCopy = false;
});

describe('persistNotePhoto', () => {
  it('캐시 사진을 문서 폴더로 복사하고 새 경로를 돌려준다', () => {
    const uri = persistNotePhoto('photo-2026-09-15T12:34:56.789Z', CACHE_PHOTO);

    expect(uri).toBe(`${DIR}/photo-2026-09-15T12-34-56-789Z.jpg`);
    expect(mockFs.copied).toEqual([{ from: CACHE_PHOTO, to: uri }]);
  });

  it('노트 id의 콜론·점을 파일명에서 다듬는다', () => {
    const uri = persistNotePhoto('photo-2026-09-15T12:34:56.789Z', CACHE_PHOTO);

    // file:// 자체에 콜론이 있으니 파일명만 본다
    const fileName = uri?.split('/').pop();
    expect(fileName).not.toContain(':');
    expect(fileName).toBe('photo-2026-09-15T12-34-56-789Z.jpg');
  });

  it('폴더가 없으면 만든다', () => {
    persistNotePhoto('photo-1', CACHE_PHOTO);

    expect(mockFs.created).toEqual([DIR]);
  });

  it('폴더가 이미 있으면 다시 만들지 않는다', () => {
    mockFs.existing.add(DIR);

    persistNotePhoto('photo-1', CACHE_PHOTO);

    expect(mockFs.created).toEqual([]);
  });

  it('원본 확장자를 따라간다', () => {
    mockFs.existing.add('file:///cache/x.PNG');

    expect(persistNotePhoto('photo-1', 'file:///cache/x.PNG')).toBe(`${DIR}/photo-1.png`);
  });

  it('확장자를 모르면 jpg로 둔다', () => {
    mockFs.existing.add('file:///cache/no-extension');

    expect(persistNotePhoto('photo-1', 'file:///cache/no-extension')).toBe(`${DIR}/photo-1.jpg`);
  });

  it('원본이 이미 사라졌으면 null — 시스템이 캐시를 비운 경우다', () => {
    expect(persistNotePhoto('photo-1', 'file:///cache/gone.jpg')).toBeNull();
    expect(mockFs.copied).toEqual([]);
  });

  it('같은 노트를 다시 저장하면 옛 파일을 먼저 치운다', () => {
    const target = `${DIR}/photo-1.jpg`;
    mockFs.existing.add(target);

    persistNotePhoto('photo-1', CACHE_PHOTO);

    expect(mockFs.deleted).toContain(target);
    expect(mockFs.copied).toHaveLength(1);
  });

  it('복사가 실패해도 던지지 않고 null을 돌려준다 — 글은 남아야 한다', () => {
    mockFs.throwOnCopy = true;

    expect(persistNotePhoto('photo-1', CACHE_PHOTO)).toBeNull();
  });

  it('id나 경로가 비었으면 아무것도 하지 않는다', () => {
    expect(persistNotePhoto('', CACHE_PHOTO)).toBeNull();
    expect(persistNotePhoto('photo-1', '')).toBeNull();
    expect(mockFs.created).toEqual([]);
  });
});

describe('deleteNotePhoto', () => {
  it('문서 폴더 안의 사진을 지운다', () => {
    const target = `${DIR}/photo-1.jpg`;
    mockFs.existing.add(target);

    deleteNotePhoto(target);

    expect(mockFs.deleted).toEqual([target]);
  });

  it('캐시 경로는 건드리지 않는다 — 우리가 지울 대상이 아니다', () => {
    deleteNotePhoto(CACHE_PHOTO);

    expect(mockFs.deleted).toEqual([]);
  });

  it('null·빈 문자열이면 아무것도 하지 않는다', () => {
    deleteNotePhoto(null);
    deleteNotePhoto(undefined);
    deleteNotePhoto('');

    expect(mockFs.deleted).toEqual([]);
  });

  it('없는 파일이면 지우지 않는다', () => {
    deleteNotePhoto(`${DIR}/never-existed.jpg`);

    expect(mockFs.deleted).toEqual([]);
  });
});

describe('deleteNotePhotos', () => {
  it('한 장이 실패해도 나머지를 계속 지운다', () => {
    const a = `${DIR}/a.jpg`;
    const c = `${DIR}/c.jpg`;
    mockFs.existing.add(a);
    mockFs.existing.add(c);

    deleteNotePhotos([a, null, CACHE_PHOTO, c]);

    expect(mockFs.deleted).toEqual([a, c]);
  });
});

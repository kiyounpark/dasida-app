// jest.setup.js의 목은 빈 jest.fn()이라 실제로 담지 않는다.
// features/learning/pending-attempt-queue.test.ts와 같은 방식으로 이 파일이 쓸 저장소를 세운다.
jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => (key in store ? store[key] : null)),
      setItem: jest.fn(async (key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: jest.fn(async (key: string) => {
        delete store[key];
      }),
      clear: jest.fn(async () => {
        store = {};
      }),
    },
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearPhotoNotes,
  getPhotoNotesStorageKey,
  readPhotoNotes,
  savePhotoNote,
} from './note-store';
import type { PhotoNote } from './types';

const ACCOUNT = 'user:abc';

function note(overrides: Partial<PhotoNote> = {}): PhotoNote {
  return {
    id: 'photo-2026-09-15T01:00:00.000Z',
    createdAt: '2026-09-15T01:00:00.000Z',
    schemaVersion: 1,
    dateLabel: '9/15',
    photoUri: null,
    quote: '2x² − 5x + 3',
    why: '부호를 옮기면서 −가 하나 사라졌어.',
    fix: '괄호 풀 때 앞의 −를 먼저 적고 시작하자.',
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

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('사진 오답노트 저장소', () => {
  it('저장한 노트를 그대로 다시 읽는다', async () => {
    await savePhotoNote(ACCOUNT, note());

    const stored = await readPhotoNotes(ACCOUNT);

    expect(stored).toHaveLength(1);
    expect(stored[0].quote).toBe('2x² − 5x + 3');
    expect(stored[0].methodId).toBe('quadratic');
  });

  it('계정이 다르면 서로 안 보인다', async () => {
    await savePhotoNote(ACCOUNT, note());

    expect(await readPhotoNotes('user:other')).toEqual([]);
  });

  it('최신 노트가 앞에 온다', async () => {
    await savePhotoNote(ACCOUNT, note({ id: 'a', createdAt: '2026-09-14T00:00:00.000Z' }));
    await savePhotoNote(ACCOUNT, note({ id: 'b', createdAt: '2026-09-15T00:00:00.000Z' }));

    expect((await readPhotoNotes(ACCOUNT)).map((n) => n.id)).toEqual(['b', 'a']);
  });

  it('같은 id를 다시 저장하면 늘어나지 않고 덮어쓴다', async () => {
    await savePhotoNote(ACCOUNT, note({ quote: '처음' }));
    await savePhotoNote(ACCOUNT, note({ quote: '고침' }));

    const stored = await readPhotoNotes(ACCOUNT);

    expect(stored).toHaveLength(1);
    expect(stored[0].quote).toBe('고침');
  });

  it('상한을 두지 않는다 — 오래된 노트가 잘려 나가면 안 된다', async () => {
    for (let i = 0; i < 60; i += 1) {
      const day = String(i + 1).padStart(2, '0');
      await savePhotoNote(ACCOUNT, note({ id: `n-${i}`, createdAt: `2026-07-${day}T00:00:00.000Z` }));
    }

    expect(await readPhotoNotes(ACCOUNT)).toHaveLength(60);
  });

  it('저장된 값이 깨져 있어도 빈 목록으로 넘어간다', async () => {
    await AsyncStorage.setItem(getPhotoNotesStorageKey(ACCOUNT), '{{ 깨진 JSON');

    expect(await readPhotoNotes(ACCOUNT)).toEqual([]);
  });

  it('id·createdAt이 없는 옛 노트는 걸러낸다', async () => {
    await AsyncStorage.setItem(
      getPhotoNotesStorageKey(ACCOUNT),
      JSON.stringify([{ dateLabel: '8/1', quote: '옛 모양' }, note()]),
    );

    const stored = await readPhotoNotes(ACCOUNT);

    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('photo-2026-09-15T01:00:00.000Z');
  });

  it('계정 키가 비면 저장도 읽기도 안 한다', async () => {
    await savePhotoNote('', note());

    expect(await readPhotoNotes('')).toEqual([]);
    expect(await AsyncStorage.getItem(getPhotoNotesStorageKey(''))).toBeNull();
  });

  it('지우면 그 계정 것만 사라진다', async () => {
    await savePhotoNote(ACCOUNT, note());
    await savePhotoNote('user:other', note());

    await clearPhotoNotes(ACCOUNT);

    expect(await readPhotoNotes(ACCOUNT)).toEqual([]);
    expect(await readPhotoNotes('user:other')).toHaveLength(1);
  });
});

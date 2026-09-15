import AsyncStorage from '@react-native-async-storage/async-storage';

import { StorageKeys } from '@/constants/storage-keys';

import type { PhotoNote } from './types';

/**
 * 사진 오답노트를 기기에 남긴다. 계정별로 나눠 담는다 (09.15 🔒 기윤).
 *
 * 왜 계정별인가: 이 앱의 다른 저장소가 전부 같은 모양이고(constants/storage-keys.ts의 Prefix들),
 * 게스트도 익명 세션이라 accountKey를 갖는다 — 로그인 여부와 무관하게 키가 하나씩 나온다.
 *
 * ⚠️ 상한을 두지 않는다. 나중에 "최근 N장"으로 줄이는 건 언제 해도 값이 같지만,
 * 지금 잘라 버린 노트는 되살릴 수 없다. 노트 한 장은 텍스트 수 KB다.
 *
 * ⚠️ photoUri는 사진첩·카메라가 준 캐시 경로 그대로다. 기기 용량이 모자라면 시스템이 지운다.
 * 사진을 앱 문서 폴더로 복사하는 건 다음 칸(4칸 ③) 일이고, 그때까지 사진은 사라질 수 있다.
 * 사라져도 노트의 글(인용·왜·다음엔)은 남는다.
 */

export function getPhotoNotesStorageKey(accountKey: string) {
  return `${StorageKeys.photoNotesPrefix}${accountKey}`;
}

/** 최신순. 저장된 게 없거나 읽다 깨지면 빈 배열 — 노트 화면이 죽는 것보다 낫다 */
export async function readPhotoNotes(accountKey: string): Promise<PhotoNote[]> {
  if (!accountKey) return [];

  try {
    const raw = await AsyncStorage.getItem(getPhotoNotesStorageKey(accountKey));
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isPhotoNoteLike);
  } catch {
    return [];
  }
}

/**
 * 한 장을 얹고 최신순으로 정렬해 돌려준다. 같은 id면 덮어쓴다.
 * 저장에 실패해도 던지지 않는다 — 노트 카드는 이미 화면에 떴고, 저장 실패로 그 장면을 깨뜨리지 않는다.
 */
export async function savePhotoNote(accountKey: string, note: PhotoNote): Promise<PhotoNote[]> {
  if (!accountKey) return [];

  const existing = await readPhotoNotes(accountKey);
  const merged = [note, ...existing.filter((item) => item.id !== note.id)].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  try {
    await AsyncStorage.setItem(getPhotoNotesStorageKey(accountKey), JSON.stringify(merged));
  } catch {
    return existing;
  }

  return merged;
}

/** 탈퇴·로그아웃 정리용. features/learning/local-learning-history-storage.ts와 같은 자리에서 불린다 */
export async function clearPhotoNotes(accountKey: string): Promise<void> {
  if (!accountKey) return;
  await AsyncStorage.removeItem(getPhotoNotesStorageKey(accountKey));
}

/** 저장된 모양이 지금 타입과 다를 수 있다 — 옛 노트가 섞여 들어와도 화면이 안 죽게 거른다 */
function isPhotoNoteLike(value: unknown): value is PhotoNote {
  if (typeof value !== 'object' || value === null) return false;
  const note = value as Partial<PhotoNote>;

  return (
    typeof note.id === 'string' &&
    typeof note.createdAt === 'string' &&
    Array.isArray(note.weaknessIds)
  );
}

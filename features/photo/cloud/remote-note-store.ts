import { File, Paths } from 'expo-file-system';

import { readLearningHistoryApiJson } from '@/features/learning/firebase-learning-history-api';
import {
  LIST_PHOTO_NOTES_MAX_LIMIT,
  photoStoreUrl,
  safeNoteFileStem,
  toLocalNote,
  type ListPhotoNotesResponse,
  type PhotoNoteDoc,
} from '@/functions/src/photo-store-contract';

import { savePhotoNote } from '../note-store';
import { deleteNotePhoto, persistNotePhoto } from '../photo-file-store';
import type { PhotoNote } from '../types';

/**
 * 다른 기기 보기 — 읽기 쪽 (1.0.11 3줄). 서버 노트 목록을 읽고, 이 기기에 없는 노트를 사진째 가져온다.
 *
 * 가져온 노트는 note-store의 savePhotoNote로 이 기기에 남긴다. 이유 둘:
 * ① 사진은 문서 폴더(photo-file-store)에 내려받는데, 노트가 로컬 목록에 없으면 로그아웃·탈퇴의
 *    clearPhotoNotes가 그 사진을 못 찾는다 — 학생은 지웠다고 알고 기기엔 남는다.
 * ② 다음에 열 때 오프라인이어도 보인다.
 * 복습 과제는 건드리지 않는다 — 과제는 이미 서버에 있다(복원하며 다시 만들지 않는다).
 *
 * 사진을 못 받은 노트는 이번엔 글만 보여 주고 남기지 않는다 — 남기면 "로컬 우선"에 걸려 다시 안 받는다.
 */

type GetRemoteAuthHeaders = (accountKey: string) => Promise<Record<string, string>>;

/** 목록 쪽 수 상한 — 커서가 안 나아가는 서버 응답에 무한히 돌지 않게. 200 × 10 = 2000장 */
const MAX_LIST_PAGES = 10;
/** 사진은 한 번에 넷씩 받는다. 한 장 0.5MB 안팎 */
const DOWNLOAD_BATCH = 4;

/** 서버 문서 모양 확인. 카드가 그리는 글자 칸과 합치는 데 쓰는 칸만 본다 */
function isRemoteNoteDoc(value: unknown): value is PhotoNoteDoc {
  if (typeof value !== 'object' || value === null) return false;
  const doc = value as Record<string, unknown>;
  const textFields = ['id', 'createdAt', 'dateLabel', 'quote', 'why', 'fix', 'methodLabel', 'typeLabel', 'storedAt'];

  return (
    textFields.every((field) => typeof doc[field] === 'string') &&
    Array.isArray(doc.weaknessIds) &&
    (doc.photoPath == null || typeof doc.photoPath === 'string') &&
    (doc.deletedAt == null || typeof doc.deletedAt === 'string')
  );
}

/**
 * 서버 문서 → 폰 노트. 서버는 methodId·weaknessIds를 글자로만 지킨다(약속 파일 DOMAIN_ID_PATTERN) —
 * 이 앱이 모르는 약점 id가 와도 카드는 대체 이름표로 그린다(note-card-lines의 resolveWeaknessLabel).
 */
function toPhotoNote(doc: PhotoNoteDoc, photoUri: string | null): PhotoNote {
  return toLocalNote(doc, photoUri) as PhotoNote;
}

/**
 * 서버 노트 전부(지운 것 포함 — 거르는 건 부르는 쪽). 실패하면 던진다.
 * 401·403은 토큰 갱신·재전송 없이 바로 던진다(readLearningHistoryApiJson은 망·시간 초과·5xx만 한 번 더 보낸다) —
 * 약속 파일 readApiErrorBody 주석의 "403 CONSENT_REQUIRED를 재전송 길로 보내지 말 것"과 같은 자리. 실패는 전부 "기기 노트만"이라 code로 가를 일이 없다.
 */
export async function listRemotePhotoNotes(
  accountKey: string,
  headers: Record<string, string>,
): Promise<PhotoNoteDoc[]> {
  const docs: PhotoNoteDoc[] = [];
  let before: string | null = null;

  for (let page = 0; page < MAX_LIST_PAGES; page += 1) {
    const query =
      `accountKey=${encodeURIComponent(accountKey)}&limit=${LIST_PHOTO_NOTES_MAX_LIMIT}` +
      (before ? `&before=${encodeURIComponent(before)}` : '');
    const response: ListPhotoNotesResponse = await readLearningHistoryApiJson<ListPhotoNotesResponse>(
      `${photoStoreUrl('listPhotoNotes')}?${query}`,
      { method: 'GET', headers },
      1,
    );

    if (Array.isArray(response.notes)) {
      docs.push(...response.notes.filter(isRemoteNoteDoc));
    }

    const next: unknown = response.nextBefore;
    if (typeof next !== 'string' || (before !== null && next >= before)) break;
    before = next;
  }

  return docs;
}

/**
 * 노트 사진 한 장을 내려받아 문서 폴더에 같은 파일명 규칙(safeNoteFileStem)으로 둔다.
 * 캐시에 먼저 받고 persistNotePhoto로 옮긴다 — 폴더·파일명 규칙을 한 집(photo-file-store)에 둔다.
 * 앱은 경로를 안 보낸다(서버가 문서의 photoPath를 읽는다). 실패하면 null.
 */
export async function downloadRemoteNotePhoto(
  accountKey: string,
  noteId: string,
  headers: Record<string, string>,
): Promise<string | null> {
  const url =
    `${photoStoreUrl('getPhotoNoteImage')}?accountKey=${encodeURIComponent(accountKey)}` +
    `&noteId=${encodeURIComponent(noteId)}`;
  let temp: File | null = null;

  try {
    temp = new File(Paths.cache, `remote-note-${safeNoteFileStem(noteId)}.jpg`);
    const downloaded = await File.downloadFileAsync(url, temp, { headers, idempotent: true });
    return persistNotePhoto(noteId, downloaded.uri);
  } catch {
    return null;
  } finally {
    try {
      if (temp?.exists) temp.delete();
    } catch {
      // 캐시 찌꺼기는 시스템이 치운다
    }
  }
}

/** 같은 id면 로컬 우선. 최신순 */
export function mergePhotoNotes(local: PhotoNote[], remote: PhotoNote[]): PhotoNote[] {
  const seen = new Set(local.map((note) => note.id));
  const extra = remote.filter((note) => {
    if (seen.has(note.id)) return false;
    seen.add(note.id);
    return true;
  });

  return [...local, ...extra].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * 지난 노트 화면용. 로컬 목록에 서버에만 있는 노트를 더해 onUpdate로 넘긴다 — 글 먼저 한 번,
 * 사진까지 받고 한 번 더. 바뀐 게 없으면 부르지 않는다.
 * 던지지 않는다. 서버 실패·오프라인이면 아무것도 안 넘긴다(= 화면은 로컬만, 오류 띠 없음).
 * 지운 노트(deletedAt)는 그리지 않는다.
 */
export async function loadRemotePhotoNotes(
  accountKey: string,
  local: PhotoNote[],
  getRemoteAuthHeaders: GetRemoteAuthHeaders,
  options: {
    isCancelled: () => boolean;
    onUpdate: (notes: PhotoNote[]) => void;
    /** 서버 목록을 읽었을 때 한 번(지운 것 포함) — 「서버에 없는 노트 올리기」(4)가 이걸로 고른다. 못 읽으면 안 부른다 */
    onRemoteDocs?: (docs: PhotoNoteDoc[]) => void;
    /** 서버 목록을 못 읽었을 때 한 번 — 화면이 「없음」과 「못 읽음」을 가른다(새 기기 기기 0장) */
    onRemoteError?: () => void;
  },
): Promise<void> {
  const { isCancelled, onUpdate, onRemoteDocs, onRemoteError } = options;

  try {
    const headers = await getRemoteAuthHeaders(accountKey);
    const docs = await listRemotePhotoNotes(accountKey, headers);
    if (isCancelled()) return;
    onRemoteDocs?.(docs);

    const localIds = new Set(local.map((note) => note.id));
    const pending = docs.filter((doc) => !doc.deletedAt && !localIds.has(doc.id));
    if (pending.length === 0) return;

    onUpdate(mergePhotoNotes(local, pending.map((doc) => toPhotoNote(doc, null))));

    const restored: PhotoNote[] = [];
    for (let start = 0; start < pending.length; start += DOWNLOAD_BATCH) {
      if (isCancelled()) return;
      const batch = pending.slice(start, start + DOWNLOAD_BATCH);
      const photoUris = await Promise.all(
        batch.map((doc) =>
          doc.photoPath ? downloadRemoteNotePhoto(accountKey, doc.id, headers) : Promise.resolve(null),
        ),
      );

      // 저장은 한 장씩 — savePhotoNote는 목록을 읽고 다시 쓰니 동시에 부르면 서로 덮는다
      for (let index = 0; index < batch.length; index += 1) {
        const doc = batch[index];
        const photoUri = photoUris[index];
        if (isCancelled()) {
          // 화면을 떠났다(로그아웃일 수 있다) — 남기지 않을 사진은 치운다
          deleteNotePhoto(photoUri);
          continue;
        }

        const note = toPhotoNote(doc, photoUri);
        if (!doc.photoPath || photoUri) {
          await savePhotoNote(accountKey, note);
        }
        restored.push(note);
      }
    }

    if (!isCancelled()) onUpdate(mergePhotoNotes(local, restored));
  } catch (error) {
    console.warn('[remote-note-store] 서버 노트를 못 읽어 로컬만 보여 준다.', error);
    if (!isCancelled()) onRemoteError?.();
  }
}

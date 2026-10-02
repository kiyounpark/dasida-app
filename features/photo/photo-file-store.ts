import { Directory, File, Paths } from 'expo-file-system';

import { safeNoteFileStem } from '@/functions/src/photo-store-contract';

/**
 * 오답노트 사진을 앱 문서 폴더에 남긴다 (4칸 ③).
 *
 * 왜: 사진첩·카메라가 주는 건 캐시 경로다. `Paths.cache` 주석이 직접 적어놨듯
 * 기기 용량이 모자라면 시스템이 그 폴더를 비운다. 그대로 저장해 두면 며칠 뒤
 * 지난 오답노트에서 **글은 남고 사진 칸만 깨진다.** ④(목록 화면)가 먼저 나온 탓에
 * 학생이 그 깨짐을 실제로 열어보게 된다.
 *
 * expo-file-system 19의 File/Directory 메서드는 전부 동기다(`: void`). await이 아니다.
 * 사진 한 장 복사라 몇 ms고, 노트 카드를 이미 띄운 뒤에 도는 자리라 체감되지 않는다.
 *
 * 실패하면 던지지 않고 null을 돌려준다 — note-store의 저장과 같은 결이다.
 * 사진을 못 옮겨도 노트의 글(인용·왜·다음엔)은 남아야 한다.
 */

const NOTE_PHOTO_DIR = 'photo-notes';

function noteDirectory(): Directory {
  return new Directory(Paths.document, NOTE_PHOTO_DIR);
}

/**
 * 노트 id를 파일명으로 쓴다 — 노트 한 장과 파일 한 장이 1대1로 붙고,
 * 노트를 지울 때 어느 파일을 지울지가 바로 나온다.
 *
 * 다만 id가 `photo-2026-09-15T12:34:56.789Z` 꼴이라 콜론이 들어간다.
 * 파일명에 그대로 쓰면 곤란하므로 안전한 글자만 남긴다.
 * 이 규칙은 서버 사진 경로(photo-notes/{accountKey}/{stem}.jpg)와 같아야 해서 약속 파일에 둔다.
 */
function fileNameFor(noteId: string, sourceUri: string): string {
  return `${safeNoteFileStem(noteId)}${extensionOf(sourceUri)}`;
}

/** 원본 확장자를 따라간다. 못 알아보면 jpg — 사진첩·카메라가 주는 건 대부분 jpeg다. */
function extensionOf(uri: string): string {
  const path = uri.split('?')[0].split('#')[0];
  const dot = path.lastIndexOf('.');
  if (dot < 0) return '.jpg';

  const ext = path.slice(dot).toLowerCase();
  return /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : '.jpg';
}

/**
 * 캐시에 있는 사진을 문서 폴더로 복사하고 새 경로를 돌려준다.
 * 원본이 이미 없거나 복사가 실패하면 null — 부르는 쪽이 사진 없이 저장한다.
 */
export function persistNotePhoto(noteId: string, sourceUri: string): string | null {
  if (!noteId || !sourceUri) return null;

  try {
    const directory = noteDirectory();
    if (!directory.exists) {
      directory.create({ intermediates: true, idempotent: true });
    }

    const source = new File(sourceUri);
    if (!source.exists) return null;

    const target = new File(directory, fileNameFor(noteId, sourceUri));
    // 같은 노트를 다시 저장하는 경우. copy가 덮어쓰기를 거절할 수 있어 먼저 치운다.
    if (target.exists) target.delete();

    source.copy(target);
    return target.uri;
  } catch {
    return null;
  }
}

const NOTE_PHOTO_SEGMENT = `/${NOTE_PHOTO_DIR}/`;

/**
 * 저장된 사진 경로를 지금 앱 문서 폴더에 다시 잇는다.
 *
 * 왜: 노트엔 절대 경로(…/Application/{UUID}/Documents/photo-notes/…)가 저장되는데,
 * iOS는 앱을 다시 깔거나 업데이트하면 그 UUID를 바꿀 수 있다. 10.02 시뮬레이터 실측 —
 * 노트엔 옛 UUID 경로, 파일은 새 폴더에 같은 이름으로 있었다. 옛 경로로는 "파일 없음"이라
 * 올리기(1.0.11 4번)가 사진 없이 올라갔고, 탈퇴 정리(deleteNotePhoto)도 우리 폴더가 아니라고 건너뛴다.
 * 그래서 파일 이름으로 지금 폴더에서 다시 찾는다. 우리 폴더 경로가 아니거나 지금 폴더에 없으면 받은 값 그대로.
 */
export function resolveNotePhotoUri(photoUri: string): string {
  const index = photoUri.lastIndexOf(NOTE_PHOTO_SEGMENT);
  if (index < 0) return photoUri;

  const name = photoUri.slice(index + NOTE_PHOTO_SEGMENT.length);
  if (!name || name.includes('/')) return photoUri;

  try {
    const current = new File(noteDirectory(), name);
    return current.exists ? current.uri : photoUri;
  } catch {
    return photoUri;
  }
}

/**
 * 노트 한 장의 사진을 지운다. 문서 폴더 안의 것만 건드린다 —
 * 캐시 경로가 들어오면 시스템이 알아서 할 일이고, 우리가 지울 대상이 아니다.
 */
export function deleteNotePhoto(photoUri: string | null | undefined): void {
  if (!photoUri) return;

  try {
    const directory = noteDirectory();
    if (!photoUri.startsWith(directory.uri)) return;

    const file = new File(photoUri);
    if (file.exists) file.delete();
  } catch {
    // 못 지워도 흐름을 깨지 않는다. 남은 파일은 다음 탈퇴·정리에서 다시 시도된다.
  }
}

/** 탈퇴 정리용. 한 장이라도 못 지워도 나머지는 계속 지운다. */
export function deleteNotePhotos(photoUris: (string | null | undefined)[]): void {
  for (const uri of photoUris) {
    deleteNotePhoto(uri);
  }
}

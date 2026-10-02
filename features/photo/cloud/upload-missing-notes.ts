import { File } from 'expo-file-system';
import { ImageManipulator } from 'expo-image-manipulator';

import type { CloudNoteState } from '@/functions/src/photo-store-contract';

import { downscaleToDataUrl } from '../flow/analyze-photo-request';
import type { PhotoNote } from '../types';
import { uploadPhotoNote, setCloudNoteState } from './save-note-remote';

/**
 * 「서버에 없는 노트 올리기」 — 1.0.11 4번. 1.0.10까지 쌓인 노트(기기에만 있음)와 올리다 실패한 노트를 계정에 올린다.
 * 올리기 자체는 2줄의 uploadPhotoNote를 그대로 쓴다(☁ 줄·로컬 cloudStoredAt까지 거기서 한다).
 */

type GetHeaders = (accountKey: string) => Promise<Record<string, string>>;

/**
 * 올릴 노트 = cloudStoredAt이 없고(서버 응답으로 저장된 적 없음) 서버 목록에도 없는 것.
 * 서버 목록에 이미 있는 노트는 올리지 않는다 — 다시 인코딩한 사진은 바이트가 달라 409 NOTE_CONFLICT가 난다(2줄 보고).
 */
export function findNotesMissingOnServer(notes: PhotoNote[], remoteIds: ReadonlySet<string>): PhotoNote[] {
  return notes.filter((note) => !note.cloudStoredAt && !remoteIds.has(note.id));
}

/**
 * 기기에 남은 사진을 흐름 끝과 같은 규칙(downscaleToDataUrl)으로 줄인다.
 * 사진이 없으면 null(「저장됨 · 사진 없음」으로 올린다). 사진은 있는데 못 읽으면 던진다 —
 * 사진 없이 올려 버리면 서버 문서가 사진 없는 채로 굳는다(같은 내용 재전송은 alreadyStored라 사진을 다시 못 붙인다).
 */
export async function readStoredPhotoDataUrl(photoUri: string | null | undefined): Promise<string | null> {
  if (!photoUri) return null;
  if (!new File(photoUri).exists) return null;

  const rendered = await ImageManipulator.manipulate(photoUri).renderAsync();
  return downscaleToDataUrl({ uri: photoUri, width: rendered.width, height: rendered.height });
}

/**
 * 한 장씩 차례로 올린다 — 로컬 cloudStoredAt 쓰기가 목록을 읽고 다시 쓰고, 사진도 한 장에 0.5MB 안팎이라.
 * 던지지 않는다. 결과는 노트 id → ☁ 상태.
 */
export async function uploadMissingNotes(input: {
  accountKey: string;
  notes: PhotoNote[];
  getHeaders: GetHeaders;
  isCancelled?: () => boolean;
  onProgress?: (done: number, total: number) => void;
}): Promise<Map<string, CloudNoteState>> {
  const results = new Map<string, CloudNoteState>();
  const total = input.notes.length;

  for (const note of input.notes) {
    if (input.isCancelled?.()) break;

    let imageDataUrl: string | null;
    try {
      imageDataUrl = await readStoredPhotoDataUrl(note.photoUri);
    } catch {
      // 사진을 못 읽었다 — 이번엔 안 올리고 다음에 다시(버튼이 그대로 남는다)
      const failed: CloudNoteState = { kind: 'failed', retryable: true };
      setCloudNoteState(note.id, failed);
      results.set(note.id, failed);
      input.onProgress?.(results.size, total);
      continue;
    }

    const state = await uploadPhotoNote({
      accountKey: input.accountKey,
      note,
      imageDataUrl,
      getHeaders: input.getHeaders,
    });
    results.set(note.id, state);
    input.onProgress?.(results.size, total);
  }

  return results;
}

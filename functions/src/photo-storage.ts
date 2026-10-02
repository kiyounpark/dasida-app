import { createHash } from 'node:crypto';

import type { Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

import type { ConsentDoc } from './photo-store-contract';

/**
 * 1.0.11 2줄 — 사진 객체(Storage)와 동의 문서 읽기를 한 곳에 둔다.
 * 함수 본문(savePhotoNote·analyzePhoto·deleteAccount)은 PhotoObjectStore 모양만 보고, 테스트는 가짜를 끼운다.
 * 버킷 = 기본 버킷(dasida-app.firebasestorage.app, 서울). 보안 규칙이 외부 직접 접근을 막는다 — admin은 무관.
 */

export const PHOTO_NOTES_COLLECTION = 'photoNotes';

/** users/{accountKey}/photoNotes/{noteId} — 문서 id = note.id 원문 */
export function photoNoteDocRef(firestore: Firestore, accountKey: string, noteId: string) {
  return firestore.collection('users').doc(accountKey).collection(PHOTO_NOTES_COLLECTION).doc(noteId);
}

/** users/{accountKey}/private/consent — 1줄 saveConsent가 쓴다 */
export function consentDocRef(firestore: Firestore, accountKey: string) {
  return firestore.collection('users').doc(accountKey).collection('private').doc('consent');
}

/** null = 한 번도 안 봄(1.0.10 이하·웹·아직 동의 화면 전). 전부 동의와 다르다 */
export async function readConsentDoc(firestore: Firestore, accountKey: string): Promise<ConsentDoc | null> {
  const snapshot = await consentDocRef(firestore, accountKey).get();
  return snapshot.exists ? (snapshot.data() as ConsentDoc) : null;
}

export type PhotoObjectStore = {
  /** 객체의 사용자 메타데이터와 md5(base64, GCS md5Hash). 객체가 없으면 null */
  readObjectInfo(path: string): Promise<{ metadata: Record<string, string>; md5Hash: string | null } | null>;
  /**
   * onlyIfAbsent면 조건부 생성(ifGenerationMatch 0) — 이미 있으면 덮지 않고 'exists'(412).
   * 노트 사진(덮어쓰기 금지)과 검토본(재시도가 버킷 수명을 늘리지 않게)이 둘 다 이 길로 간다.
   */
  save(
    path: string,
    bytes: Buffer,
    options: { contentType: string; metadata: Record<string, string>; onlyIfAbsent?: boolean },
  ): Promise<'saved' | 'exists'>;
  /** prefix 아래 전부. 0개면 그냥 끝난다. 한 개라도 못 지우면 던진다 */
  deletePrefix(prefix: string): Promise<void>;
  /** 없으면 그냥 끝난다 */
  deleteIfExists(path: string): Promise<void>;
};

/** data:image/jpeg;base64,… → 바이트. 앱은 늘 JPEG(축소본)를 보낸다 */
export function decodeImageDataUrl(dataUrl: string): { bytes: Buffer; contentType: string } {
  const match = /^data:(image\/[a-z]+);base64,/.exec(dataUrl);
  if (!match) throw new Error('Not an image data URL');
  return { bytes: Buffer.from(dataUrl.slice(match[0].length), 'base64'), contentType: match[1] };
}

/** 비어 있지 않고 JPEG 머리(FF D8)로 시작하나 */
export function looksLikeJpeg(bytes: Buffer): boolean {
  return bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

/** GCS md5Hash와 같은 꼴(MD5 다이제스트의 base64) */
export function md5Base64(bytes: Buffer): string {
  return createHash('md5').update(bytes).digest('base64');
}

function errorCode(error: unknown): unknown {
  return typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : undefined;
}

type Bucket = ReturnType<ReturnType<typeof getStorage>['bucket']>;

export function firebasePhotoObjectStore(bucket: Bucket = getStorage().bucket()): PhotoObjectStore {
  return {
    async readObjectInfo(path) {
      try {
        const [metadata] = await bucket.file(path).getMetadata();
        const custom = metadata.metadata ?? {};
        return {
          metadata: Object.fromEntries(Object.entries(custom).map(([key, value]) => [key, String(value)])),
          md5Hash: typeof metadata.md5Hash === 'string' ? metadata.md5Hash : null,
        };
      } catch (error) {
        if (errorCode(error) === 404) return null;
        throw error;
      }
    },
    async save(path, bytes, { contentType, metadata, onlyIfAbsent }) {
      try {
        await bucket.file(path).save(bytes, {
          contentType,
          metadata: { metadata },
          resumable: false,
          ...(onlyIfAbsent ? { preconditionOpts: { ifGenerationMatch: 0 } } : {}),
        });
        return 'saved';
      } catch (error) {
        if (onlyIfAbsent && errorCode(error) === 412) return 'exists';
        throw error;
      }
    },
    async deletePrefix(prefix) {
      // force:false — 한 개라도 실패하면 멈추고 던진다(탈퇴 실패로 보고)
      await bucket.deleteFiles({ prefix, force: false });
    },
    async deleteIfExists(path) {
      await bucket.file(path).delete({ ignoreNotFound: true });
    },
  };
}

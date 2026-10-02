import AsyncStorage from '@react-native-async-storage/async-storage';

import { StorageKeys } from '@/constants/storage-keys';
import type { ConsentDoc, SaveConsentRequest } from '@/functions/src/photo-store-contract';

/**
 * 사진 동의 문서의 기기 사본 (1.0.11 줄 0). 원본은 서버 users/{accountKey}/private/consent.
 *
 * 왜 사본을 두나: 앱을 켤 때마다 동의 화면을 띄울지 정해야 하는데, 서버를 기다리면
 * 첫 화면이 늦고 오프라인이면 못 정한다. 1줄(동의 화면)이 서버와 맞추고,
 * 2줄(서버 저장)은 올리기 전에 이 사본으로 store 동의를 먼저 본다.
 *
 * note-store.ts와 같은 결 — 읽다 깨지면 null, 쓰기 실패는 던지지 않는다.
 * 로그아웃·탈퇴 때 clearLocalConsent를 부르는 건 1줄이 붙인다(features/auth/firebase-auth-client.ts).
 *
 * 밀린 저장(pending, 1줄): 동의 화면에서 넘겼는데 서버 저장이 실패하면 보낸 요청을 여기 둔다.
 * 다음 실행에 그대로 다시 보낸다(서버는 같은 선택 재전송이면 시각을 안 바꾼다).
 */

export function getConsentStorageKey(accountKey: string) {
  return `${StorageKeys.consentPrefix}${accountKey}`;
}

/** 계정 키는 user:… 꼴이라 이 자리와 겹치지 않는다 */
export function getPendingConsentStorageKey(accountKey: string) {
  return `${StorageKeys.consentPrefix}pending/${accountKey}`;
}

export async function readLocalConsent(accountKey: string): Promise<ConsentDoc | null> {
  if (!accountKey) return null;

  try {
    const raw = await AsyncStorage.getItem(getConsentStorageKey(accountKey));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    return isConsentDocLike(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeLocalConsent(accountKey: string, doc: ConsentDoc): Promise<void> {
  if (!accountKey) return;

  try {
    await AsyncStorage.setItem(getConsentStorageKey(accountKey), JSON.stringify(doc));
  } catch {
    // 못 써도 다음 실행에 서버에서 다시 읽는다
  }
}

/** 사본과 밀린 저장을 같이 지운다. 로그아웃·탈퇴를 막지 않게 던지지 않는다 */
export async function clearLocalConsent(accountKey: string): Promise<void> {
  if (!accountKey) return;

  try {
    await Promise.all([
      AsyncStorage.removeItem(getConsentStorageKey(accountKey)),
      AsyncStorage.removeItem(getPendingConsentStorageKey(accountKey)),
    ]);
  } catch {
    // 다음 로그인 때 서버 원본으로 다시 맞춘다
  }
}

export async function readPendingConsent(accountKey: string): Promise<SaveConsentRequest | null> {
  if (!accountKey) return null;

  try {
    const raw = await AsyncStorage.getItem(getPendingConsentStorageKey(accountKey));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<SaveConsentRequest> | null;
    return parsed && parsed.accountKey === accountKey && typeof parsed.decisions === 'object'
      ? (parsed as SaveConsentRequest)
      : null;
  } catch {
    return null;
  }
}

export async function writePendingConsent(accountKey: string, request: SaveConsentRequest): Promise<void> {
  if (!accountKey) return;

  try {
    await AsyncStorage.setItem(getPendingConsentStorageKey(accountKey), JSON.stringify(request));
  } catch {
    // 못 쓰면 다음 실행에 다시 못 보낸다 — 서버에 문서가 없으니 화면이 한 번 더 뜬다
  }
}

export async function clearPendingConsent(accountKey: string): Promise<void> {
  if (!accountKey) return;

  try {
    await AsyncStorage.removeItem(getPendingConsentStorageKey(accountKey));
  } catch {
    // 남으면 다음 실행에 한 번 더 보낸다 — 같은 선택이라 서버 문서는 안 흔들린다
  }
}

export function isConsentDocLike(value: unknown): value is ConsentDoc {
  if (typeof value !== 'object' || value === null) return false;
  const doc = value as Partial<ConsentDoc>;

  return (
    doc.schemaVersion === 1 &&
    typeof doc.analysis === 'object' &&
    typeof doc.store === 'object' &&
    typeof doc.review === 'object'
  );
}

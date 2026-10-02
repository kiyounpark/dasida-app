import AsyncStorage from '@react-native-async-storage/async-storage';

import { StorageKeys } from '@/constants/storage-keys';
import type { ConsentDoc } from '@/functions/src/photo-store-contract';

/**
 * 사진 동의 문서의 기기 사본 (1.0.11 줄 0). 원본은 서버 users/{accountKey}/private/consent.
 *
 * 왜 사본을 두나: 앱을 켤 때마다 동의 화면을 띄울지 정해야 하는데, 서버를 기다리면
 * 첫 화면이 늦고 오프라인이면 못 정한다. 1줄(동의 화면)이 서버와 맞춘다.
 *
 * 🔒 10.02 줄 0 리뷰: 이 사본은 **서버 응답(SaveConsentResponse·GetConsentResponse)으로만** 쓴다.
 * 서버 저장이 실패했는데 앱 시각으로 먼저 쓰면 폰은 동의된 줄 아는데 서버는 403을 낸다.
 * (예전 주석의 "2줄은 올리기 전에 이 사본으로 store 동의를 먼저 본다"는 옛 설계 — 서버가 본다.)
 *
 * note-store.ts와 같은 결 — 읽다 깨지면 null, 쓰기·지우기 실패는 던지지 않는다.
 * 로그아웃·탈퇴 때 clearLocalConsent를 부르는 건 1줄이 붙였다(features/auth/firebase-auth-client.ts).
 */

export function getConsentStorageKey(accountKey: string) {
  return `${StorageKeys.consentPrefix}${accountKey}`;
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

/** 서버가 돌려준 문서만 넣는다(위 🔒) */
export async function writeLocalConsent(accountKey: string, doc: ConsentDoc): Promise<void> {
  if (!accountKey) return;

  try {
    await AsyncStorage.setItem(getConsentStorageKey(accountKey), JSON.stringify(doc));
  } catch {
    // 못 써도 다음 실행에 서버에서 다시 읽는다
  }
}

/** 로그아웃·탈퇴를 막지 않게 던지지 않는다 */
export async function clearLocalConsent(accountKey: string): Promise<void> {
  if (!accountKey) return;

  try {
    await AsyncStorage.removeItem(getConsentStorageKey(accountKey));
  } catch {
    // 다음 로그인 때 서버 원본으로 다시 맞춘다
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

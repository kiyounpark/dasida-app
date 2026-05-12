/**
 * GA4 Measurement Protocol (Firebase 앱 스트림) 기반 analytics.
 *
 * @react-native-firebase/analytics는 use_frameworks!:static + Expo New Architecture +
 * RNFB 24 조합에서 native module link 실패 (RNFBAppModule not found). RNFB가
 * New Arch와 완전 호환되기 전까지 GA4 HTTPS endpoint를 직접 호출.
 *
 * 앱 스트림(Firebase App ID 기반)으로 전송 → Firebase Analytics 대시보드에서
 * 앱 데이터로 정상 집계됨 (웹 스트림 G-XXX 방식 아님).
 *
 * 필요 환경변수 (.env):
 *   - EXPO_PUBLIC_GA4_FIREBASE_APP_ID_IOS: 1:xxx:ios:xxx (iOS Firebase App ID)
 *   - EXPO_PUBLIC_GA4_FIREBASE_APP_ID_ANDROID: 1:xxx:android:xxx (Android Firebase App ID)
 *   - EXPO_PUBLIC_GA4_API_SECRET: GA4 Data Stream > Measurement Protocol API secrets
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import type { EventName, EventParams, ScreenName } from './event-types';

const GA4_ENDPOINT = 'https://www.google-analytics.com/mp/collect';
const CLIENT_ID_KEY = 'ga4_client_id';

const FIREBASE_APP_ID =
  Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_GA4_FIREBASE_APP_ID_IOS
    : process.env.EXPO_PUBLIC_GA4_FIREBASE_APP_ID_ANDROID;
const API_SECRET =
  Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_GA4_API_SECRET_IOS
    : process.env.EXPO_PUBLIC_GA4_API_SECRET_ANDROID;

let clientIdPromise: Promise<string> | null = null;
let userIdMemo: string | null = null;

/**
 * 앱 스트림 `app_instance_id`는 32자리 hex 문자열이어야 함 (GA4 validation rule).
 * crypto.randomUUID()는 dash 포함 36자라 dash 제거. fallback은 hex 32자 직접 생성.
 */
function generateClientId(): string {
  const cryptoLike = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoLike?.randomUUID) {
    return cryptoLike.randomUUID().replace(/-/g, '');
  }
  let hex = '';
  while (hex.length < 32) {
    hex += Math.random().toString(16).slice(2);
  }
  return hex.slice(0, 32);
}

const CLIENT_ID_PATTERN = /^[0-9a-f]{32}$/;

async function getClientId(): Promise<string> {
  if (clientIdPromise) return clientIdPromise;
  clientIdPromise = (async () => {
    try {
      const stored = await AsyncStorage.getItem(CLIENT_ID_KEY);
      // 32 hex 형식 검증: 구버전(dash 포함 UUID, 타임스탬프 fallback) 자동 재생성
      if (stored && CLIENT_ID_PATTERN.test(stored)) return stored;
    } catch {
      // AsyncStorage 실패 시 in-memory ID로 fallback
    }
    const id = generateClientId();
    try {
      await AsyncStorage.setItem(CLIENT_ID_KEY, id);
    } catch {
      // 저장 실패 무시: 다음 세션에서 재생성
    }
    return id;
  })();
  return clientIdPromise;
}

async function send(name: string, params: Record<string, unknown>): Promise<void> {
  if (!FIREBASE_APP_ID || !API_SECRET) {
    // 환경변수 미설정: silent no-op (analytics failure must not affect UX)
    return;
  }
  try {
    const clientId = await getClientId();
    const body = {
      // 앱 스트림은 client_id 대신 app_instance_id 사용
      app_instance_id: clientId,
      ...(userIdMemo ? { user_id: userIdMemo } : {}),
      events: [{ name, params }],
    };
    const url = `${GA4_ENDPOINT}?firebase_app_id=${encodeURIComponent(FIREBASE_APP_ID)}&api_secret=${encodeURIComponent(API_SECRET)}`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    // network/fetch failure는 무시
  }
}

export function logEvent<K extends EventName>(
  name: K,
  params: EventParams[K],
): void {
  void send(name as string, (params ?? {}) as Record<string, unknown>);
}

export function setAnalyticsUserId(uid: string | null): void {
  userIdMemo = uid;
}

export function logScreenView(screen: ScreenName): void {
  // GA4 reserved event name 'screen_view'에 매핑
  void send('screen_view', {
    screen_name: screen,
    screen_class: screen,
  });
}

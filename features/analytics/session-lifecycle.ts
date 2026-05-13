/**
 * GA4 앱 스트림 세션/라이프사이클 자동 발사.
 *
 * RNFirebase SDK가 자동으로 보내주던 first_open/session_start/user_engagement를
 * Measurement Protocol 환경에서 직접 처리. AppState 전환을 구독해 세션을 추적.
 *
 * NOTE: session_start / first_open / user_engagement는 GA4 예약 이벤트라
 * MP 전송 시 일부 보고서에 표시되지 않을 수 있음. 활성 사용자 메트릭은
 * Firebase Installations ID (FID)가 진짜여야 정상 집계되는데, MP 환경에선
 * 임의 32-hex라 한계가 있음. RNFB가 New Arch와 호환되면 SDK 자동 처리로 교체.
 *
 * 세션 정의 (GA4 표준):
 *   - 신규 세션 = 앱 첫 실행 OR 30분 이상 백그라운드 후 active 복귀
 *   - 30분 미만 백그라운드 후 복귀는 같은 session_id 유지
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, type AppStateStatus } from 'react-native';

import { logReservedEvent, setCurrentSessionId } from './log-event';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const FIRST_OPEN_KEY = 'analytics_first_open_v1';
// GA4 권장: 단일 user_engagement에 너무 큰 값을 넣으면 클램프됨. 분당 ~60s로 제한.
const MAX_ENGAGEMENT_MS = 60_000;

let initialized = false;
let lastActiveAt: number = Date.now();
let lastBackgroundedAt: number | null = null;

function newSessionId(): string {
  return String(Date.now());
}

function fireSessionStart(): void {
  const id = newSessionId();
  setCurrentSessionId(id);
  lastActiveAt = Date.now();
  logReservedEvent('session_start');
}

function flushUserEngagement(): void {
  const elapsed = Date.now() - lastActiveAt;
  if (elapsed <= 0) return;
  const clamped = Math.min(elapsed, MAX_ENGAGEMENT_MS);
  logReservedEvent('user_engagement', {
    engagement_time_msec: String(clamped),
  });
  lastActiveAt = Date.now();
}

async function fireFirstOpenOnce(): Promise<void> {
  try {
    const seen = await AsyncStorage.getItem(FIRST_OPEN_KEY);
    if (seen) return;
    logReservedEvent('first_open');
    await AsyncStorage.setItem(FIRST_OPEN_KEY, '1');
  } catch {
    // AsyncStorage 실패 시 무시: 다음 세션에서 재시도
  }
}

function handleAppStateChange(state: AppStateStatus): void {
  if (state === 'active') {
    const now = Date.now();
    if (
      lastBackgroundedAt != null &&
      now - lastBackgroundedAt >= SESSION_TIMEOUT_MS
    ) {
      fireSessionStart();
    } else {
      lastActiveAt = now;
    }
    lastBackgroundedAt = null;
  } else if (state === 'background' || state === 'inactive') {
    flushUserEngagement();
    lastBackgroundedAt = Date.now();
  }
}

/**
 * 앱 루트에서 한 번 호출. cleanup 함수 반환.
 */
export function initAnalytics(): () => void {
  if (initialized) return () => {};
  initialized = true;

  void fireFirstOpenOnce();
  fireSessionStart();

  const sub = AppState.addEventListener('change', handleAppStateChange);
  return () => {
    sub.remove();
    initialized = false;
  };
}

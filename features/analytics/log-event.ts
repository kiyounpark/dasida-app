import analytics from '@react-native-firebase/analytics';

import type { EventName, EventParams, ScreenName } from './event-types';

export function logEvent<K extends EventName>(
  name: K,
  params: EventParams[K],
): void {
  try {
    const result = analytics().logEvent(name as string, params as Record<string, unknown>);
    if (result && typeof (result as Promise<void>).catch === 'function') {
      (result as Promise<void>).catch(() => {});
    }
  } catch {
    // analytics failure must not affect UX
  }
}

export function setAnalyticsUserId(uid: string | null): void {
  try {
    const result = analytics().setUserId(uid);
    if (result && typeof (result as Promise<void>).catch === 'function') {
      (result as Promise<void>).catch(() => {});
    }
  } catch {}
}

export function logScreenView(screen: ScreenName): void {
  try {
    const result = analytics().logScreenView({
      screen_name: screen,
      screen_class: screen,
    });
    if (result && typeof (result as Promise<void>).catch === 'function') {
      (result as Promise<void>).catch(() => {});
    }
  } catch {}
}

/**
 * PostHog React Native 싱글톤.
 *
 * GA4 Measurement Protocol과 병렬로 동작. GA4가 실시간 활성 사용자 집계에
 * 약점이 있어 PostHog로 보완 (Product Analytics + Web Analytics 대시보드).
 *
 * 필요 환경변수 (.env):
 *   - EXPO_PUBLIC_POSTHOG_API_KEY: phc_... (Project API key)
 *   - EXPO_PUBLIC_POSTHOG_HOST: https://us.i.posthog.com
 *
 * 이 싱글톤이 보관하는 client 인스턴스는 `app/_layout.tsx`의 `PostHogProvider`에도
 * `client` prop으로 전달된다. Provider가 자체 인스턴스를 만들지 않으므로 in-app
 * Survey/Feature Flag UI와 capture/identify 호출이 동일 인스턴스를 공유한다.
 */
import type { PostHogEventProperties } from '@posthog/core';
import PostHog from 'posthog-react-native';

const API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

// 생성자가 동기적으로 throw해도 앱 부팅이 죽지 않도록 try/catch로 감싼다.
// init 실패 시 영구 no-op (재시도 없음) — boot 시점에 깨지면 mid-session에도 못 살아남는다는 판단.
function createPostHogClient(): PostHog | null {
  if (!API_KEY) return null;
  try {
    return new PostHog(API_KEY, {
      host: HOST,
      // GA4와 같은 의미: 세션 시간 30분 (session-lifecycle.ts의 30분과 동일)
      sessionExpirationTimeSeconds: 30 * 60,
      // 캡쳐 자동 전송 주기 (ms): 5초마다 배치 flush
      flushInterval: 5000,
      // 배치 크기: 20개 모이면 즉시 flush
      flushAt: 20,
      // GA4가 first_open/session_start를 보내므로 PostHog 자동 lifecycle 이벤트는 끔.
      // 켜두면 'Application Opened/Backgrounded'와 GA4 이벤트가 의미상 중복.
      captureAppLifecycleEvents: false,
      // Session Replay 대시보드에서 OFF지만, 클라이언트에서도 명시.
      enableSessionReplay: false,
    });
  } catch (e) {
    if (__DEV__) console.warn('[posthog] init failed', e);
    return null;
  }
}

const posthogClient: PostHog | null = createPostHogClient();

/**
 * PostHog client에 동기 접근. PostHogProvider에 `client` prop으로 전달하는 용도.
 * env 누락 시 null (Provider 미장착).
 */
export function getPostHogClient(): PostHog | null {
  return posthogClient;
}

/**
 * 이벤트 캡쳐. GA4 send() 옆에서 fire-and-forget으로 호출.
 */
export function capture(eventName: string, properties: Record<string, unknown> = {}): void {
  if (!posthogClient) return;
  try {
    posthogClient.capture(eventName, properties as PostHogEventProperties);
  } catch {
    // PostHog 내부 에러는 무시
  }
}

/**
 * Screen view 캡쳐. PostHog는 $screen 이벤트로 별도 트래킹.
 */
export function captureScreen(screenName: string, properties: Record<string, unknown> = {}): void {
  if (!posthogClient) return;
  try {
    posthogClient.screen(screenName, properties as PostHogEventProperties);
  } catch {
    // ignore
  }
}

/**
 * 사용자 식별. GA4의 setAnalyticsUserId와 짝.
 */
export function identify(distinctId: string, properties: Record<string, unknown> = {}): void {
  if (!posthogClient) return;
  try {
    posthogClient.identify(distinctId, properties as PostHogEventProperties);
  } catch {
    // ignore
  }
}

/**
 * 사용자 식별 해제 (로그아웃).
 */
export function reset(): void {
  if (!posthogClient) return;
  try {
    posthogClient.reset();
  } catch {
    // ignore
  }
}

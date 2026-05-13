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
 * 사용 패턴: PostHogProvider 없이 직접 client 호출.
 * GA4 send() 옆에서 posthog.capture()를 호출하는 parallel tracking 구조.
 */
import PostHog from 'posthog-react-native';

const API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

let posthogClient: PostHog | null = null;
let posthogPromise: Promise<PostHog> | null = null;

/**
 * PostHog client lazy 초기화. 첫 호출 시 SDK init.
 * env 누락 시 null 반환 (조용한 no-op).
 */
export function getPostHog(): Promise<PostHog> | null {
  if (!API_KEY) {
    return null;
  }
  if (posthogClient) {
    return Promise.resolve(posthogClient);
  }
  if (posthogPromise) {
    return posthogPromise;
  }
  posthogPromise = (async () => {
    const client = new PostHog(API_KEY, {
      host: HOST,
      // GA4와 같은 의미: 세션 시간 30분
      sessionExpirationTimeSeconds: 30 * 60,
      // 캡쳐 자동 전송 주기 (ms): 5초마다 배치 flush
      flushInterval: 5000,
      // 배치 크기: 20개 모이면 즉시 flush
      flushAt: 20,
    });
    posthogClient = client;
    return client;
  })();
  return posthogPromise;
}

/**
 * 이벤트 캡쳐. GA4 send() 옆에서 fire-and-forget으로 호출.
 */
export function capture(eventName: string, properties: Record<string, unknown> = {}): void {
  const p = getPostHog();
  if (!p) return;
  void p.then((client) => {
    try {
      client.capture(eventName, properties as Record<string, never>);
    } catch {
      // PostHog 내부 에러는 무시
    }
  });
}

/**
 * Screen view 캡쳐. PostHog는 $screen 이벤트로 별도 트래킹.
 */
export function captureScreen(screenName: string, properties: Record<string, unknown> = {}): void {
  const p = getPostHog();
  if (!p) return;
  void p.then((client) => {
    try {
      client.screen(screenName, properties as Record<string, never>);
    } catch {
      // ignore
    }
  });
}

/**
 * 사용자 식별. GA4의 setAnalyticsUserId와 짝.
 */
export function identify(distinctId: string, properties: Record<string, unknown> = {}): void {
  const p = getPostHog();
  if (!p) return;
  void p.then((client) => {
    try {
      client.identify(distinctId, properties as Record<string, never>);
    } catch {
      // ignore
    }
  });
}

/**
 * 사용자 식별 해제 (로그아웃).
 */
export function reset(): void {
  const p = getPostHog();
  if (!p) return;
  void p.then((client) => {
    try {
      client.reset();
    } catch {
      // ignore
    }
  });
}

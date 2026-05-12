/**
 * GA4 Measurement Protocol (Firebase 앱 스트림) 기반 analytics 래퍼 테스트.
 */

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
  },
}));

// Platform.OS는 jest-expo 기본값 'ios'
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// flush microtasks
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

type LogEventModule = typeof import('../log-event');

function loadModule(): LogEventModule {
  let mod!: LogEventModule;
  jest.isolateModules(() => {
    mod = require('../log-event') as LogEventModule;
  });
  return mod;
}

describe('log-event wrapper (GA4 Measurement Protocol, 앱 스트림)', () => {
  beforeEach(() => {
    mockGetItem.mockReset();
    mockSetItem.mockReset();
    mockFetch.mockReset();
    // 32 hex 형식 (GA4 앱 스트림 app_instance_id 요구사항)
    mockGetItem.mockResolvedValue('aaaaaaaabbbbbbbbccccccccdddddddd');
    mockFetch.mockResolvedValue({ ok: true });
    process.env.EXPO_PUBLIC_GA4_FIREBASE_APP_ID_IOS = '1:test:ios:abc';
    process.env.EXPO_PUBLIC_GA4_FIREBASE_APP_ID_ANDROID = '1:test:android:def';
    process.env.EXPO_PUBLIC_GA4_API_SECRET_IOS = 'secret-ios';
    process.env.EXPO_PUBLIC_GA4_API_SECRET_ANDROID = 'secret-android';
  });

  describe('logEvent', () => {
    it('GA4 endpoint에 firebase_app_id와 event를 전달한다', async () => {
      const { logEvent } = loadModule();
      logEvent('review_started', { task_id: 'task-abc' });
      await flush();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('firebase_app_id=1%3Atest%3Aios%3Aabc');
      expect(url).toContain('api_secret=secret-ios');
      expect(init.method).toBe('POST');
      const body = JSON.parse(init.body);
      expect(body.app_instance_id).toBe('aaaaaaaabbbbbbbbccccccccdddddddd');
      expect(body.events).toEqual([
        { name: 'review_started', params: { task_id: 'task-abc' } },
      ]);
    });

    it('params 없는 이벤트는 빈 객체로 전송한다', async () => {
      const { logEvent } = loadModule();
      logEvent('graduation_reached', {});
      await flush();

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.events[0]).toEqual({ name: 'graduation_reached', params: {} });
    });

    it('fetch 실패해도 throw하지 않는다', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network down'));
      const { logEvent } = loadModule();
      expect(() =>
        logEvent('diagnosis_started', { source: 'exam' }),
      ).not.toThrow();
      await flush();
    });

    it('저장된 client_id가 없으면 새로 생성하고 저장한다', async () => {
      mockGetItem.mockResolvedValueOnce(null);
      const { logEvent } = loadModule();
      logEvent('graduation_reached', {});
      await flush();

      expect(mockSetItem).toHaveBeenCalledTimes(1);
      const [key, value] = mockSetItem.mock.calls[0];
      expect(key).toBe('ga4_client_id');
      // GA4 앱 스트림 요구사항: 32자리 hex
      expect(value).toMatch(/^[0-9a-f]{32}$/);
    });

    it('저장된 값이 32-hex 형식이 아니면 재생성한다 (구버전 마이그레이션)', async () => {
      // 구버전 UUID-with-dash 형식
      mockGetItem.mockResolvedValueOnce('550e8400-e29b-41d4-a716-446655440000');
      const { logEvent } = loadModule();
      logEvent('graduation_reached', {});
      await flush();

      expect(mockSetItem).toHaveBeenCalledTimes(1);
      const [, newValue] = mockSetItem.mock.calls[0];
      expect(newValue).toMatch(/^[0-9a-f]{32}$/);
      // body의 app_instance_id도 새 값이어야 함
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.app_instance_id).toMatch(/^[0-9a-f]{32}$/);
    });
  });

  describe('setAnalyticsUserId', () => {
    it('이후 이벤트 body에 user_id가 포함된다', async () => {
      const { logEvent, setAnalyticsUserId } = loadModule();
      setAnalyticsUserId('uid-123');
      logEvent('graduation_reached', {});
      await flush();

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.user_id).toBe('uid-123');
    });

    it('null로 호출하면 다음 이벤트에 user_id가 빠진다', async () => {
      const { logEvent, setAnalyticsUserId } = loadModule();
      setAnalyticsUserId('uid-123');
      setAnalyticsUserId(null);
      logEvent('graduation_reached', {});
      await flush();

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.user_id).toBeUndefined();
    });
  });

  describe('logScreenView', () => {
    it('GA4 reserved event "screen_view"로 전송한다', async () => {
      const { logScreenView } = loadModule();
      logScreenView('mock_exam_intro');
      await flush();

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.events[0]).toEqual({
        name: 'screen_view',
        params: { screen_name: 'mock_exam_intro', screen_class: 'mock_exam_intro' },
      });
    });
  });

  describe('환경변수 미설정', () => {
    it('Firebase App ID 없으면 fetch 호출하지 않는다 (silent no-op)', async () => {
      delete process.env.EXPO_PUBLIC_GA4_FIREBASE_APP_ID_IOS;
      delete process.env.EXPO_PUBLIC_GA4_FIREBASE_APP_ID_ANDROID;
      const { logEvent } = loadModule();
      logEvent('graduation_reached', {});
      await flush();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});

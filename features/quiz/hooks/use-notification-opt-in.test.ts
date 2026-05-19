import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

import { useNotificationOptIn } from './use-notification-opt-in';
import * as scheduler from '@/features/quiz/notifications/review-notification-scheduler';

jest.mock('expo-notifications');
jest.mock('@/features/quiz/notifications/review-notification-scheduler');

const mockGetPermissions = Notifications.getPermissionsAsync as jest.Mock;
const mockRequestPermission = scheduler.requestNotificationPermission as jest.Mock;
const mockSchedule = scheduler.scheduleReviewNotifications as jest.Mock;
const mockCancel = scheduler.cancelAllReviewNotifications as jest.Mock;
const mockGetExpoPushToken = Notifications.getExpoPushTokenAsync as jest.Mock;

describe('useNotificationOptIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPermissions.mockResolvedValue({ status: 'undetermined' });
    mockRequestPermission.mockResolvedValue(true);
    mockSchedule.mockResolvedValue(undefined);
    mockCancel.mockResolvedValue(undefined);
    mockGetExpoPushToken.mockResolvedValue({ data: 'ExponentPushToken[X]' });
  });

  it('권한 undetermined + 약점 있을 때 idle 상태', async () => {
    const { result } = renderHook(() =>
      useNotificationOptIn({
        accountKey: 'a1',
        hasWeaknesses: true,
        isAuthenticated: false,
        registerPushToken: jest.fn(),
      }),
    );
    await waitFor(() => expect(result.current.state).toBe('idle'));
  });

  it('권한 granted면 granted 상태로 가고 스케줄링 실행', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'granted' });
    const { result } = renderHook(() =>
      useNotificationOptIn({
        accountKey: 'a1',
        hasWeaknesses: true,
        isAuthenticated: false,
        registerPushToken: jest.fn(),
      }),
    );
    await waitFor(() => expect(result.current.state).toBe('granted'));
    expect(mockSchedule).toHaveBeenCalledWith('a1', expect.anything());
  });

  it('권한 denied면 denied 상태, 스케줄링 안 함', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'denied' });
    const { result } = renderHook(() =>
      useNotificationOptIn({
        accountKey: 'a1',
        hasWeaknesses: true,
        isAuthenticated: false,
        registerPushToken: jest.fn(),
      }),
    );
    await waitFor(() => expect(result.current.state).toBe('denied'));
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('약점 0개면 카드 안 보이는 상태(dismissed)로 둠', async () => {
    const { result } = renderHook(() =>
      useNotificationOptIn({
        accountKey: 'a1',
        hasWeaknesses: false,
        isAuthenticated: false,
        registerPushToken: jest.fn(),
      }),
    );
    await waitFor(() => expect(result.current.state).toBe('dismissed'));
  });

  it('accountKey 없으면 idle도 안 되고 dismissed로 유지', async () => {
    const { result } = renderHook(() =>
      useNotificationOptIn({
        accountKey: undefined,
        hasWeaknesses: true,
        isAuthenticated: false,
        registerPushToken: jest.fn(),
      }),
    );
    await waitFor(() => expect(result.current.state).toBe('dismissed'));
    expect(mockGetPermissions).not.toHaveBeenCalled();
  });

  it('onEnable: 요청 → 허용 → granted + 스케줄링', async () => {
    mockRequestPermission.mockResolvedValue(true);
    const registerPushToken = jest.fn();
    const { result } = renderHook(() =>
      useNotificationOptIn({
        accountKey: 'a1',
        hasWeaknesses: true,
        isAuthenticated: false,
        registerPushToken,
      }),
    );
    await waitFor(() => expect(result.current.state).toBe('idle'));

    await act(async () => {
      await result.current.onEnable();
    });
    expect(result.current.state).toBe('granted');
    expect(mockSchedule).toHaveBeenCalledWith('a1', expect.anything());
  });

  it('onEnable: 요청 → 거절 → denied', async () => {
    mockRequestPermission.mockResolvedValue(false);
    const registerPushToken = jest.fn();
    const { result } = renderHook(() =>
      useNotificationOptIn({
        accountKey: 'a1',
        hasWeaknesses: true,
        isAuthenticated: false,
        registerPushToken,
      }),
    );
    await waitFor(() => expect(result.current.state).toBe('idle'));

    await act(async () => {
      await result.current.onEnable();
    });
    expect(result.current.state).toBe('denied');
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('onDismiss: state dismissed, OS 다이얼로그 호출 없음', async () => {
    const { result } = renderHook(() =>
      useNotificationOptIn({
        accountKey: 'a1',
        hasWeaknesses: true,
        isAuthenticated: false,
        registerPushToken: jest.fn(),
      }),
    );
    await waitFor(() => expect(result.current.state).toBe('idle'));

    act(() => {
      result.current.onDismiss();
    });
    expect(result.current.state).toBe('dismissed');
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it('인증 사용자: 권한 grant 시 토큰 등록 + 로컬 예약 스킵 + 기존 취소', async () => {
    const registerPushToken = jest.fn().mockResolvedValue(undefined);
    const scheduleSpy = jest.spyOn(scheduler, 'scheduleReviewNotifications');
    const cancelSpy = jest
      .spyOn(scheduler, 'cancelAllReviewNotifications')
      .mockResolvedValue(undefined);
    jest
      .spyOn(Notifications, 'getExpoPushTokenAsync')
      .mockResolvedValue({ data: 'ExponentPushToken[X]' } as any);

    const { result } = renderHook(() =>
      useNotificationOptIn({
        accountKey: 'user:abc',
        hasWeaknesses: true,
        isAuthenticated: true,
        registerPushToken,
      }),
    );
    await act(async () => {
      await result.current.onEnable();
    });

    expect(registerPushToken).toHaveBeenCalledWith(
      'user:abc',
      'ExponentPushToken[X]',
      expect.stringMatching(/ios|android/),
    );
    expect(cancelSpy).toHaveBeenCalled();
    expect(scheduleSpy).not.toHaveBeenCalled();
  });

  it('인증 사용자: 권한 이미 granted면 마운트 시 자동 활성화 — 취소O 로컬예약X 토큰등록O', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'granted' });
    const registerPushToken = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useNotificationOptIn({
        accountKey: 'user:abc',
        hasWeaknesses: true,
        isAuthenticated: true,
        registerPushToken,
      }),
    );

    await waitFor(() => expect(result.current.state).toBe('granted'));
    await waitFor(() =>
      expect(registerPushToken).toHaveBeenCalledWith(
        'user:abc',
        'ExponentPushToken[X]',
        expect.stringMatching(/ios|android/),
      ),
    );
    expect(mockCancel).toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('게스트: 기존 로컬 예약 유지', async () => {
    const scheduleSpy = jest
      .spyOn(scheduler, 'scheduleReviewNotifications')
      .mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useNotificationOptIn({
        accountKey: 'anon:1',
        hasWeaknesses: true,
        isAuthenticated: false,
        registerPushToken: jest.fn(),
      }),
    );
    await act(async () => {
      await result.current.onEnable();
    });
    expect(scheduleSpy).toHaveBeenCalled();
  });
});

import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

import { useNotificationOptIn } from './use-notification-opt-in';
import * as scheduler from '@/features/quiz/notifications/review-notification-scheduler';

jest.mock('expo-notifications');
jest.mock('@/features/quiz/notifications/review-notification-scheduler');

const mockGetPermissions = Notifications.getPermissionsAsync as jest.Mock;
const mockRequestPermission = scheduler.requestNotificationPermission as jest.Mock;
const mockSchedule = scheduler.scheduleReviewNotifications as jest.Mock;

describe('useNotificationOptIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPermissions.mockResolvedValue({ status: 'undetermined' });
    mockRequestPermission.mockResolvedValue(true);
    mockSchedule.mockResolvedValue(undefined);
  });

  it('권한 undetermined + 약점 있을 때 idle 상태', async () => {
    const { result } = renderHook(() =>
      useNotificationOptIn({ accountKey: 'a1', hasWeaknesses: true }),
    );
    await waitFor(() => expect(result.current.state).toBe('idle'));
  });

  it('권한 granted면 granted 상태로 가고 스케줄링 실행', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'granted' });
    const { result } = renderHook(() =>
      useNotificationOptIn({ accountKey: 'a1', hasWeaknesses: true }),
    );
    await waitFor(() => expect(result.current.state).toBe('granted'));
    expect(mockSchedule).toHaveBeenCalledWith('a1', expect.anything());
  });

  it('권한 denied면 denied 상태, 스케줄링 안 함', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'denied' });
    const { result } = renderHook(() =>
      useNotificationOptIn({ accountKey: 'a1', hasWeaknesses: true }),
    );
    await waitFor(() => expect(result.current.state).toBe('denied'));
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('약점 0개면 카드 안 보이는 상태(dismissed)로 둠', async () => {
    const { result } = renderHook(() =>
      useNotificationOptIn({ accountKey: 'a1', hasWeaknesses: false }),
    );
    await waitFor(() => expect(result.current.state).toBe('dismissed'));
  });

  it('accountKey 없으면 idle도 안 되고 dismissed로 유지', async () => {
    const { result } = renderHook(() =>
      useNotificationOptIn({ accountKey: undefined, hasWeaknesses: true }),
    );
    await waitFor(() => expect(result.current.state).toBe('dismissed'));
    expect(mockGetPermissions).not.toHaveBeenCalled();
  });

  it('onEnable: 요청 → 허용 → granted + 스케줄링', async () => {
    mockRequestPermission.mockResolvedValue(true);
    const { result } = renderHook(() =>
      useNotificationOptIn({ accountKey: 'a1', hasWeaknesses: true }),
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
    const { result } = renderHook(() =>
      useNotificationOptIn({ accountKey: 'a1', hasWeaknesses: true }),
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
      useNotificationOptIn({ accountKey: 'a1', hasWeaknesses: true }),
    );
    await waitFor(() => expect(result.current.state).toBe('idle'));

    act(() => {
      result.current.onDismiss();
    });
    expect(result.current.state).toBe('dismissed');
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });
});

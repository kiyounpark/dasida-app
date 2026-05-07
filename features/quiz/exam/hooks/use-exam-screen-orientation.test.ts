import { renderHook } from '@testing-library/react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

import { useExamScreenOrientation } from './use-exam-screen-orientation';

// useFocusEffect를 즉시 호출하는 형태로 모킹해 focus 진입 시점의 effect와 cleanup을 검증한다.
// 실제 expo-router는 navigation focus 이벤트에 묶여 있어 단위 테스트에서 트리거할 수 없으므로,
// effect 콜백을 테스트가 직접 실행할 수 있게 mount 즉시 invoke + cleanup 캡처하는 방식.
let capturedCleanup: (() => void) | undefined | void;

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    capturedCleanup = callback();
  },
}));

jest.mock('expo-screen-orientation', () => ({
  lockAsync: jest.fn(),
  unlockAsync: jest.fn(),
  addOrientationChangeListener: jest.fn(),
  removeOrientationChangeListener: jest.fn(),
  OrientationLock: { PORTRAIT_UP: 1 },
}));

const mocked = jest.mocked(ScreenOrientation);

describe('useExamScreenOrientation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedCleanup = undefined;
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    (console.warn as jest.Mock).mockRestore();
  });

  it('iPad(focus) 진입 시 unlockAsync, blur cleanup 시 PORTRAIT_UP 잠금', async () => {
    mocked.unlockAsync.mockResolvedValue(undefined as never);
    mocked.lockAsync.mockResolvedValue(undefined as never);

    renderHook(() => useExamScreenOrientation({ isTablet: true }));

    // 마이크로태스크 flush
    await Promise.resolve();
    expect(mocked.unlockAsync).toHaveBeenCalledTimes(1);
    expect(mocked.lockAsync).not.toHaveBeenCalled();

    // blur cleanup
    capturedCleanup?.();
    await Promise.resolve();
    expect(mocked.lockAsync).toHaveBeenCalledWith(
      ScreenOrientation.OrientationLock.PORTRAIT_UP,
    );
  });

  it('iPhone(isTablet=false)은 unlockAsync 호출하지 않고 cleanup만 lockAsync 호출', async () => {
    mocked.unlockAsync.mockResolvedValue(undefined as never);
    mocked.lockAsync.mockResolvedValue(undefined as never);

    renderHook(() => useExamScreenOrientation({ isTablet: false }));

    await Promise.resolve();
    expect(mocked.unlockAsync).not.toHaveBeenCalled();

    capturedCleanup?.();
    await Promise.resolve();
    expect(mocked.lockAsync).toHaveBeenCalledWith(
      ScreenOrientation.OrientationLock.PORTRAIT_UP,
    );
  });

  it('onOrientationChange가 주어지면 listener를 등록하고 unmount 시 해제', () => {
    const onOrientationChange = jest.fn();
    const fakeSubscription = { remove: jest.fn() } as unknown as ScreenOrientation.Subscription;
    mocked.addOrientationChangeListener.mockReturnValue(fakeSubscription);

    const { unmount } = renderHook(() =>
      useExamScreenOrientation({ isTablet: true, onOrientationChange }),
    );

    expect(mocked.addOrientationChangeListener).toHaveBeenCalledTimes(1);
    expect(mocked.removeOrientationChangeListener).not.toHaveBeenCalled();

    // listener에 전달된 콜백이 onOrientationChange를 호출하는지 확인
    const registered = mocked.addOrientationChangeListener.mock.calls[0][0];
    registered({} as ScreenOrientation.OrientationChangeEvent);
    expect(onOrientationChange).toHaveBeenCalledTimes(1);

    unmount();
    expect(mocked.removeOrientationChangeListener).toHaveBeenCalledWith(fakeSubscription);
  });

  it('onOrientationChange 미제공 시 listener 등록하지 않음', () => {
    renderHook(() => useExamScreenOrientation({ isTablet: true }));
    expect(mocked.addOrientationChangeListener).not.toHaveBeenCalled();
  });
});

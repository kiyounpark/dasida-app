import { renderHook } from '@testing-library/react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

import * as OrientationLock from '@/hooks/use-orientation-lock';

import { useDiagnosticScreenOrientation } from '@/features/quiz/hooks/use-diagnostic-screen-orientation';

let capturedCleanup: (() => void) | undefined | void;

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    capturedCleanup = callback();
  },
}));

jest.mock('expo-screen-orientation', () => ({
  addOrientationChangeListener: jest.fn(),
  removeOrientationChangeListener: jest.fn(),
}));

jest.mock('@/hooks/use-orientation-lock', () => ({
  unlockAllOrientations: jest.fn(),
  lockToPortrait: jest.fn(),
}));

const mockedOrientation = jest.mocked(ScreenOrientation);
const mockedLock = jest.mocked(OrientationLock);

describe('useDiagnosticScreenOrientation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedCleanup = undefined;
    mockedLock.unlockAllOrientations.mockResolvedValue(undefined);
    mockedLock.lockToPortrait.mockResolvedValue(undefined);
  });

  it('isTablet=true 진입 시 unlockAllOrientations 호출, cleanup 시 lockToPortrait 호출', () => {
    renderHook(() => useDiagnosticScreenOrientation({ isTablet: true }));
    expect(mockedLock.unlockAllOrientations).toHaveBeenCalledTimes(1);
    expect(mockedLock.lockToPortrait).not.toHaveBeenCalled();

    capturedCleanup?.();
    expect(mockedLock.lockToPortrait).toHaveBeenCalledTimes(1);
  });

  it('isTablet=false 진입 시 unlock 호출 안 함', () => {
    renderHook(() => useDiagnosticScreenOrientation({ isTablet: false }));
    expect(mockedLock.unlockAllOrientations).not.toHaveBeenCalled();
  });

  it('onOrientationChange 콜백을 listener로 등록', () => {
    const cb = jest.fn();
    const fakeSubscription = { remove: jest.fn() } as unknown as ScreenOrientation.Subscription;
    mockedOrientation.addOrientationChangeListener.mockReturnValue(fakeSubscription);

    renderHook(() =>
      useDiagnosticScreenOrientation({ isTablet: true, onOrientationChange: cb }),
    );
    expect(mockedOrientation.addOrientationChangeListener).toHaveBeenCalledTimes(1);
    const registered = mockedOrientation.addOrientationChangeListener.mock.calls[0][0];
    registered({} as ScreenOrientation.OrientationChangeEvent);
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

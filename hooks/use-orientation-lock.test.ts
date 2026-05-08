import * as ScreenOrientation from 'expo-screen-orientation';

import { lockToLandscape, lockToPortrait } from './use-orientation-lock';

jest.mock('expo-screen-orientation', () => ({
  lockAsync: jest.fn(),
  OrientationLock: { PORTRAIT_UP: 1, LANDSCAPE: 4 },
}));

const mocked = jest.mocked(ScreenOrientation);

describe('use-orientation-lock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    (console.warn as jest.Mock).mockRestore();
  });

  describe('lockToPortrait', () => {
    it('ScreenOrientation.lockAsync(PORTRAIT_UP) 호출', async () => {
      mocked.lockAsync.mockResolvedValueOnce(undefined as never);
      await lockToPortrait();
      expect(mocked.lockAsync).toHaveBeenCalledWith(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      );
    });

    it('lockAsync 실패해도 throw 안 함', async () => {
      mocked.lockAsync.mockRejectedValueOnce(new Error('boom'));
      await expect(lockToPortrait()).resolves.toBeUndefined();
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('lockToLandscape', () => {
    it('ScreenOrientation.lockAsync(LANDSCAPE) 호출', async () => {
      mocked.lockAsync.mockResolvedValueOnce(undefined as never);
      await lockToLandscape();
      expect(mocked.lockAsync).toHaveBeenCalledWith(
        ScreenOrientation.OrientationLock.LANDSCAPE,
      );
    });

    it('lockAsync 실패해도 throw 안 함', async () => {
      mocked.lockAsync.mockRejectedValueOnce(new Error('boom'));
      await expect(lockToLandscape()).resolves.toBeUndefined();
      expect(console.warn).toHaveBeenCalled();
    });
  });
});

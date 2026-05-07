import AsyncStorage from '@react-native-async-storage/async-storage';

import { hasSeenLandscapeHint, markLandscapeHintSeen } from './landscape-hint-store';

const mocked = jest.mocked(AsyncStorage);

describe('landscape-hint-store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    (console.warn as jest.Mock).mockRestore();
  });

  describe('hasSeenLandscapeHint', () => {
    it('flag 없으면 false 반환', async () => {
      mocked.getItem.mockResolvedValueOnce(null);
      const seen = await hasSeenLandscapeHint();
      expect(seen).toBe(false);
    });

    it('flag "1"이면 true 반환', async () => {
      mocked.getItem.mockResolvedValueOnce('1');
      const seen = await hasSeenLandscapeHint();
      expect(seen).toBe(true);
    });

    it('AsyncStorage 실패 시 false (graceful)', async () => {
      mocked.getItem.mockRejectedValueOnce(new Error('boom'));
      const seen = await hasSeenLandscapeHint();
      expect(seen).toBe(false);
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('markLandscapeHintSeen', () => {
    it('flag "1" 저장', async () => {
      mocked.setItem.mockResolvedValueOnce(undefined);
      await markLandscapeHintSeen();
      expect(mocked.setItem).toHaveBeenCalledWith(
        'dasida/landscape-hint-seen',
        '1',
      );
    });

    it('AsyncStorage 실패해도 throw 안 함', async () => {
      mocked.setItem.mockRejectedValueOnce(new Error('boom'));
      await expect(markLandscapeHintSeen()).resolves.toBeUndefined();
      expect(console.warn).toHaveBeenCalled();
    });
  });
});

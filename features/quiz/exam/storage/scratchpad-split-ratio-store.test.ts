import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadSplitRatio,
  saveSplitRatio,
} from '@/features/quiz/exam/storage/scratchpad-split-ratio-store';

const mocked = jest.mocked(AsyncStorage);
const ACCOUNT = 'user-abc';
const KEY = `dasida/scratchpad-split-ratio/${ACCOUNT}`;

describe('scratchpad-split-ratio-store', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('saveSplitRatio', () => {
    it('계정 키로 비율 저장', async () => {
      mocked.setItem.mockResolvedValueOnce(undefined);
      await saveSplitRatio(ACCOUNT, 0.42);
      expect(mocked.setItem).toHaveBeenCalledWith(KEY, '0.42');
    });

    it('0~1 범위 밖이면 clamp 후 저장', async () => {
      mocked.setItem.mockResolvedValueOnce(undefined);
      await saveSplitRatio(ACCOUNT, 1.5);
      expect(mocked.setItem).toHaveBeenCalledWith(KEY, '1');

      mocked.setItem.mockResolvedValueOnce(undefined);
      await saveSplitRatio(ACCOUNT, -0.5);
      expect(mocked.setItem).toHaveBeenCalledWith(KEY, '0');
    });

    it('AsyncStorage 에러는 삼킴', async () => {
      mocked.setItem.mockRejectedValueOnce(new Error('quota'));
      await expect(saveSplitRatio(ACCOUNT, 0.5)).resolves.toBeUndefined();
    });
  });

  describe('loadSplitRatio', () => {
    it('값 없으면 null', async () => {
      mocked.getItem.mockResolvedValueOnce(null);
      await expect(loadSplitRatio(ACCOUNT)).resolves.toBeNull();
    });

    it('숫자 문자열이면 파싱하여 반환', async () => {
      mocked.getItem.mockResolvedValueOnce('0.42');
      await expect(loadSplitRatio(ACCOUNT)).resolves.toBe(0.42);
    });

    it('숫자가 아니면 null', async () => {
      mocked.getItem.mockResolvedValueOnce('abc');
      await expect(loadSplitRatio(ACCOUNT)).resolves.toBeNull();
    });

    it('NaN/Infinity는 null', async () => {
      mocked.getItem.mockResolvedValueOnce('NaN');
      await expect(loadSplitRatio(ACCOUNT)).resolves.toBeNull();
      mocked.getItem.mockResolvedValueOnce('Infinity');
      await expect(loadSplitRatio(ACCOUNT)).resolves.toBeNull();
    });

    it('AsyncStorage 에러는 null', async () => {
      mocked.getItem.mockRejectedValueOnce(new Error('boom'));
      await expect(loadSplitRatio(ACCOUNT)).resolves.toBeNull();
    });
  });
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadScratchpad,
  saveScratchpad,
  type ProblemScratchpad,
} from '@/features/quiz/exam/storage/scratchpad-strokes-store';

const mocked = jest.mocked(AsyncStorage);
const ACCOUNT = 'user-abc';
const EXAM = 'g3-calc-csat-2024';
const PROBLEM = 21;
const KEY = `dasida/scratchpad/${ACCOUNT}/${EXAM}/${PROBLEM}`;

const SAMPLE: ProblemScratchpad = {
  examId: EXAM,
  problemNumber: PROBLEM,
  strokes: [
    {
      id: 's1',
      tool: 'pen',
      color: '#1A1916',
      size: 2,
      points: [
        { x: 10, y: 20, p: 0.5 },
        { x: 12, y: 22, p: 0.6 },
      ],
    },
  ],
  updatedAt: 1_700_000_000_000,
};

describe('scratchpad-strokes-store', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('saveScratchpad', () => {
    it('계정/시험/문제별 키로 직렬화하여 저장', async () => {
      mocked.setItem.mockResolvedValueOnce(undefined);
      await saveScratchpad(ACCOUNT, SAMPLE);
      expect(mocked.setItem).toHaveBeenCalledWith(KEY, JSON.stringify(SAMPLE));
    });

    it('AsyncStorage 에러를 삼킴 (안전한 무시)', async () => {
      mocked.setItem.mockRejectedValueOnce(new Error('quota'));
      await expect(saveScratchpad(ACCOUNT, SAMPLE)).resolves.toBeUndefined();
    });
  });

  describe('loadScratchpad', () => {
    it('값 없으면 null', async () => {
      mocked.getItem.mockResolvedValueOnce(null);
      await expect(loadScratchpad(ACCOUNT, EXAM, PROBLEM)).resolves.toBeNull();
    });

    it('정상 JSON을 파싱하여 반환', async () => {
      mocked.getItem.mockResolvedValueOnce(JSON.stringify(SAMPLE));
      await expect(loadScratchpad(ACCOUNT, EXAM, PROBLEM)).resolves.toEqual(SAMPLE);
    });

    it('malformed JSON은 null', async () => {
      mocked.getItem.mockResolvedValueOnce('not-json{{');
      await expect(loadScratchpad(ACCOUNT, EXAM, PROBLEM)).resolves.toBeNull();
    });

    it('strokes 필드가 배열이 아니면 null', async () => {
      mocked.getItem.mockResolvedValueOnce(
        JSON.stringify({ examId: EXAM, problemNumber: PROBLEM, strokes: 'oops', updatedAt: 0 }),
      );
      await expect(loadScratchpad(ACCOUNT, EXAM, PROBLEM)).resolves.toBeNull();
    });

    it('AsyncStorage 에러는 null', async () => {
      mocked.getItem.mockRejectedValueOnce(new Error('boom'));
      await expect(loadScratchpad(ACCOUNT, EXAM, PROBLEM)).resolves.toBeNull();
    });

    it('계정 범위 키로 조회', async () => {
      mocked.getItem.mockResolvedValueOnce(null);
      await loadScratchpad(ACCOUNT, EXAM, PROBLEM);
      expect(mocked.getItem).toHaveBeenCalledWith(KEY);
    });
  });
});

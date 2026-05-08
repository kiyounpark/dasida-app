import { renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useProblemStrokes } from '@/features/quiz/exam/hooks/use-problem-strokes';

jest.mock('@/features/learner/provider', () => ({
  useCurrentLearner: () => ({ profile: { accountKey: 'user-abc' } }),
}));

const mocked = jest.mocked(AsyncStorage);

const sampleStored = {
  examId: 'exam-1',
  problemNumber: 21,
  strokes: [
    {
      id: 'a',
      tool: 'pen',
      color: '#000',
      size: 2,
      points: [{ x: 10, y: 20, p: 0.5 }],
    },
  ],
  updatedAt: 1,
};

describe('useProblemStrokes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('strokes 있으면 hasStrokes true', async () => {
    mocked.getItem.mockResolvedValueOnce(JSON.stringify(sampleStored));
    const { result } = renderHook(() => useProblemStrokes('exam-1', 21));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.hasStrokes).toBe(true);
    expect(result.current.strokes).toHaveLength(1);
  });

  it('storage 비어있으면 hasStrokes false', async () => {
    mocked.getItem.mockResolvedValueOnce(null);
    const { result } = renderHook(() => useProblemStrokes('exam-1', 22));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.hasStrokes).toBe(false);
    expect(result.current.strokes).toEqual([]);
  });

  it('examId가 비어있으면 storage 조회 없이 빈 결과', async () => {
    const { result } = renderHook(() => useProblemStrokes('', 0));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.hasStrokes).toBe(false);
    expect(mocked.getItem).not.toHaveBeenCalled();
  });

  it('problemNumber 변경 시 재조회', async () => {
    mocked.getItem
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify({ ...sampleStored, problemNumber: 22 }));
    const { result, rerender } = renderHook(
      ({ p }: { p: number }) => useProblemStrokes('exam-1', p),
      { initialProps: { p: 21 } },
    );
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.hasStrokes).toBe(false);

    rerender({ p: 22 });
    await waitFor(() => expect(result.current.hasStrokes).toBe(true));
    expect(result.current.strokes).toHaveLength(1);
  });
});

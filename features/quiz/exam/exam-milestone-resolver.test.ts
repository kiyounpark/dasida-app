import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolveMilestoneToShow } from '@/features/quiz/exam/exam-milestone-resolver';
import type { MilestoneScope } from '@/features/quiz/exam/exam-milestone-resolver';

const mockedAsyncStorage = jest.mocked(AsyncStorage);

const SCOPE: MilestoneScope = {
  examId: 'exam-001',
  attemptId: 'attempt-abc',
  attemptDateISO: '2026-04-27',
};

describe('resolveMilestoneToShow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('오답 수 10 미만 → 마일스톤 없음, null 반환', async () => {
    await expect(
      resolveMilestoneToShow({ scope: SCOPE, totalNotes: 9, noteCountAfterThis: 9 }),
    ).resolves.toBeNull();
    // AsyncStorage 접근 없어야 함
    expect(mockedAsyncStorage.getItem).not.toHaveBeenCalled();
  });

  it('임계값 미달 → null 반환', async () => {
    // totalNotes=15: at33=4, at67=10 / noteCount=3은 둘 다 미달
    await expect(
      resolveMilestoneToShow({ scope: SCOPE, totalNotes: 15, noteCountAfterThis: 3 }),
    ).resolves.toBeNull();
    expect(mockedAsyncStorage.getItem).not.toHaveBeenCalled();
  });

  it('at33 달성 + 미표시 → 33 반환', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce(null); // 33 not seen
    await expect(
      resolveMilestoneToShow({ scope: SCOPE, totalNotes: 15, noteCountAfterThis: 5 }),
    ).resolves.toBe(33);
    expect(mockedAsyncStorage.getItem).toHaveBeenCalledTimes(1);
  });

  it('at33 달성 + 이미 표시됨 → null 반환', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce('1'); // 33 seen
    await expect(
      resolveMilestoneToShow({ scope: SCOPE, totalNotes: 15, noteCountAfterThis: 5 }),
    ).resolves.toBeNull();
  });

  it('at67 달성 + 미표시 → 67 반환', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce('1'); // 33 seen
    mockedAsyncStorage.getItem.mockResolvedValueOnce(null); // 67 not seen
    await expect(
      resolveMilestoneToShow({ scope: SCOPE, totalNotes: 15, noteCountAfterThis: 10 }),
    ).resolves.toBe(67);
  });

  it('dot-jump: 임계값 초과(count=11, at33=4)해도 33 반환', async () => {
    // at67=10도 달성이지만 33을 먼저 체크
    mockedAsyncStorage.getItem.mockResolvedValueOnce(null); // 33 not seen → return 33
    await expect(
      resolveMilestoneToShow({ scope: SCOPE, totalNotes: 15, noteCountAfterThis: 11 }),
    ).resolves.toBe(33);
  });

  it('두 임계값 동시 돌파: 33 미표시 → 33 반환 (낮은 것 우선)', async () => {
    // at33=4, at67=10 모두 달성 (noteCount=11)
    mockedAsyncStorage.getItem.mockResolvedValueOnce(null); // 33 not seen → return 33
    await expect(
      resolveMilestoneToShow({ scope: SCOPE, totalNotes: 15, noteCountAfterThis: 11 }),
    ).resolves.toBe(33);
    // 67는 아직 체크하지 않음 (33에서 이미 반환)
    expect(mockedAsyncStorage.getItem).toHaveBeenCalledTimes(1);
  });

  it('두 임계값 동시 돌파: 33 표시됨 → 67 반환', async () => {
    mockedAsyncStorage.getItem
      .mockResolvedValueOnce('1')  // 33 already seen
      .mockResolvedValueOnce(null); // 67 not seen
    await expect(
      resolveMilestoneToShow({ scope: SCOPE, totalNotes: 15, noteCountAfterThis: 11 }),
    ).resolves.toBe(67);
    expect(mockedAsyncStorage.getItem).toHaveBeenCalledTimes(2);
  });

  it('두 임계값 모두 표시됨 → null 반환', async () => {
    mockedAsyncStorage.getItem
      .mockResolvedValueOnce('1')  // 33 seen
      .mockResolvedValueOnce('1'); // 67 seen
    await expect(
      resolveMilestoneToShow({ scope: SCOPE, totalNotes: 15, noteCountAfterThis: 11 }),
    ).resolves.toBeNull();
    expect(mockedAsyncStorage.getItem).toHaveBeenCalledTimes(2);
  });

  it('AsyncStorage 에러 시 null 반환 (안전한 기본값)', async () => {
    mockedAsyncStorage.getItem.mockRejectedValueOnce(new Error('storage error'));
    // hasMilestoneShown이 에러를 삼키고 false를 반환하므로 → 33 반환
    await expect(
      resolveMilestoneToShow({ scope: SCOPE, totalNotes: 15, noteCountAfterThis: 5 }),
    ).resolves.toBe(33);
  });
});

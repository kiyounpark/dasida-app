import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildMilestoneStorageKey,
  hasMilestoneShown,
  markMilestoneShown,
  type MilestoneScope,
} from '@/features/quiz/exam/diagnosis-milestone-progress';

const mockedAsyncStorage = jest.mocked(AsyncStorage);

const SCOPE: MilestoneScope = {
  examId: 'exam-001',
  attemptId: 'attempt-123',
  attemptDateISO: '2026-04-26',
};

describe('diagnosis-milestone-progress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('buildMilestoneStorageKey: 분기별 고유 키 생성', () => {
    expect(buildMilestoneStorageKey(SCOPE, 33)).toBe(
      'dasida/exam-diagnosis-milestone/exam-001/2026-04-26-attempt-123/33',
    );
    expect(buildMilestoneStorageKey(SCOPE, 67)).toBe(
      'dasida/exam-diagnosis-milestone/exam-001/2026-04-26-attempt-123/67',
    );
  });

  it('hasMilestoneShown: 저장 값 없으면 false', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce(null);
    await expect(hasMilestoneShown(SCOPE, 33)).resolves.toBe(false);
  });

  it('hasMilestoneShown: 저장 값 있으면 true', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce('1');
    await expect(hasMilestoneShown(SCOPE, 33)).resolves.toBe(true);
  });

  it('markMilestoneShown: setItem 호출', async () => {
    mockedAsyncStorage.setItem.mockResolvedValueOnce(undefined);
    await markMilestoneShown(SCOPE, 67);
    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
      'dasida/exam-diagnosis-milestone/exam-001/2026-04-26-attempt-123/67',
      '1',
    );
  });

  it('hasMilestoneShown: AsyncStorage 에러 시 false (안전한 기본값)', async () => {
    mockedAsyncStorage.getItem.mockRejectedValueOnce(new Error('storage failed'));
    await expect(hasMilestoneShown(SCOPE, 33)).resolves.toBe(false);
  });

  it('markMilestoneShown: AsyncStorage 에러 시 예외를 전파하지 않음', async () => {
    mockedAsyncStorage.setItem.mockRejectedValueOnce(new Error('storage full'));
    await expect(markMilestoneShown(SCOPE, 33)).resolves.toBeUndefined();
  });
});

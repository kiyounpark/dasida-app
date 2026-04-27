/**
 * useExamDiagnosis 오케스트레이션 핵심 동작 검증
 *
 * resolveMilestoneToShow를 직접 import해서 테스트한다.
 * 테스트가 실제 프로덕션 코드를 실행하므로 훅 로직 변경 시 회귀가 즉시 감지된다.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolveMilestoneToShow } from '@/features/quiz/exam/exam-milestone-resolver';
import type { MilestoneScope } from '@/features/quiz/exam/exam-milestone-resolver';
import { markMilestoneShown } from '@/features/quiz/exam/diagnosis-milestone-progress';

const mockedAsyncStorage = jest.mocked(AsyncStorage);

const SCOPE: MilestoneScope = {
  examId: 'exam-001',
  attemptId: 'attempt-abc',
  attemptDateISO: '2026-04-27',
};

describe('useExamDiagnosis 오케스트레이션 — resolveMilestoneToShow 분기', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('마일스톤 미달성 → null 반환 (미니카드 표시 경로)', async () => {
    // totalNotes < MILESTONE_MIN_TOTAL(10) → 마일스톤 없음
    await expect(
      resolveMilestoneToShow({ scope: SCOPE, totalNotes: 5, noteCountAfterThis: 4 }),
    ).resolves.toBeNull();
    expect(mockedAsyncStorage.getItem).not.toHaveBeenCalled();
  });

  it('마일스톤 달성 + 미표시 → fraction 반환 (배너 표시 경로)', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce(null); // 33 not seen
    await expect(
      resolveMilestoneToShow({ scope: SCOPE, totalNotes: 15, noteCountAfterThis: 5 }),
    ).resolves.toBe(33);
  });

  it('마일스톤 달성 + 이미 표시됨 → null 반환 (미니카드 표시 경로)', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce('1'); // 33 already seen
    await expect(
      resolveMilestoneToShow({ scope: SCOPE, totalNotes: 15, noteCountAfterThis: 5 }),
    ).resolves.toBeNull();
  });

  it('markMilestoneShown은 resolveMilestoneToShow 결과로 AsyncStorage에 기록', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce(null); // 33 not seen

    const fraction = await resolveMilestoneToShow({
      scope: SCOPE,
      totalNotes: 15,
      noteCountAfterThis: 5,
    });

    expect(fraction).toBe(33);

    // 훅은 appendBanner(동기 setState) 직후 markMilestoneShown을 호출한다.
    // markMilestoneShown이 실제 AsyncStorage.setItem을 호출하는지 검증.
    await markMilestoneShown(SCOPE, fraction!);
    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
      expect.stringContaining('/33'),
      '1',
    );
  });

});

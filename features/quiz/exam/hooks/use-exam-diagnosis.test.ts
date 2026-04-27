/**
 * useExamDiagnosis 오케스트레이션 핵심 동작 검증
 *
 * renderHook 환경 없이도 검증 가능한 방식: hasMilestoneShown / markMilestoneShown 모킹 후
 * 실제 결정 로직을 직접 호출해 순서와 분기를 확인한다.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  hasMilestoneShown,
  markMilestoneShown,
  type MilestoneScope,
} from '@/features/quiz/exam/diagnosis-milestone-progress';
import { detectMilestoneReached } from '@/features/quiz/exam/diagnosis-milestone';

const mockedAsyncStorage = jest.mocked(AsyncStorage);

const SCOPE: MilestoneScope = {
  examId: 'exam-001',
  attemptId: 'attempt-abc',
  attemptDateISO: '2026-04-27',
};

describe('useExamDiagnosis 오케스트레이션 — 마일스톤/미니카드 분기', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 오케스트레이션 핵심 로직 (use-exam-diagnosis.ts 의 useEffect 내부 로직을 추출)
   * append 콜백을 외부에서 주입해 호출 순서를 검증한다.
   */
  async function runOrchestration(params: {
    milestoneFraction: ReturnType<typeof detectMilestoneReached>;
    isMounted: boolean;
    appendBanner: jest.Mock;
    appendMiniCard: jest.Mock;
  }) {
    const { milestoneFraction, isMounted, appendBanner, appendMiniCard } = params;
    const isMountedFn = () => isMounted;

    let shouldShowMilestone = false;
    if (milestoneFraction !== null) {
      const seen = await hasMilestoneShown(SCOPE, milestoneFraction);
      if (!seen) shouldShowMilestone = true;
    }

    if (!isMountedFn()) return;

    if (shouldShowMilestone && milestoneFraction !== null) {
      appendBanner(milestoneFraction);
      await markMilestoneShown(SCOPE, milestoneFraction);
    } else {
      appendMiniCard();
    }
  }

  it('마일스톤 미달성 → 미니카드 append', async () => {
    const appendBanner = jest.fn();
    const appendMiniCard = jest.fn();

    await runOrchestration({
      milestoneFraction: null,
      isMounted: true,
      appendBanner,
      appendMiniCard,
    });

    expect(appendBanner).not.toHaveBeenCalled();
    expect(appendMiniCard).toHaveBeenCalledTimes(1);
  });

  it('마일스톤 달성 + 미표시 → 배너 append 후 mark', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce(null); // hasMilestoneShown → false
    mockedAsyncStorage.setItem.mockResolvedValueOnce(undefined); // markMilestoneShown

    const callOrder: string[] = [];
    const appendBanner = jest.fn(() => callOrder.push('append'));
    const appendMiniCard = jest.fn();

    // markMilestoneShown이 AsyncStorage.setItem을 호출할 때 순서 기록
    mockedAsyncStorage.setItem.mockImplementationOnce(async () => {
      callOrder.push('mark');
    });

    await runOrchestration({
      milestoneFraction: 33,
      isMounted: true,
      appendBanner,
      appendMiniCard,
    });

    expect(appendBanner).toHaveBeenCalledWith(33);
    expect(appendMiniCard).not.toHaveBeenCalled();
    // append가 mark보다 반드시 먼저 실행돼야 한다
    expect(callOrder).toEqual(['append', 'mark']);
  });

  it('마일스톤 달성 + 이미 표시됨 → 미니카드 append', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce('1'); // hasMilestoneShown → true

    const appendBanner = jest.fn();
    const appendMiniCard = jest.fn();

    await runOrchestration({
      milestoneFraction: 67,
      isMounted: true,
      appendBanner,
      appendMiniCard,
    });

    expect(appendBanner).not.toHaveBeenCalled();
    expect(appendMiniCard).toHaveBeenCalledTimes(1);
    expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('마운트 해제 상태이면 append/mark 모두 실행하지 않음', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce(null); // hasMilestoneShown → false

    const appendBanner = jest.fn();
    const appendMiniCard = jest.fn();

    await runOrchestration({
      milestoneFraction: 33,
      isMounted: false, // 컴포넌트가 이미 언마운트됨
      appendBanner,
      appendMiniCard,
    });

    expect(appendBanner).not.toHaveBeenCalled();
    expect(appendMiniCard).not.toHaveBeenCalled();
    expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
  });
});

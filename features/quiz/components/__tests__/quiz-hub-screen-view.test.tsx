import { fireEvent, render, screen } from '@testing-library/react-native';

import type { UseQuizHubScreenResult } from '@/features/quiz/hooks/use-quiz-hub-screen';

import { QuizHubScreenView } from '../quiz-hub-screen-view';

// 무거운 자식은 testID만 가진 Text로 대체한다 (이 테스트의 관심사는 훅 순서와 split 골격).
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/hooks/use-is-tablet', () => ({
  useIsTablet: () => true,
}));

jest.mock('@/features/quiz/components/journey-board', () => ({
  JourneyBoard: () =>
    require('react').createElement(
      require('react-native').Text,
      { testID: 'journey-board' },
      'journey-board',
    ),
}));

jest.mock('@/features/quiz/components/poster-title-banner', () => ({
  PosterTitleBanner: () =>
    require('react').createElement(
      require('react-native').Text,
      { testID: 'poster-banner' },
      'poster-banner',
    ),
}));

jest.mock('@/features/quiz/components/journey-hub-right-panel', () => ({
  JourneyHubRightPanel: () =>
    require('react').createElement(
      require('react-native').Text,
      { testID: 'right-panel' },
      'right-panel',
    ),
}));

const baseProps = {
  analysisState: { isInProgress: false },
  authNoticeMessage: null,
  getExamTitle: () => '시험',
  homeState: { nextReviewTask: null },
  isCompactLayout: false,
  isReady: true,
  journey: { ctaLabel: '이어서 풀기', currentStepKey: 'step-1' },
  onDismissAuthNotice: jest.fn(),
  onOpenPractice: jest.fn(),
  onOpenRecentResult: jest.fn(),
  onPressExam: jest.fn(),
  onPressJourneyCta: jest.fn(),
  onPressPhoto: jest.fn(),
  onPressReviewCard: jest.fn(),
  onRediagnose: jest.fn(),
  onRefresh: jest.fn(),
  onResumeAnalysis: jest.fn(),
  onStartDiagnostic: jest.fn(),
  profile: { id: 'p1' },
  session: { id: 's1' },
  showAnalysisResumeCard: false,
  showBrandHeader: false,
  showJourneyHero: true,
  showJourneyBoard: true,
  showNoReviewDayCard: false,
  showReviewHomeCard: false,
  showWeaknessSection: false,
} as unknown as UseQuizHubScreenResult;

describe('QuizHubScreenView 태블릿 split 레이아웃', () => {
  it('로딩(isReady=false)에서 정상 상태로 넘어가도 훅 순서가 깨지지 않는다', () => {
    const { rerender } = render(<QuizHubScreenView {...baseProps} isReady={false} />);
    expect(screen.getByText('학습 여정을 준비 중이에요')).toBeTruthy();

    // 훅이 early return 뒤에 있으면 이 rerender에서
    // "Rendered more hooks than during the previous render"로 터진다.
    expect(() => rerender(<QuizHubScreenView {...baseProps} />)).not.toThrow();

    expect(screen.getByTestId('right-panel')).toBeTruthy();
  });

  it('split 좌측 컬럼 measure 후 JourneyBoard를 렌더한다', () => {
    render(<QuizHubScreenView {...baseProps} />);

    fireEvent(screen.getByTestId('journey-split-left-column'), 'layout', {
      nativeEvent: { layout: { width: 640, height: 800, x: 0, y: 0 } },
    });

    expect(screen.getByTestId('journey-board')).toBeTruthy();
  });

  /**
   * 아이패드 홈에도 사진 오답노트로 들어가는 문이 있어야 한다.
   * 폰(photo-entry-card-on-home.test.tsx)과 태블릿은 렌더 경로가 통째로 갈라져서,
   * 한쪽에 카드를 붙여도 다른 쪽은 그대로 0개다 — 08.26에 폰만 붙은 채로 하루를 보냈다.
   */
  it('사진 오답노트 카드가 보인다 — 좌측 컬럼 measure 전에도', () => {
    render(<QuizHubScreenView {...baseProps} />);
    expect(screen.getByText('틀린 문제, 사진 한 장이면 돼요')).toBeTruthy();
  });

  it('사진 카드를 누르면 사진 화면으로 보내는 손잡이를 부른다', () => {
    const onPressPhoto = jest.fn();
    render(<QuizHubScreenView {...baseProps} onPressPhoto={onPressPhoto} />);

    fireEvent.press(screen.getByLabelText('사진으로 물어보기'));

    expect(onPressPhoto).toHaveBeenCalledTimes(1);
  });
});

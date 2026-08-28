import { fireEvent, render, screen } from '@testing-library/react-native';

import type { UseQuizHubScreenResult } from '@/features/quiz/hooks/use-quiz-hub-screen';

import { QuizHubScreenView } from '../quiz-hub-screen-view';

// 폰 경로를 본다 — 옆 파일(quiz-hub-screen-view.test.tsx)은 태블릿 split만 지나가서
// 이 카드를 한 번도 안 밟는다.
jest.mock('@/hooks/use-is-tablet', () => ({
  useIsTablet: () => false,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// 폰 경로는 진짜 ScrollView를 그린다 — NativeAnimatedModule이 없어 터진다.
// photo-flow-screen.test.tsx가 쓰는 것과 같은 대체품.
jest.mock('react-native/Libraries/Components/ScrollView/ScrollView', () => {
  const React = require('react');
  const RN = jest.requireActual('react-native');
  const MockScrollView = React.forwardRef(
    ({ children, contentContainerStyle: _c, ...props }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({ scrollToEnd: () => {} }));
      return React.createElement(RN.View, props, children);
    },
  );
  MockScrollView.displayName = 'ScrollView';
  return { __esModule: true, default: MockScrollView };
});

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

/**
 * 사진 오답노트로 들어가는 문은 이 카드 하나뿐이다.
 * 출시 빌드에서 개발자 화면은 홈으로 되돌려보내고, 딥링크는 개발 클라이언트가 가로챈다.
 * 이 카드가 사라지면 기능이 통째로 닿을 수 없게 되는데, 앱을 실제로 켜보기 전에는 안 보인다.
 */
describe('홈의 사진 오답노트 입구 (폰)', () => {
  it('여정 진행 중에도 카드가 보인다', () => {
    render(<QuizHubScreenView {...baseProps} />);
    expect(screen.getByText('틀린 문제, 찍기만 하면 돼요')).toBeTruthy();
  });

  it('시험 분석 중에도 카드가 보인다 — 홈 골격이 바뀌어도 문은 남는다', () => {
    render(<QuizHubScreenView {...baseProps} showAnalysisResumeCard />);
    expect(screen.getByText('틀린 문제, 찍기만 하면 돼요')).toBeTruthy();
  });

  it('누르면 사진 화면으로 보내는 손잡이를 부른다', () => {
    const onPressPhoto = jest.fn();
    render(<QuizHubScreenView {...baseProps} onPressPhoto={onPressPhoto} />);

    fireEvent.press(screen.getByLabelText('사진 찍어서 물어보기'));

    expect(onPressPhoto).toHaveBeenCalledTimes(1);
  });
});

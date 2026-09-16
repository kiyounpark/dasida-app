import { render, screen } from '@testing-library/react-native';

import type { UseQuizHubScreenResult } from '@/features/quiz/hooks/use-quiz-hub-screen';

import { QuizHubScreenView } from '../quiz-hub-screen-view';

// 태블릿 경로. 예전에는 여기에 전용 split 레이아웃(좌: 여정보드 / 우: 패널)이 있었다.
// 보드를 걷어내면서 split도 같이 걷혔고, 지금 태블릿은 폰과 같은 한 줄 배치를 쓴다.
// 이 파일은 "태블릿에서도 홈이 그려진다"만 지킨다.
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/hooks/use-is-tablet', () => ({
  useIsTablet: () => true,
}));

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

jest.mock('@/features/quiz/components/review-home-card', () => ({
  ReviewHomeCard: () =>
    require('react').createElement(
      require('react-native').Text,
      { testID: 'review-home-card' },
      'review-home-card',
    ),
}));

jest.mock('@/components/brand/BrandHeader', () => ({
  BrandHeader: () =>
    require('react').createElement(
      require('react-native').Text,
      { testID: 'brand-header' },
      'brand-header',
    ),
}));

const baseProps = {
  analysisState: { isInProgress: false },
  authNoticeMessage: null,
  getExamTitle: () => '시험',
  homeState: { weaknessProgressItems: [] },
  isCompactLayout: false,
  isReady: true,
  onDismissAuthNotice: jest.fn(),
  onPressExam: jest.fn(),
  onPressPhoto: jest.fn(),
  onPressReviewTask: jest.fn(),
  onRefresh: jest.fn(),
  onResumeAnalysis: jest.fn(),
  profile: { id: 'p1' },
  session: { id: 's1' },
  showAnalysisResumeCard: false,
  showNoReviewDayCard: false,
  showWeaknessSection: false,
  today: {
    mode: 'empty',
    dueTasks: [],
    title: '아직 복습할 게 없어요',
    body: '틀린 문제를 찍어서 올리면 여기에 쌓여요.',
  },
} as unknown as UseQuizHubScreenResult;

describe('홈 (태블릿)', () => {
  it('복습 재료가 없으면 사진 카드를 그린다', () => {
    render(<QuizHubScreenView {...baseProps} />);
    expect(screen.getByText('틀린 문제, 찍기만 하면 돼요')).toBeTruthy();
  });

  it('오늘 복습이 있으면 복습 리스트를 그린다', () => {
    render(
      <QuizHubScreenView
        {...baseProps}
        today={
          {
            mode: 'review',
            dueTasks: [
              {
                id: 'a',
                weaknessId: 'discriminant_calculation',
                stage: 'day1',
                scheduledFor: '2026-09-15',
                source: 'weakness-practice',
                sourceId: 'src-a',
              },
            ],
            title: '오늘 복습할 게 1개 있어요',
            body: '하나만 짧게 다시 보면 돼요.',
          } as unknown as UseQuizHubScreenResult['today']
        }
      />,
    );

    expect(screen.getByTestId('home-review-list')).toBeTruthy();
  });

  it('상태 복원에 실패하면 다시 불러오기를 제안한다', () => {
    render(<QuizHubScreenView {...baseProps} today={null} />);
    expect(screen.getByText('다시 불러오기')).toBeTruthy();
  });
});

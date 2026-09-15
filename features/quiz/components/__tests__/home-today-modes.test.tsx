import { render, screen } from '@testing-library/react-native';

import type { UseQuizHubScreenResult } from '@/features/quiz/hooks/use-quiz-hub-screen';

import { QuizHubScreenView } from '../quiz-hub-screen-view';

jest.mock('@/hooks/use-is-tablet', () => ({
  useIsTablet: () => false,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
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

// 리스트 1번 칸은 기존 hero 카드를 그대로 쓴다. 내부(10초 타이머)는 이 테스트의 관심사가 아니다.
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

function makeTask(id: string) {
  return {
    id,
    weaknessId: 'discriminant_calculation',
    stage: 'day1',
    scheduledFor: '2026-09-15',
    source: 'weakness-practice',
    sourceId: `src-${id}`,
  };
}

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

describe('홈 3갈래 (C안)', () => {
  it('재료가 없으면 사진 카드만 뜨고 복습 리스트는 없다', () => {
    render(<QuizHubScreenView {...baseProps} />);

    expect(screen.getByText('틀린 문제, 찍기만 하면 돼요')).toBeTruthy();
    expect(screen.queryByTestId('home-review-list')).toBeNull();
  });

  it('재료가 없으면 홈이 그 사실을 말한다 — 사진 카드만으론 복습 얘기가 안 나온다', () => {
    render(<QuizHubScreenView {...baseProps} />);

    expect(screen.getByTestId('home-today-heading')).toBeTruthy();
    expect(screen.getByText('아직 복습할 게 없어요')).toBeTruthy();
    expect(screen.getByText('틀린 문제를 찍어서 올리면 여기에 쌓여요.')).toBeTruthy();
  });

  it('오늘 차례가 아니면 복습 없는 날 카드와 사진 카드가 같이 뜬다', () => {
    render(
      <QuizHubScreenView
        {...baseProps}
        showNoReviewDayCard
        today={
          {
            mode: 'resting',
            dueTasks: [],
            nextTask: makeTask('next'),
            title: '오늘은 복습 없는 날이에요',
            body: '새로 틀린 문제를 찍어두면 다음 복습이 늘어나요.',
          } as unknown as UseQuizHubScreenResult['today']
        }
      />,
    );

    expect(screen.getByText('틀린 문제, 찍기만 하면 돼요')).toBeTruthy();
    expect(screen.queryByTestId('home-review-list')).toBeNull();
    // 복습없는날 카드가 이미 "오늘은 복습 없는 날이에요 · 다음 복습 D-N"을 말한다.
    // 같은 말을 두 번 하지 않는다.
    expect(screen.queryByTestId('home-today-heading')).toBeNull();
  });

  it('오늘 복습이 있으면 리스트가 뜨고 사진은 작은 줄로 남는다', () => {
    render(
      <QuizHubScreenView
        {...baseProps}
        today={
          {
            mode: 'review',
            dueTasks: [makeTask('a'), makeTask('b')],
            nextTask: makeTask('a'),
            title: '오늘 복습할 게 2개 있어요',
            body: '위에서부터 차례로 보면 돼요.',
          } as unknown as UseQuizHubScreenResult['today']
        }
      />,
    );

    expect(screen.getByTestId('home-review-list')).toBeTruthy();
    expect(screen.getByText('오늘 복습할 게 2개 있어요')).toBeTruthy();
    // C안의 핵심 — 복습이 있는 날에도 사진 문은 남는다. 단 큰 카드가 아니라 한 줄로.
    expect(screen.getByLabelText('사진 추가하기')).toBeTruthy();
    expect(screen.queryByText('틀린 문제, 찍기만 하면 돼요')).toBeNull();
    // 리스트가 자기 제목을 들고 있다. 위에 또 붙이지 않는다.
    expect(screen.queryByTestId('home-today-heading')).toBeNull();
  });
});

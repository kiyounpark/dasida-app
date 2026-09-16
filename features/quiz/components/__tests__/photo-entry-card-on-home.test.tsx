import { fireEvent, render, screen } from '@testing-library/react-native';

import type { UseQuizHubScreenResult } from '@/features/quiz/hooks/use-quiz-hub-screen';

import { QuizHubScreenView } from '../quiz-hub-screen-view';

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

const reviewToday = {
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
} as unknown as UseQuizHubScreenResult['today'];

/**
 * 사진 오답노트로 들어가는 문은 홈의 이 입구 하나뿐이다.
 * 출시 빌드에서 개발자 화면은 홈으로 되돌려보내고, 딥링크는 개발 클라이언트가 가로챈다.
 * 이 문이 사라지면 기능이 통째로 닿을 수 없게 되는데, 앱을 실제로 켜보기 전에는 안 보인다.
 *
 * 홈 골격 셋(복습 없음 · 복습 있음 · 실모 분석 중) 어디서도 문이 없어지면 안 된다.
 * 복습이 있는 날에는 큰 카드 대신 리스트 끝의 한 줄이 그 문이다 (C안).
 */
describe('홈의 사진 오답노트 입구 (폰)', () => {
  it('복습 재료가 없으면 큰 카드로 보인다', () => {
    render(<QuizHubScreenView {...baseProps} />);
    expect(screen.getByText('틀린 문제, 찍기만 하면 돼요')).toBeTruthy();
  });

  it('오늘 복습이 있으면 리스트 끝의 한 줄로 남는다', () => {
    render(<QuizHubScreenView {...baseProps} today={reviewToday} />);
    expect(screen.getByLabelText('사진 추가하기')).toBeTruthy();
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

  it('리스트의 한 줄을 눌러도 같은 손잡이를 부른다', () => {
    const onPressPhoto = jest.fn();
    render(
      <QuizHubScreenView {...baseProps} today={reviewToday} onPressPhoto={onPressPhoto} />,
    );

    fireEvent.press(screen.getByLabelText('사진 추가하기'));

    expect(onPressPhoto).toHaveBeenCalledTimes(1);
  });
});

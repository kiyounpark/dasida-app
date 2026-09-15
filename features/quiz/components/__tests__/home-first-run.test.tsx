import { fireEvent, render, screen } from '@testing-library/react-native';

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
  showFirstRun: true,
  showNoReviewDayCard: false,
  showWeaknessSection: false,
  today: {
    mode: 'empty',
    dueTasks: [],
    title: '아직 복습할 게 없어요',
    body: '틀린 문제를 찍어서 올리면 여기에 쌓여요.',
  },
} as unknown as UseQuizHubScreenResult;

/**
 * 처음 온 학생이 보는 화면. web-proto/index.html의 첫 화면(#screen-upload)을 앱으로 옮긴 것.
 * 웹에서 쓰던 문구를 그대로 쓰되, 앱에서 거짓이 되는 줄("설치·로그인 없음")은 뺀다.
 */
describe('처음 온 학생의 홈', () => {
  it('웹 프로토의 약속을 그대로 말한다', () => {
    render(<QuizHubScreenView {...baseProps} />);

    expect(screen.getByText('틀린 문제만 찍어서 올려줘')).toBeTruthy();
    expect(screen.getByText(/왜 틀렸는지/)).toBeTruthy();
    expect(
      screen.getByText('채점은 이미 했잖아. 틀린 문제 하나, 풀이 흔적까지 나오게 찍으면 돼.'),
    ).toBeTruthy();
  });

  it('찍으면 뭐가 나오는지 3단계로 미리 알려준다', () => {
    render(<QuizHubScreenView {...baseProps} />);

    expect(screen.getByText('틀린 문제 하나를 풀이까지 나오게 찍는다')).toBeTruthy();
    expect(screen.getByText('AI가 풀이를 읽고 어디서 막혔는지 찾는다')).toBeTruthy();
    expect(screen.getByText('질문 몇 개로 확정한다 — 오답노트 한 장이 나온다')).toBeTruthy();
  });

  it('앱에서 거짓이 되는 줄은 빼고 온다', () => {
    render(<QuizHubScreenView {...baseProps} />);

    // 웹 프로토의 "설치·로그인 없음"은 앱에서 거짓말이다.
    // 이미 설치했고, 로그인도 이 화면 앞에서 시켰다.
    expect(screen.queryByText(/설치·로그인 없음/)).toBeNull();
  });

  it('누르면 사진 화면으로 보낸다', () => {
    const onPressPhoto = jest.fn();
    render(<QuizHubScreenView {...baseProps} onPressPhoto={onPressPhoto} />);

    fireEvent.press(screen.getByLabelText('틀린 문제 사진 올리기'));

    expect(onPressPhoto).toHaveBeenCalledTimes(1);
  });

  it('복습 재료가 없다는 말은 여기서 안 한다 — 아직 아무것도 안 해본 학생이다', () => {
    render(<QuizHubScreenView {...baseProps} />);

    expect(screen.queryByText('아직 복습할 게 없어요')).toBeNull();
    expect(screen.queryByText('틀린 문제, 찍기만 하면 돼요')).toBeNull();
  });

  it('사진을 한 장이라도 찍었으면 이 화면은 안 나온다', () => {
    render(<QuizHubScreenView {...baseProps} showFirstRun={false} />);

    expect(screen.queryByText('틀린 문제만 찍어서 올려줘')).toBeNull();
    expect(screen.getByText('아직 복습할 게 없어요')).toBeTruthy();
    expect(screen.getByText('틀린 문제, 찍기만 하면 돼요')).toBeTruthy();
  });
});

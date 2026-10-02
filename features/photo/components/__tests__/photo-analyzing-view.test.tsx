import { fireEvent, render, screen } from '@testing-library/react-native';

import { logEvent } from '@/features/analytics/log-event';
import { PhotoAnalyzingView } from '../photo-analyzing-view';

jest.mock('@/features/analytics/log-event', () => ({ logEvent: jest.fn() }));

// 공용 목(__mocks__)엔 useReducedMotion이 없다 — 이 테스트에서만 덧붙인다
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('../../../../__mocks__/react-native-reanimated.js'),
  useReducedMotion: () => false,
}));

// ScrollView 내부 의존성(NativeAnimatedModule) 오류를 피하려고 단순 View로 바꾼다 (photo-flow-screen 테스트와 같은 방식)
jest.mock('react-native/Libraries/Components/ScrollView/ScrollView', () => {
  const React = require('react');
  const RN = jest.requireActual('react-native');
  const MockScrollView = React.forwardRef(({ children, contentContainerStyle: _c, ...props }: any, _ref: any) =>
    React.createElement(RN.View, props, children),
  );
  // react-native 인덱스가 .default로 꺼내 쓴다
  return { __esModule: true, default: MockScrollView };
});

const mockLog = logEvent as jest.Mock;

describe('PhotoAnalyzingView 예시 오답노트', () => {
  beforeEach(() => {
    mockLog.mockClear();
    // 시작 카드 무작위를 첫 장으로 고정
    jest.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('대기 문구와 함께 첫 예시 카드를 "네 사진 아님"으로 보여준다', () => {
    render(<PhotoAnalyzingView />);

    expect(screen.getByText('사진에서 네 손글씨 읽는 중…')).toBeTruthy();
    expect(screen.getByText('1/3 · 네 사진 아님')).toBeTruthy();
    expect(screen.getByText('f(x) = x³ − 3x² + 3x 의 극값을 구하시오.')).toBeTruthy();
    expect(screen.getByText('↑ 여기서 갈라졌어')).toBeTruthy();
  });

  it('[다음 예시 보기]는 다음 카드로 넘기고, 마지막 뒤엔 처음으로 돌아가며 넘김을 남긴다', () => {
    render(<PhotoAnalyzingView />);
    const next = screen.getByText('다음 예시 보기');

    fireEvent.press(next);
    expect(screen.getByText('2/3 · 네 사진 아님')).toBeTruthy();
    // 적분 위끝·아래끝은 따로 쌓는다
    expect(screen.getByText('∫')).toBeTruthy();
    expect(mockLog).toHaveBeenLastCalledWith('photo_wait_card_next', {
      card_index: 1,
      wait_ms: expect.any(Number),
    });

    fireEvent.press(next);
    fireEvent.press(next);
    expect(screen.getByText('1/3 · 네 사진 아님')).toBeTruthy();
    expect(mockLog).toHaveBeenCalledTimes(3);
  });
});

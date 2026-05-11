import { fireEvent, render, screen } from '@testing-library/react-native';

// ScrollView 내부 의존성(NativeAnimatedModule)으로 인한 NativeEventEmitter 오류를 피하기 위해 단순 View 로 대체.
jest.mock('react-native/Libraries/Components/ScrollView/ScrollView', () => {
  const React = require('react');
  const RN = jest.requireActual('react-native');
  const MockScrollView = React.forwardRef(
    ({ children, contentContainerStyle: _c, ...props }: any, ref: any) =>
      React.createElement(RN.View, { ref, ...props }, children),
  );
  MockScrollView.displayName = 'MockScrollView';
  return { __esModule: true, default: MockScrollView };
});

// JourneyCtaButton 은 expo-image 의존성을 갖고 있어 단순 Pressable 로 대체.
jest.mock('@/features/quiz/components/journey-cta-button', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    JourneyCtaButton: ({ label, onPress }: { label: string; onPress: () => void }) =>
      React.createElement(
        Pressable,
        { accessibilityRole: 'button', accessibilityLabel: label, onPress },
        React.createElement(Text, null, label),
      ),
  };
});

jest.mock('@/features/quiz/exam/components/exam-analysis-resume-carousel', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return {
    ExamAnalysisResumeCarousel: ({
      items,
    }: {
      items: { attemptId: string; examTitle: string }[];
    }) =>
      React.createElement(
        View,
        { testID: 'mock-carousel' },
        items.map((it) => React.createElement(Text, { key: it.attemptId }, it.examTitle)),
      ),
  };
});

import { JourneyHubRightPanel } from '../journey-hub-right-panel';

const baseProps = {
  analysisResumeItems: [],
  ctaLabel: '첫 진단 시작하기',
  isCompactLayout: false,
  onPressCta: jest.fn(),
  onResumeAnalysis: jest.fn(),
  showAnalysisResume: false,
  stepKey: 'diagnostic' as const,
};

describe('JourneyHubRightPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('showAnalysisResume=false 이면 STEP 카드는 rich 모드(예상 시간 라벨 표시)이고 카루셀은 렌더되지 않는다', () => {
    render(<JourneyHubRightPanel {...baseProps} showAnalysisResume={false} />);

    expect(screen.queryByText('예상 시간')).not.toBeNull();
    expect(screen.queryByTestId('mock-carousel')).toBeNull();
  });

  it('showAnalysisResume=true 이고 analysisResumeItems가 있으면 STEP 카드는 compact 모드이고 카루셀이 렌더된다', () => {
    const items = [
      { attemptId: 'a1', examTitle: '2024학년도 6월 모의고사', noteCount: 3, totalNotes: 10 },
      { attemptId: 'a2', examTitle: '2024학년도 9월 모의고사', noteCount: 5, totalNotes: 12 },
    ];

    render(
      <JourneyHubRightPanel
        {...baseProps}
        analysisResumeItems={items}
        showAnalysisResume={true}
      />,
    );

    // compact 모드: 메타 라벨 미표시
    expect(screen.queryByText('예상 시간')).toBeNull();
    expect(screen.queryByText('난이도')).toBeNull();

    // 카루셀 + 아이템 텍스트 렌더
    expect(screen.queryByTestId('mock-carousel')).not.toBeNull();
    expect(screen.queryByText('2024학년도 6월 모의고사')).not.toBeNull();
    expect(screen.queryByText('2024학년도 9월 모의고사')).not.toBeNull();
  });

  it('showAnalysisResume=true 이지만 analysisResumeItems가 빈 배열이면 카루셀이 렌더되지 않는다', () => {
    render(
      <JourneyHubRightPanel
        {...baseProps}
        analysisResumeItems={[]}
        showAnalysisResume={true}
      />,
    );

    expect(screen.queryByTestId('mock-carousel')).toBeNull();
    // STEP 카드는 여전히 compact 모드
    expect(screen.queryByText('예상 시간')).toBeNull();
  });

  it('CTA 버튼을 누르면 onPressCta 가 호출된다', () => {
    const onPressCta = jest.fn();

    render(
      <JourneyHubRightPanel
        {...baseProps}
        ctaLabel="첫 진단 시작하기"
        onPressCta={onPressCta}
      />,
    );

    const ctaButton = screen.getByRole('button', { name: '첫 진단 시작하기' });
    fireEvent.press(ctaButton);

    expect(onPressCta).toHaveBeenCalledTimes(1);
  });
});

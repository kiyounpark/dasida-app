import { fireEvent, render, screen } from '@testing-library/react-native';

// Dimensions.get('window') is called in a useState initializer.
// react-native/index.js exports Dimensions via a lazy getter that calls
// require('./Libraries/Utilities/Dimensions').default — the global jest.setup.js
// mock is missing __esModule/default, so we override it here with a proper one.
jest.mock('react-native/Libraries/Utilities/Dimensions', () => {
  const dim = { width: 375, height: 812, scale: 1, fontScale: 1 };
  const Dimensions = {
    get: jest.fn(() => dim),
    set: jest.fn(),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
  };
  return { __esModule: true, default: Dimensions };
});

// FlatList and its VirtualizedList internals pull in several native modules
// (Keyboard, NativePlatformConstantsIOS, etc.) that are null in the test env.
// Mock FlatList to just render all items — this is sufficient for behavioral tests.
jest.mock('react-native/Libraries/Lists/FlatList', () => {
  const React = require('react');
  const { View } = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function MockFlatList({ data, renderItem }: { data: any[]; renderItem: (info: { item: any; index: number }) => any }) {
    return React.createElement(
      View,
      null,
      (data ?? []).map((item: any, index: number) =>
        React.createElement(View, { key: index }, renderItem({ item, index })),
      ),
    );
  }
  return { __esModule: true, default: MockFlatList };
});

import {
  ExamAnalysisResumeCarousel,
  type ExamAnalysisResumeCarouselItem,
} from '../exam-analysis-resume-carousel';

function makeItem(
  attemptId: string,
  examTitle: string = `시험 ${attemptId}`,
  noteCount = 1,
  totalNotes = 3,
): ExamAnalysisResumeCarouselItem {
  return { attemptId, examTitle, noteCount, totalNotes };
}

describe('ExamAnalysisResumeCarousel', () => {
  it('items가 비어 있으면 null 반환 (홈에서 카드 영역 비표시)', () => {
    const { toJSON } = render(
      <ExamAnalysisResumeCarousel items={[]} onPressItem={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('items 1개 → 단일 카드, 탭 시 attemptId 전달', () => {
    const onPressItem = jest.fn();
    const item = makeItem('a1', '시험 A');
    render(
      <ExamAnalysisResumeCarousel items={[item]} onPressItem={onPressItem} />,
    );

    expect(screen.queryByText('시험 A')).not.toBeNull();

    fireEvent.press(screen.getByText('이어서 분석하기 →'));
    expect(onPressItem).toHaveBeenCalledWith('a1');
    expect(onPressItem).toHaveBeenCalledTimes(1);
  });

  it('items 3개 → 모든 카드 렌더, 각 CTA 3개', () => {
    const items = [
      makeItem('a1', '시험 A'),
      makeItem('b1', '시험 B'),
      makeItem('c1', '시험 C'),
    ];
    render(
      <ExamAnalysisResumeCarousel items={items} onPressItem={jest.fn()} />,
    );

    expect(screen.queryByText('시험 A')).not.toBeNull();
    expect(screen.queryByText('시험 B')).not.toBeNull();
    expect(screen.queryByText('시험 C')).not.toBeNull();

    // FlatList는 모든 카드를 mount함 (3개는 모두 보임)
    expect(screen.queryAllByText('이어서 분석하기 →')).toHaveLength(3);
  });

  it('items 2개 → 두 번째 카드 탭 시 해당 attemptId 전달', () => {
    const onPressItem = jest.fn();
    const items = [makeItem('latest', '최신'), makeItem('older', '이전')];
    render(
      <ExamAnalysisResumeCarousel items={items} onPressItem={onPressItem} />,
    );

    const ctas = screen.queryAllByText('이어서 분석하기 →');
    expect(ctas).toHaveLength(2);

    fireEvent.press(ctas[1]); // 두 번째 카드(이전)
    expect(onPressItem).toHaveBeenCalledWith('older');
  });
});

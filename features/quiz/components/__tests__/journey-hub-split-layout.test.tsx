import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { JourneyHubSplitLayout } from '../journey-hub-split-layout';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

type Props = Parameters<typeof JourneyHubSplitLayout>[0];

const renderLayout = (overrides: Partial<Props> = {}) => {
  const leftBoard = overrides.leftBoard ?? jest.fn(() => <Text testID="board">BOARD</Text>);
  const utils = render(
    <JourneyHubSplitLayout
      authNotice={overrides.authNotice ?? null}
      posterBanner={overrides.posterBanner ?? <Text testID="poster">POSTER</Text>}
      rightPanel={overrides.rightPanel ?? <Text testID="right">RIGHT</Text>}
      leftBoard={leftBoard}
    />,
  );
  return { leftBoard, ...utils };
};

const fireLayout = (node: ReturnType<typeof screen.getByTestId>, width: number) => {
  fireEvent(node, 'layout', {
    nativeEvent: { layout: { width, height: 800, x: 0, y: 0 } },
  });
};

describe('JourneyHubSplitLayout', () => {
  it('초기 렌더 시(measure 전) leftBoard를 호출하지 않는다', () => {
    const leftBoard = jest.fn(() => <Text>BOARD</Text>);
    renderLayout({ leftBoard });
    expect(leftBoard).not.toHaveBeenCalled();
  });

  it('onLayout 측정 후 leftBoard에 width 인자를 전달해 호출한다', () => {
    const leftBoard = jest.fn(() => <Text testID="board">BOARD</Text>);
    renderLayout({ leftBoard });

    const leftColumn = screen.getByTestId('journey-split-left-column');
    fireLayout(leftColumn, 640);

    expect(leftBoard).toHaveBeenCalledWith(640);
    expect(screen.getByTestId('board')).toBeTruthy();
  });

  it('width <= 0 이면 leftBoard를 호출하지 않는다', () => {
    const leftBoard = jest.fn(() => <Text>BOARD</Text>);
    renderLayout({ leftBoard });

    const leftColumn = screen.getByTestId('journey-split-left-column');
    fireLayout(leftColumn, 0);

    expect(leftBoard).not.toHaveBeenCalled();
  });

  it('posterBanner와 rightPanel 자식 노드를 렌더한다', () => {
    renderLayout();
    expect(screen.getByTestId('poster')).toBeTruthy();
    expect(screen.getByTestId('right')).toBeTruthy();
  });

  it('authNotice=null 이면 authNotice wrapper를 렌더하지 않는다', () => {
    renderLayout({ authNotice: null });
    expect(screen.queryByTestId('journey-split-auth-notice')).toBeNull();
  });

  it('authNotice가 있으면 해당 wrapper와 내용을 렌더한다', () => {
    renderLayout({ authNotice: <Text testID="notice-content">NOTICE</Text> });
    expect(screen.getByTestId('journey-split-auth-notice')).toBeTruthy();
    expect(screen.getByTestId('notice-content')).toBeTruthy();
  });
});

import { render, fireEvent } from '@testing-library/react-native';
import { NotificationOptInCard } from './notification-opt-in-card';

describe('NotificationOptInCard', () => {
  const baseProps = {
    weaknessLabels: ['판별식', '인수분해'],
    onEnable: jest.fn(),
    onDismiss: jest.fn(),
    state: 'idle' as const,
  };

  beforeEach(() => jest.clearAllMocks());

  it('약점 라벨을 카피에 노출한다', () => {
    const { getByText } = render(<NotificationOptInCard {...baseProps} />);
    expect(getByText(/판별식/)).toBeTruthy();
    expect(getByText(/인수분해/)).toBeTruthy();
  });

  it('[켜기] 탭 시 onEnable 호출', () => {
    const onEnable = jest.fn();
    const { getByText } = render(
      <NotificationOptInCard {...baseProps} onEnable={onEnable} />,
    );
    fireEvent.press(getByText('켜기'));
    expect(onEnable).toHaveBeenCalledTimes(1);
  });

  it('[나중에] 탭 시 onDismiss 호출', () => {
    const onDismiss = jest.fn();
    const { getByText } = render(
      <NotificationOptInCard {...baseProps} onDismiss={onDismiss} />,
    );
    fireEvent.press(getByText('나중에'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('state가 requesting이면 버튼 비활성', () => {
    const onEnable = jest.fn();
    const { getByText } = render(
      <NotificationOptInCard {...baseProps} state="requesting" onEnable={onEnable} />,
    );
    fireEvent.press(getByText('켜기'));
    expect(onEnable).not.toHaveBeenCalled();
  });

  it('state가 granted면 카드 자체를 안 그림', () => {
    const { queryByText } = render(
      <NotificationOptInCard {...baseProps} state="granted" />,
    );
    expect(queryByText('켜기')).toBeNull();
  });

  it('state가 dismissed면 카드 자체를 안 그림', () => {
    const { queryByText } = render(
      <NotificationOptInCard {...baseProps} state="dismissed" />,
    );
    expect(queryByText('켜기')).toBeNull();
  });
});

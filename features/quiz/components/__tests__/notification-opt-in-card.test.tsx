import { render, fireEvent, screen, userEvent } from '@testing-library/react-native';
import { NotificationOptInCard } from '../notification-opt-in-card';

describe('NotificationOptInCard', () => {
  const baseProps = {
    weaknessLabels: ['판별식', '인수분해'],
    onEnable: jest.fn(),
    state: 'idle' as const,
  };

  beforeEach(() => jest.clearAllMocks());

  it('A1 priming 카피("58%")를 노출한다', () => {
    const { getAllByText } = render(<NotificationOptInCard {...baseProps} />);
    expect(getAllByText(/58%/).length).toBeGreaterThan(0);
  });

  it('"망각 곡선 경고" eyebrow를 노출한다', () => {
    const { getByText } = render(<NotificationOptInCard {...baseProps} />);
    expect(getByText(/망각 곡선 경고/)).toBeTruthy();
  });

  it('[다음] 탭 시 onEnable 호출', () => {
    const onEnable = jest.fn();
    const { getByText } = render(
      <NotificationOptInCard {...baseProps} onEnable={onEnable} />,
    );
    fireEvent.press(getByText('다음'));
    expect(onEnable).toHaveBeenCalledTimes(1);
  });

  // 1.0.12 Q1' — 애플 HIG pre-alert: 버튼 하나, 「허용」류 말 아님, 닫기·나중에 없음,
  // 버튼이 시스템 창을 연다는 걸 카드가 말한다.
  it('버튼은 「다음」 하나뿐 — 「알림 켜기」·「나중에」 없음', () => {
    render(<NotificationOptInCard {...baseProps} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByText('알림 켜기')).toBeNull();
    expect(screen.queryByText('나중에')).toBeNull();
  });

  it('「다음」이 알림 허용 창을 연다고 말한다', () => {
    render(<NotificationOptInCard {...baseProps} />);
    expect(screen.getByText(/알림 허용 창이 떠요/)).toBeTruthy();
  });

  it('state가 requesting이면 [다음] 비활성', async () => {
    const onEnable = jest.fn();
    const user = userEvent.setup();
    render(
      <NotificationOptInCard {...baseProps} state="requesting" onEnable={onEnable} />,
    );
    await user.press(screen.getByText('다음'));
    expect(onEnable).not.toHaveBeenCalled();
  });

  it('state가 granted면 카드 자체를 안 그림', () => {
    const { queryByText } = render(
      <NotificationOptInCard {...baseProps} state="granted" />,
    );
    expect(queryByText('다음')).toBeNull();
  });

  it('state가 denied면 카드 자체를 안 그림', () => {
    const { queryByText } = render(
      <NotificationOptInCard {...baseProps} state="denied" />,
    );
    expect(queryByText('다음')).toBeNull();
  });

  it('state가 dismissed면 카드 자체를 안 그림', () => {
    const { queryByText } = render(
      <NotificationOptInCard {...baseProps} state="dismissed" />,
    );
    expect(queryByText('다음')).toBeNull();
  });
});

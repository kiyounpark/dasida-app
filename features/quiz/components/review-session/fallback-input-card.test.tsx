import { fireEvent, render } from '@testing-library/react-native';
import { FallbackInputCard } from './fallback-input-card';

describe('FallbackInputCard', () => {
  it('전송 버튼 클릭 시 onSubmit 호출', () => {
    const onSubmit = jest.fn();
    const { getByLabelText } = render(
      <FallbackInputCard
        text="한 번 더 답변"
        turn={2}
        interactive
        onChangeText={() => {}}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.press(getByLabelText('자유 입력 전송'));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('interactive=false면 비활성', () => {
    const onSubmit = jest.fn();
    const { getByLabelText } = render(
      <FallbackInputCard
        text="x"
        turn={1}
        interactive={false}
        onChangeText={() => {}}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.press(getByLabelText('자유 입력 전송'));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

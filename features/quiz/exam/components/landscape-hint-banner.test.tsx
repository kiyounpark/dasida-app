import { render, fireEvent } from '@testing-library/react-native';

import { LandscapeHintBanner } from './landscape-hint-banner';

describe('LandscapeHintBanner', () => {
  it('메시지 텍스트 렌더링', () => {
    const { getByText } = render(<LandscapeHintBanner onDismiss={jest.fn()} />);
    expect(getByText(/옆으로 돌리면/)).toBeTruthy();
  });

  it('✕ 탭 시 onDismiss 호출', () => {
    const onDismiss = jest.fn();
    const { getByLabelText } = render(<LandscapeHintBanner onDismiss={onDismiss} />);
    fireEvent.press(getByLabelText('안내 닫기'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

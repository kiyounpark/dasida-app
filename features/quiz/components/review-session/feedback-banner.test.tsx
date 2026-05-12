import { render } from '@testing-library/react-native';
import { FeedbackBanner } from './feedback-banner';

describe('FeedbackBanner', () => {
  it('correct=true → "정답" 라벨', () => {
    const { getByText } = render(<FeedbackBanner correct text="잘 했어요" />);
    expect(getByText('정답')).toBeTruthy();
    expect(getByText('잘 했어요')).toBeTruthy();
  });
  it('correct=false → "다시 한 번" 라벨', () => {
    const { getByText } = render(<FeedbackBanner correct={false} text="다른 보기를 보세요" />);
    expect(getByText('다시 한 번')).toBeTruthy();
  });
});

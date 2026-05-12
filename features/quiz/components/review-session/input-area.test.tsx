import { fireEvent, render } from '@testing-library/react-native';
import { InputArea } from './input-area';

const step = {
  title: 't', body: 'b',
  choices: [
    { text: '가 선택지', correct: true },
    { text: '나 선택지', correct: false },
  ],
} as any;

describe('InputArea', () => {
  it('선택지 누르면 onSelectChoice 호출', () => {
    const onSelectChoice = jest.fn();
    const { getByText } = render(
      <InputArea
        step={step}
        freeText=""
        interactive
        onSelectChoice={onSelectChoice}
        onChangeFreeText={() => {}}
        onSubmitFreeText={() => {}}
      />,
    );
    fireEvent.press(getByText('가 선택지'));
    expect(onSelectChoice).toHaveBeenCalledWith(0);
  });

  it('자유 입력 전송 버튼은 텍스트 있고 interactive일 때만 활성', () => {
    const onSubmit = jest.fn();
    const { getByLabelText, rerender } = render(
      <InputArea
        step={step}
        freeText=""
        interactive
        onSelectChoice={() => {}}
        onChangeFreeText={() => {}}
        onSubmitFreeText={onSubmit}
      />,
    );
    fireEvent.press(getByLabelText('자유 입력 전송'));
    expect(onSubmit).not.toHaveBeenCalled();

    rerender(
      <InputArea
        step={step}
        freeText="이해한 내용"
        interactive
        onSelectChoice={() => {}}
        onChangeFreeText={() => {}}
        onSubmitFreeText={onSubmit}
      />,
    );
    fireEvent.press(getByLabelText('자유 입력 전송'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('interactive=false면 선택지와 입력 모두 비활성', () => {
    const onSelectChoice = jest.fn();
    const onSubmit = jest.fn();
    const { getByText, getByLabelText } = render(
      <InputArea
        step={step}
        freeText="x"
        interactive={false}
        onSelectChoice={onSelectChoice}
        onChangeFreeText={() => {}}
        onSubmitFreeText={onSubmit}
      />,
    );
    fireEvent.press(getByText('가 선택지'));
    fireEvent.press(getByLabelText('자유 입력 전송'));
    expect(onSelectChoice).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

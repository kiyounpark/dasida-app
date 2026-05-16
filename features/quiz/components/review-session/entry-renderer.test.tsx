import { render } from '@testing-library/react-native';
import { EntryRenderer } from './entry-renderer';
import { createAiBubbleEntry, createChoiceBubbleEntry, createAiTypingEntry } from './review-entries';

const baseProps = {
  step: { title: 's', body: 'b', choices: [], example: '' } as any,
  currentStepIndex: 0, totalSteps: 1,
  freeText: '', fallbackText: '',
  onSelectChoice: jest.fn(), onChangeFreeText: jest.fn(), onSubmitFreeText: jest.fn(),
  onChangeFallbackText: jest.fn(), onSubmitFallback: jest.fn(),
  onPressDoneCta: jest.fn(),
  onRemedialExplainPrimary: jest.fn(), onRemedialExplainSecondary: jest.fn(),
  onRemedialCheckOption: jest.fn(), onRemedialCheckDontKnow: jest.fn(),
  onRemedialDiagnoseOption: jest.fn(), onRemedialSummaryContinue: jest.fn(),
};

describe('EntryRenderer', () => {
  it('ai-bubble entry → AI 텍스트 표시', () => {
    const { getByText } = render(
      <EntryRenderer entry={createAiBubbleEntry('안녕하세요')} {...baseProps} />,
    );
    expect(getByText('안녕하세요')).toBeTruthy();
  });
  it('choice-bubble → "보기 X" 텍스트 표시', () => {
    const { getByText } = render(
      <EntryRenderer entry={createChoiceBubbleEntry(1, '두 배', false)} {...baseProps} />,
    );
    expect(getByText(/두 배/)).toBeTruthy();
  });
  it('ai-typing → 렌더 가능 (스냅샷)', () => {
    const tree = render(<EntryRenderer entry={createAiTypingEntry()} {...baseProps} />);
    expect(tree).toBeTruthy();
  });
});

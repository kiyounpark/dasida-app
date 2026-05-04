import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ExamSolveTabletLayout } from '@/features/quiz/exam/components/exam-solve-tablet-layout';

jest.mock('@/features/learner/provider', () => ({
  useCurrentLearner: () => ({ profile: { accountKey: 'user-abc' } }),
}));

jest.mock('@/features/quiz/exam/storage/scratchpad-split-ratio-store', () => ({
  loadSplitRatio: jest.fn().mockResolvedValue(null),
  saveSplitRatio: jest.fn(),
}));

jest.mock('@/features/quiz/exam/storage/scratchpad-strokes-store', () => {
  const actual = jest.requireActual('@/features/quiz/exam/storage/scratchpad-strokes-store');
  return {
    ...actual,
    loadScratchpad: jest.fn().mockResolvedValue(null),
    saveScratchpad: jest.fn(),
  };
});

// Skia canvas is heavy / native — mock to a plain View so the layout test stays focused
jest.mock('@/features/quiz/exam/components/scratchpad-canvas', () => ({
  ScratchpadCanvas: () => null,
}));

// SplitDivider depends on RNGH/Reanimated which require native setup in tests
jest.mock('@/features/quiz/exam/components/split-divider', () => ({
  SplitDivider: () => null,
}));

describe('ExamSolveTabletLayout', () => {
  it('renders header, problem panel, toolbar, and canvas frame without crashing', async () => {
    const { getByText, getByLabelText } = render(
      <ExamSolveTabletLayout
        examId="exam-1"
        problemNumber={21}
        header={<Text>HEADER</Text>}
        problemPanel={<Text>PROBLEM_PANEL</Text>}
      />,
    );

    await waitFor(() => expect(getByText('HEADER')).toBeTruthy());
    expect(getByText('PROBLEM_PANEL')).toBeTruthy();
    // Toolbar exposes the pencil-only toggle via accessibilityLabel
    expect(getByLabelText('펜슬 전용 모드')).toBeTruthy();
  });
});

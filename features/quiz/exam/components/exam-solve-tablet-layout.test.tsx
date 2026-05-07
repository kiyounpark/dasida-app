import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ExamSolveTabletLayout } from '@/features/quiz/exam/components/exam-solve-tablet-layout';
import type { UseScratchpadResult } from '@/features/quiz/exam/hooks/use-scratchpad';

jest.mock('@/features/learner/provider', () => ({
  useCurrentLearner: () => ({ profile: { accountKey: 'user-abc' } }),
}));

jest.mock('@/features/quiz/exam/storage/scratchpad-split-ratio-store', () => ({
  loadSplitRatio: jest.fn().mockResolvedValue(null),
  saveSplitRatio: jest.fn(),
}));

// Skia canvas is heavy / native — mock to a plain View so the layout test stays focused
jest.mock('@/features/quiz/exam/components/scratchpad-canvas', () => ({
  ScratchpadCanvas: () => null,
}));

// SplitDivider depends on RNGH/Reanimated which require native setup in tests
jest.mock('@/features/quiz/exam/components/split-divider', () => ({
  SplitDivider: () => null,
}));

const noopScratchpad: UseScratchpadResult = {
  loaded: true,
  strokes: [],
  liveStroke: null,
  tool: 'pen',
  color: '#1A1916',
  size: 2,
  setTool: jest.fn(),
  setColor: jest.fn(),
  setSize: jest.fn(),
  beginStroke: jest.fn(),
  appendPoint: jest.fn(),
  endStroke: jest.fn(),
  undo: jest.fn(),
  redo: jest.fn(),
  clear: jest.fn(),
  canUndo: false,
  canRedo: false,
};

describe('ExamSolveTabletLayout', () => {
  it('renders header, problem panel, toolbar, and canvas frame without crashing', async () => {
    const { getByText, getByLabelText } = render(
      <ExamSolveTabletLayout
        header={<Text>HEADER</Text>}
        problemPanel={<Text>PROBLEM_PANEL</Text>}
        scratchpad={noopScratchpad}
      />,
    );

    await waitFor(() => expect(getByText('HEADER')).toBeTruthy());
    expect(getByText('PROBLEM_PANEL')).toBeTruthy();
    // Toolbar exposes the pencil-only toggle via accessibilityLabel
    expect(getByLabelText('펜슬 전용 모드')).toBeTruthy();
  });
});

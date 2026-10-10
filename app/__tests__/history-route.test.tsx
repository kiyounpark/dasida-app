import { useIsFocused } from '@react-navigation/native';
import { render } from '@testing-library/react-native';

import HistoryTabScreen from '@/features/history/screens/history-screen';
import { useCurrentLearner } from '@/features/learner/provider';
import { PhotoNotesScreen } from '@/features/photo/screens/photo-notes-screen';

import HistoryRoute from '../(tabs)/history';
import TabLayout from '../(tabs)/_layout';

jest.mock('@react-navigation/native', () => ({ useIsFocused: jest.fn(() => true) }));
jest.mock('@/features/learner/provider', () => ({ useCurrentLearner: jest.fn() }));
jest.mock('@/features/photo/screens/photo-notes-screen', () => ({
  PhotoNotesScreen: jest.fn(() => null),
}));
jest.mock('@/features/history/screens/history-screen', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

// 탭 레이아웃은 탭마다 받은 옵션만 모은다 — 어느 탭이 탭바에 남는지만 본다
const mockTabScreens: { name: string; options: Record<string, unknown> }[] = [];
jest.mock('expo-router', () => {
  const Tabs = ({ children }: { children: unknown }) => children;
  Tabs.Screen = (props: { name: string; options: Record<string, unknown> }) => {
    mockTabScreens.push(props);
    return null;
  };
  return { Tabs };
});
jest.mock('@/components/haptic-tab', () => ({ HapticTab: () => null }));
jest.mock('@/components/ui/icon-symbol', () => ({ IconSymbol: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

let mockExamDoorsVisible = false;
jest.mock('@/features/quiz/exam/exam-doors', () => ({
  get EXAM_DOORS_VISIBLE() {
    return mockExamDoorsVisible;
  },
}));

/**
 * 🔒 10.10 기출은 화면에서만 내린다(q-5) — 문 넷 중 탭 둘(「기출」 탭 · 「내 기록」)을 잠근다.
 * 홈 두 문은 no-review-day-card.test.tsx와 use-quiz-hub-screen.ts(isAnalysisInProgress)에.
 */
describe('기출을 내린 동안의 탭', () => {
  const mockUseCurrentLearner = useCurrentLearner as jest.Mock;
  const mockNotes = PhotoNotesScreen as unknown as jest.Mock;
  const mockHistory = HistoryTabScreen as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTabScreens.length = 0;
    mockExamDoorsVisible = false;
    (useIsFocused as jest.Mock).mockReturnValue(true);
  });

  it('「기출」 탭은 탭바에서 빠진다(href: null) — 화면 파일은 남는다', () => {
    render(<TabLayout />);

    const exam = mockTabScreens.find((s) => s.name === 'exam');
    expect(exam?.options.href).toBeNull();
    // 나머지 탭은 그대로 보인다
    for (const name of ['quiz', 'history', 'profile']) {
      expect(mockTabScreens.find((s) => s.name === name)?.options.href).toBeUndefined();
    }
  });

  it('「내 기록」은 오답노트를 탭 모양으로 그린다 — 계정 키·헤더 함수를 내려준다', () => {
    const getRemoteAuthHeaders = jest.fn();
    mockUseCurrentLearner.mockReturnValue({ session: { accountKey: 'user:abc' }, getRemoteAuthHeaders });

    render(<HistoryRoute />);

    expect(mockNotes.mock.calls[0][0]).toEqual({ accountKey: 'user:abc', getRemoteAuthHeaders, inTab: true });
    expect(mockHistory).not.toHaveBeenCalled();
  });

  it('탭이 안 보일 땐 그리지 않는다 — 다시 들를 때 새로 읽어서 그 사이 만든 노트가 보인다', () => {
    mockUseCurrentLearner.mockReturnValue({ session: null });
    (useIsFocused as jest.Mock).mockReturnValue(false);

    render(<HistoryRoute />);

    expect(mockNotes).not.toHaveBeenCalled();
  });

  it('기출을 다시 꺼내면 「기출」 탭과 옛 기록 화면이 돌아온다', () => {
    mockExamDoorsVisible = true;
    mockUseCurrentLearner.mockReturnValue({ session: null });

    render(<TabLayout />);
    render(<HistoryRoute />);

    expect(mockTabScreens.find((s) => s.name === 'exam')?.options.href).toBeUndefined();
    expect(mockHistory).toHaveBeenCalled();
    expect(mockNotes).not.toHaveBeenCalled();
  });
});

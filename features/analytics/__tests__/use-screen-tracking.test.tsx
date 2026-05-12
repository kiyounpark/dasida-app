import { renderHook } from '@testing-library/react-native';
import { useScreenTracking } from '../use-screen-tracking';
import { logScreenView } from '../log-event';

jest.mock('../log-event', () => ({
  logScreenView: jest.fn(),
}));

const mockSegments = jest.fn<string[], []>();
jest.mock('expo-router', () => ({
  useSegments: () => mockSegments(),
}));

describe('useScreenTracking', () => {
  beforeEach(() => {
    (logScreenView as jest.Mock).mockReset();
  });

  it('logs quiz_hub when segments=[(tabs), quiz]', () => {
    mockSegments.mockReturnValue(['(tabs)', 'quiz']);
    renderHook(() => useScreenTracking());
    expect(logScreenView).toHaveBeenCalledWith('quiz_hub');
  });

  it('logs mock_exam_intro for quiz/mock-exam-intro', () => {
    mockSegments.mockReturnValue(['quiz', 'mock-exam-intro']);
    renderHook(() => useScreenTracking());
    expect(logScreenView).toHaveBeenCalledWith('mock_exam_intro');
  });

  it('logs review_session for quiz/review-session', () => {
    mockSegments.mockReturnValue(['quiz', 'review-session']);
    renderHook(() => useScreenTracking());
    expect(logScreenView).toHaveBeenCalledWith('review_session');
  });

  it('logs sign_in for sign-in route', () => {
    mockSegments.mockReturnValue(['sign-in']);
    renderHook(() => useScreenTracking());
    expect(logScreenView).toHaveBeenCalledWith('sign_in');
  });

  it('does not fire screen_view for unmapped route, warns in dev', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockSegments.mockReturnValue(['totally-new-route']);
    renderHook(() => useScreenTracking());
    expect(logScreenView).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('totally-new-route'));
    warnSpy.mockRestore();
  });

  it('does not fire or warn for empty segments (router init)', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockSegments.mockReturnValue([]);
    renderHook(() => useScreenTracking());
    expect(logScreenView).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('does not re-fire when segments are unchanged', () => {
    mockSegments.mockReturnValue(['(tabs)', 'quiz']);
    const { rerender } = renderHook(() => useScreenTracking());
    rerender({});
    expect(logScreenView).toHaveBeenCalledTimes(1);
  });
});

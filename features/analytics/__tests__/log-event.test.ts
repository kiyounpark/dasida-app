import { logEvent, setAnalyticsUserId, logScreenView } from '../log-event';

const mockLogEvent = jest.fn();
const mockSetUserId = jest.fn();
const mockLogScreenView = jest.fn();

jest.mock('@react-native-firebase/analytics', () => ({
  __esModule: true,
  default: () => ({
    logEvent: mockLogEvent,
    setUserId: mockSetUserId,
    logScreenView: mockLogScreenView,
  }),
}));

describe('log-event wrapper', () => {
  beforeEach(() => {
    mockLogEvent.mockReset();
    mockSetUserId.mockReset();
    mockLogScreenView.mockReset();
  });

  describe('logEvent', () => {
    it('forwards event name and params to firebase analytics', () => {
      logEvent('review_started', { task_id: 'task-abc' });
      expect(mockLogEvent).toHaveBeenCalledWith('review_started', {
        task_id: 'task-abc',
      });
    });

    it('forwards events with no params', () => {
      logEvent('graduation_reached', {});
      expect(mockLogEvent).toHaveBeenCalledWith('graduation_reached', {});
    });

    it('does not throw if firebase logEvent rejects', async () => {
      mockLogEvent.mockRejectedValueOnce(new Error('network down'));
      expect(() =>
        logEvent('diagnosis_started', { source: 'exam' }),
      ).not.toThrow();
    });
  });

  describe('setAnalyticsUserId', () => {
    it('calls firebase setUserId with provided uid', () => {
      setAnalyticsUserId('uid-123');
      expect(mockSetUserId).toHaveBeenCalledWith('uid-123');
    });

    it('clears user id when called with null', () => {
      setAnalyticsUserId(null);
      expect(mockSetUserId).toHaveBeenCalledWith(null);
    });
  });

  describe('logScreenView', () => {
    it('calls firebase logScreenView with screen name as both class and name', () => {
      logScreenView('mock_exam_intro');
      expect(mockLogScreenView).toHaveBeenCalledWith({
        screen_name: 'mock_exam_intro',
        screen_class: 'mock_exam_intro',
      });
    });
  });
});

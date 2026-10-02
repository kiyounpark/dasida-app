import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import ConsentScreen from '../screens/consent-screen';

// (jest.mock 팩토리는 `mock` 접두 변수만 참조 가능)
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockLogEvent = jest.fn();
jest.mock('@/features/analytics/log-event', () => ({
  logEvent: (...args: unknown[]) => mockLogEvent(...args),
}));

const mockSignOut = jest.fn();
const mockDeleteAccount = jest.fn();
jest.mock('@/features/learner/provider', () => ({
  useCurrentLearner: () => ({ signOut: mockSignOut, deleteAccount: mockDeleteAccount }),
}));

const mockSubmit = jest.fn();
jest.mock('../consent-provider', () => ({
  useConsentGate: () => ({ status: 'needed', submit: mockSubmit }),
}));

/**
 * 동의 화면 (1.0.11 1줄). 시뮬레이터 대신 여기서 잠그는 것:
 * 문구·줄 순서 · 필수 하나 빠지면 [다음] 잠김 · 누른 방식(via)이 저장과 GA에 같이 · 계정 관리 출구.
 */

const ROW_TEXTS = [
  '[필수] 사진을 분석하려고 다시다 서버·OpenAI(미국)로 보내',
  '[필수] 내 노트, 계정에 저장 — 다른 폰·아이패드에서도 보여',
  '[선택] 내 사진으로 분석 정확도 높이기 (30일 뒤 삭제)',
];

function nextButton() {
  return screen.getByRole('button', { name: '다음' });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSubmit.mockResolvedValue(undefined);
  mockSignOut.mockResolvedValue(undefined);
  mockDeleteAccount.mockResolvedValue(undefined);
});

it('문구가 초안 그대로, 약속 파일 순서(전송·보관·검토)로 뜬다', () => {
  render(<ConsentScreen />);

  expect(screen.getByText('전체 동의')).toBeTruthy();
  const rows = screen.getAllByRole('checkbox').map((node) => node.props.accessibilityLabel);
  expect(rows).toEqual(['전체 동의', ...ROW_TEXTS]);
  // 10.02 확정 — "(30일 뒤 지워)"가 아니라 "(30일 뒤 삭제)"
  expect(screen.getByText(ROW_TEXTS[2])).toBeTruthy();
  expect(screen.getByText('계정 관리 >')).toBeTruthy();
});

it('화면이 뜨면 consent_view를 한 번 남긴다', () => {
  render(<ConsentScreen />);

  expect(mockLogEvent).toHaveBeenCalledTimes(1);
  expect(mockLogEvent).toHaveBeenCalledWith('consent_view', {});
});

it('필수 하나라도 빠지면 [다음]이 안 눌린다', () => {
  render(<ConsentScreen />);
  expect(nextButton()).toBeDisabled();

  fireEvent.press(screen.getByLabelText(ROW_TEXTS[0]));
  fireEvent.press(screen.getByLabelText(ROW_TEXTS[2]));
  expect(nextButton()).toBeDisabled();

  fireEvent.press(nextButton());
  expect(mockSubmit).not.toHaveBeenCalled();

  fireEvent.press(screen.getByLabelText(ROW_TEXTS[1]));
  expect(nextButton()).toBeEnabled();
});

it('[전체 동의]로 넘기면 via=all — 저장과 GA가 같은 값, 그다음 홈', async () => {
  render(<ConsentScreen />);

  fireEvent.press(screen.getByLabelText('전체 동의'));
  await act(async () => {
    fireEvent.press(nextButton());
  });

  expect(mockSubmit).toHaveBeenCalledWith({ analysis: true, store: true, review: true }, 'all');
  expect(mockLogEvent).toHaveBeenCalledWith('consent_submit', { review: true, via: 'all' });
  expect(mockReplace).toHaveBeenCalledWith('/(tabs)/quiz');
});

it('하나씩 골라 넘기면 via=individual, 선택을 안 켰으면 review=false', async () => {
  render(<ConsentScreen />);

  fireEvent.press(screen.getByLabelText(ROW_TEXTS[0]));
  fireEvent.press(screen.getByLabelText(ROW_TEXTS[1]));
  await act(async () => {
    fireEvent.press(nextButton());
  });

  expect(mockSubmit).toHaveBeenCalledWith({ analysis: true, store: true, review: false }, 'individual');
  expect(mockLogEvent).toHaveBeenCalledWith('consent_submit', { review: false, via: 'individual' });
});

it('전체 동의 뒤 선택을 끄고 넘기면 via=individual', async () => {
  render(<ConsentScreen />);

  fireEvent.press(screen.getByLabelText('전체 동의'));
  fireEvent.press(screen.getByLabelText(ROW_TEXTS[2]));
  await act(async () => {
    fireEvent.press(nextButton());
  });

  expect(mockSubmit).toHaveBeenCalledWith({ analysis: true, store: true, review: false }, 'individual');
});

it('서버 저장이 실패하면 넘어가지 않고 오류 줄을 띄운다 — consent_submit도 안 남긴다', async () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockSubmit.mockRejectedValue(new Error('Network request failed'));
  render(<ConsentScreen />);

  fireEvent.press(screen.getByLabelText('전체 동의'));
  await act(async () => {
    fireEvent.press(nextButton());
  });

  expect(screen.getByText('저장 못 했어. 인터넷 연결 확인하고 다시 눌러줘')).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
  expect(mockLogEvent).not.toHaveBeenCalledWith('consent_submit', expect.anything());
  // 다시 누를 수 있다
  expect(nextButton()).toBeEnabled();
});

describe('계정 관리 >', () => {
  type AlertButton = { text: string; onPress?: () => void };

  function pressAlertButton(callIndex: number, text: string) {
    const buttons = (Alert.alert as jest.Mock).mock.calls[callIndex][2] as AlertButton[];
    buttons.find((button) => button.text === text)?.onPress?.();
  }

  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('로그아웃 — provider의 signOut을 부른다(로그인 화면으로는 _layout 문이 보낸다)', async () => {
    render(<ConsentScreen />);

    fireEvent.press(screen.getByText('계정 관리 >'));
    expect((Alert.alert as jest.Mock).mock.calls[0][0]).toBe('계정 관리');
    await act(async () => {
      pressAlertButton(0, '로그아웃');
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('계정 삭제 — 프로필과 같은 확인을 한 번 더 받고, 탈퇴하면 로그인 화면으로', async () => {
    render(<ConsentScreen />);

    fireEvent.press(screen.getByText('계정 관리 >'));
    pressAlertButton(0, '계정 삭제');
    expect((Alert.alert as jest.Mock).mock.calls[1][0]).toBe('정말 계정을 삭제할까?');
    expect(mockDeleteAccount).not.toHaveBeenCalled();

    await act(async () => {
      pressAlertButton(1, '삭제');
    });

    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/sign-in');
  });

  it('탈퇴가 실패하면 화면에 이유를 보여주고 머문다', async () => {
    mockDeleteAccount.mockRejectedValue(new Error('네트워크 오류'));
    render(<ConsentScreen />);

    fireEvent.press(screen.getByText('계정 관리 >'));
    pressAlertButton(0, '계정 삭제');
    await act(async () => {
      pressAlertButton(1, '삭제');
    });

    expect(screen.getByText('탈퇴에 실패했습니다. 네트워크 오류')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ConsentProvider, useConsentGate } from '../consent-provider';
import { decideConsentGate, submitConsent } from '../consent-sync';

jest.mock('expo-constants', () => ({ expoConfig: { version: '1.0.11' } }));

const mockLearner = { current: {} as Record<string, unknown> };
jest.mock('@/features/learner/provider', () => ({
  useCurrentLearner: () => mockLearner.current,
}));

jest.mock('../consent-sync', () => ({
  decideConsentGate: jest.fn(),
  submitConsent: jest.fn(),
}));

/**
 * 지금 계정의 동의 상태 (1.0.11 1줄). 로그인 계정만 묻고, 계정이 바뀐 첫 렌더에선
 * 옛 계정 판정을 쓰지 않는다 — 문이 엉뚱한 화면으로 먼저 보내지 않게.
 */

const getRemoteAuthHeaders = jest.fn();
const wrapper = ({ children }: { children: ReactNode }) => <ConsentProvider>{children}</ConsentProvider>;

function signedIn(accountKey: string) {
  return {
    authGateState: 'authenticated',
    session: { status: 'authenticated', accountKey },
    getRemoteAuthHeaders,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

it('로그인 계정이 아니면(개발용 게스트·로그아웃) 묻지 않는다', () => {
  mockLearner.current = {
    authGateState: 'guest-dev',
    session: { status: 'anonymous', accountKey: 'anon:1' },
    getRemoteAuthHeaders,
  };

  const { result } = renderHook(() => useConsentGate(), { wrapper });

  expect(result.current.status).toBe('not-required');
  expect(decideConsentGate).not.toHaveBeenCalled();
});

it('로그인 계정은 판정이 나올 때까지 checking, 나오면 그 값', async () => {
  mockLearner.current = signedIn('user:abc');
  (decideConsentGate as jest.Mock).mockResolvedValue('needed');

  const { result } = renderHook(() => useConsentGate(), { wrapper });

  expect(result.current.status).toBe('checking');
  await waitFor(() => expect(result.current.status).toBe('needed'));
  expect((decideConsentGate as jest.Mock).mock.calls[0][0]).toBe('user:abc');
});

it('계정이 바뀐 첫 렌더는 옛 계정의 ok를 쓰지 않고 checking', async () => {
  mockLearner.current = signedIn('user:abc');
  (decideConsentGate as jest.Mock).mockResolvedValue('ok');
  const { result, rerender } = renderHook(() => useConsentGate(), { wrapper });
  await waitFor(() => expect(result.current.status).toBe('ok'));

  (decideConsentGate as jest.Mock).mockReturnValue(new Promise(() => {}));
  mockLearner.current = signedIn('user:other');
  rerender({});

  expect(result.current.status).toBe('checking');
});

it('[다음]이 서버에서 실패하면 던지고 상태는 needed 그대로', async () => {
  mockLearner.current = signedIn('user:abc');
  (decideConsentGate as jest.Mock).mockResolvedValue('needed');
  (submitConsent as jest.Mock).mockRejectedValue(new Error('Network request failed'));
  const { result } = renderHook(() => useConsentGate(), { wrapper });
  await waitFor(() => expect(result.current.status).toBe('needed'));

  await act(async () => {
    await expect(
      result.current.submit({ analysis: true, store: true, review: false }, 'individual'),
    ).rejects.toThrow('Network request failed');
  });

  expect(result.current.status).toBe('needed');
});

it('[다음] 뒤엔 넘긴 문서로 상태를 바꾼다(필수 둘 켜짐 → ok)', async () => {
  mockLearner.current = signedIn('user:abc');
  (decideConsentGate as jest.Mock).mockResolvedValue('needed');
  (submitConsent as jest.Mock).mockResolvedValue({
    schemaVersion: 1,
    accountKey: 'user:abc',
    analysis: { version: 1, agreedAt: '2026-10-10T00:00:00.000Z', revokedAt: null },
    store: { version: 1, agreedAt: '2026-10-10T00:00:00.000Z', revokedAt: null },
    review: { version: 1, agreedAt: null, revokedAt: null },
    via: 'individual',
    updatedAt: '2026-10-10T00:00:00.000Z',
    appVersion: '1.0.11',
  });
  const { result } = renderHook(() => useConsentGate(), { wrapper });
  await waitFor(() => expect(result.current.status).toBe('needed'));

  await act(async () => {
    await result.current.submit({ analysis: true, store: true, review: false }, 'individual');
  });

  expect(submitConsent).toHaveBeenCalledWith(
    expect.objectContaining({
      accountKey: 'user:abc',
      decisions: { analysis: true, store: true, review: false },
      via: 'individual',
      appVersion: '1.0.11',
    }),
  );
  expect(result.current.status).toBe('ok');
});

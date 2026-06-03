import { act, renderHook } from '@testing-library/react-native';

// 회귀 방지(#1 신규 가입자 온보딩 우회): 로그인 핸들러가 무조건 (tabs)로
// router.replace 하던 버그가 되살아나면 이 테스트가 깨진다. 라우팅은
// app/_layout.tsx의 AuthGateRedirector가 grade/nickname 기준으로 담당해야 한다.
// (jest.mock 팩토리는 `mock` 접두 변수만 참조 가능 → 이름에 mock 접두 사용)
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));

// auth-client 전체 로딩(firebase 의존) 회피 — catch 분기용 에러 클래스만 제공.
jest.mock('@/features/auth/auth-client', () => ({
  AuthFlowCancelledError: class AuthFlowCancelledError extends Error {},
}));

const mockSignIn = jest.fn();
const mockContinueAsDevGuest = jest.fn();
jest.mock('@/features/learner/provider', () => ({
  useCurrentLearner: () => ({
    authBlockingReason: null,
    availableAuthProviders: ['google', 'apple'],
    canUseDevGuestAuth: true,
    continueAsDevGuest: mockContinueAsDevGuest,
    signIn: mockSignIn,
  }),
}));

import { useSignInScreen } from '../use-sign-in-screen';

describe('useSignInScreen — 로그인 후 라우팅', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignIn.mockResolvedValue(undefined);
    mockContinueAsDevGuest.mockResolvedValue(undefined);
  });

  it('소셜 로그인 성공 시 (tabs)/quiz로 직접 이동하지 않는다 (온보딩 가드 우회 방지)', async () => {
    const { result } = renderHook(() => useSignInScreen());

    await act(async () => {
      await result.current.onSignIn('google');
    });

    expect(mockSignIn).toHaveBeenCalledWith('google');
    expect(mockReplace).not.toHaveBeenCalledWith('/(tabs)/quiz');
  });

  it('dev-guest 로그인 성공 시에도 (tabs)/quiz로 직접 이동하지 않는다', async () => {
    const { result } = renderHook(() => useSignInScreen());

    await act(async () => {
      await result.current.onContinueAsDevGuest();
    });

    expect(mockContinueAsDevGuest).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalledWith('/(tabs)/quiz');
  });
});

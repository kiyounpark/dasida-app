import { render } from '@testing-library/react-native';

import { useConsentGate } from '@/features/consent/consent-provider';
import { useCurrentLearner } from '@/features/learner/provider';

import IndexRoute from '@/app/index';

const mockRedirect = jest.fn((_props: { href: string }) => null);
jest.mock('expo-router', () => ({
  Redirect: (props: { href: string }) => mockRedirect(props),
}));
jest.mock('@/features/learner/provider', () => ({ useCurrentLearner: jest.fn() }));
jest.mock('@/features/consent/consent-provider', () => ({ useConsentGate: jest.fn() }));

/**
 * 콜드 스타트 문 app/index.tsx (1.0.11 1줄) — 기존 가입자도 다음 실행 때 동의 화면을 본다.
 * 규칙 자체는 consent-route.test.ts. 여기선 index가 그 규칙을 쓰는지만.
 * (app/ 안에 두면 expo-router 경로 목록에 테스트 파일까지 잡힌다 — .expo/types에 /__tests__/photo-route.test가 있다)
 */
describe('콜드 스타트 문', () => {
  const learner = { authGateState: 'authenticated', isReady: true, profile: { nickname: '학생', grade: 'g2' } };

  beforeEach(() => {
    jest.clearAllMocks();
    (useCurrentLearner as jest.Mock).mockReturnValue(learner);
  });

  it('기존 가입자 + 동의 없음 → 동의 화면으로', () => {
    (useConsentGate as jest.Mock).mockReturnValue({ status: 'needed' });

    render(<IndexRoute />);

    expect(mockRedirect).toHaveBeenCalledWith({ href: '/consent' });
  });

  it('동의를 아직 모르면 아무 데도 안 보내고 빈 화면', () => {
    (useConsentGate as jest.Mock).mockReturnValue({ status: 'checking' });

    render(<IndexRoute />);

    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('동의 끝났으면 홈', () => {
    (useConsentGate as jest.Mock).mockReturnValue({ status: 'ok' });

    render(<IndexRoute />);

    expect(mockRedirect).toHaveBeenCalledWith({ href: '/(tabs)/quiz' });
  });
});

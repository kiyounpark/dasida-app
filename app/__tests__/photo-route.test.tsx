import { render } from '@testing-library/react-native';

import { useCurrentLearner } from '@/features/learner/provider';
import { PhotoFlowScreen } from '@/features/photo/screens/photo-flow-screen';

import PhotoRoute from '../photo';

jest.mock('@/features/learner/provider', () => ({ useCurrentLearner: jest.fn() }));
jest.mock('@/features/photo/screens/photo-flow-screen', () => ({
  PhotoFlowScreen: jest.fn(() => null),
}));

/**
 * 학생용 사진 주소(app/photo.tsx)를 잠근다.
 *
 * 왜 필요한가: 이 주소는 08.26에 새로 냈고, 학생이 사진 오답노트에 닿는 유일한 문이다.
 * 개발자 주소(app/dev/photo-flow.tsx)는 출시 빌드에서 홈으로 되돌려보내므로 대체가 안 된다.
 * 파일이 지워지거나 다른 화면을 가리키게 되면 학생은 문 없는 기능을 갖게 되는데,
 * 그건 앱을 실제로 돌려보기 전에는 안 보인다.
 *
 * 09.15에 "그대로 내보낸다"에서 "감싸서 계정 키를 내려준다"로 바뀌었다.
 * 노트를 계정별로 남기려면 키가 필요한데, 화면·훅이 직접 집으면
 * 프로바이더 없이 그리는 화면 테스트 21개가 전부 죽는다 — 그래서 주소가 집어 내려준다.
 */
describe('학생용 사진 주소', () => {
  const mockUseCurrentLearner = useCurrentLearner as jest.Mock;
  const mockScreen = PhotoFlowScreen as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('사진 오답노트 화면을 가리킨다', () => {
    mockUseCurrentLearner.mockReturnValue({ session: null });

    render(<PhotoRoute />);

    expect(mockScreen).toHaveBeenCalledTimes(1);
  });

  it('로그인·게스트 상관없이 지금 세션의 계정 키를 내려준다', () => {
    mockUseCurrentLearner.mockReturnValue({ session: { accountKey: 'user:abc' } });

    render(<PhotoRoute />);

    expect(mockScreen.mock.calls[0][0]).toEqual({ accountKey: 'user:abc' });
  });

  it('복습 과제 저장소도 내려준다 — 없으면 사진 노트가 복습 과제가 못 된다 (E칸)', () => {
    const reviewTaskStore = { load: jest.fn(), saveAll: jest.fn(), reset: jest.fn() };
    mockUseCurrentLearner.mockReturnValue({ session: { accountKey: 'user:abc' }, reviewTaskStore });

    render(<PhotoRoute />);

    expect(mockScreen.mock.calls[0][0]).toEqual({ accountKey: 'user:abc', reviewTaskStore });
  });

  it('계정 헤더 만드는 함수도 내려준다 — 없으면 사진 분석 사용량을 계정별로 못 센다', () => {
    const getRemoteAuthHeaders = jest.fn();
    mockUseCurrentLearner.mockReturnValue({ session: { accountKey: 'user:abc' }, getRemoteAuthHeaders });

    render(<PhotoRoute />);

    expect(mockScreen.mock.calls[0][0]).toEqual({ accountKey: 'user:abc', getRemoteAuthHeaders });
  });

  it('세션이 아직 없으면 키 없이 그린다 — 노트만 안 남고 흐름은 돈다', () => {
    mockUseCurrentLearner.mockReturnValue({ session: null });

    render(<PhotoRoute />);

    expect(mockScreen.mock.calls[0][0]).toEqual({ accountKey: null });
  });
});

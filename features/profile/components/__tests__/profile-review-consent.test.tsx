import { fireEvent, render, screen } from '@testing-library/react-native';

import type { UseProfileScreenResult } from '@/features/profile/hooks/use-profile-screen';

import { ProfileScreenView } from '../profile-screen-view';

// 설정의 [선택] 검토 동의 스위치 (🔒 10.02 기윤 — 끄면 서버가 검토본을 바로 지운다)

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));

// 로고 SVG는 jest에서 못 그린다 — 이 테스트의 관심사가 아니다
jest.mock('@/components/brand/BrandHeader', () => ({ BrandHeader: () => null }));

// photo-flow-screen.test.tsx와 같은 대체품 — ScrollView 내부가 NativeEventEmitter를 부른다
jest.mock('react-native/Libraries/Components/ScrollView/ScrollView', () => {
  const React = require('react');
  const RN = jest.requireActual('react-native');
  const MockScrollView = React.forwardRef(({ children, contentContainerStyle: _c, ...props }: any, _ref: any) =>
    React.createElement(RN.View, props, children),
  );
  MockScrollView.displayName = 'ScrollView';
  return { __esModule: true, default: MockScrollView };
});

function props(overrides: Partial<UseProfileScreenResult> = {}): UseProfileScreenResult {
  return {
    busyAction: null,
    errorMessage: null,
    gradeOptions: [
      { value: 'g1', label: '고1' },
      { value: 'g2', label: '고2' },
      { value: 'g3', label: '고3' },
    ],
    manualImportCandidate: null,
    noticeMessage: null,
    profile: null,
    session: { status: 'authenticated', accountKey: 'user:abc', provider: 'google', email: 'a@b.c' },
    onDeleteAccount: jest.fn(),
    onImportLocalHistory: jest.fn(),
    onSignOut: jest.fn(),
    onUpdateGradeAndTrack: jest.fn(),
    reviewConsent: true,
    onToggleReviewConsent: jest.fn(),
    ...overrides,
  } as unknown as UseProfileScreenResult;
}

it('로그인 계정이면 계정 관리에 [선택] 스위치가 지금 상태로 뜬다', () => {
  render(<ProfileScreenView {...props({ reviewConsent: true })} />);

  expect(screen.getByText('[선택] 내 사진으로 분석 정확도 높이기')).toBeTruthy();
  expect(screen.getByLabelText('내 사진으로 분석 정확도 높이기').props.value).toBe(true);
});

it('끄면 onToggleReviewConsent(false)', () => {
  const onToggleReviewConsent = jest.fn();
  render(<ProfileScreenView {...props({ reviewConsent: true, onToggleReviewConsent })} />);

  fireEvent(screen.getByLabelText('내 사진으로 분석 정확도 높이기'), 'valueChange', false);

  expect(onToggleReviewConsent).toHaveBeenCalledWith(false);
});

it('동의 상태를 아직 모르면(null) 스위치를 안 그린다 — 거짓 상태를 보이지 않는다', () => {
  render(<ProfileScreenView {...props({ reviewConsent: null })} />);

  expect(screen.queryByText('[선택] 내 사진으로 분석 정확도 높이기')).toBeNull();
});

it('다른 동작 중이면 스위치를 막는다', () => {
  render(<ProfileScreenView {...props({ busyAction: 'review-consent' })} />);

  expect(screen.getByLabelText('내 사진으로 분석 정확도 높이기').props.disabled).toBe(true);
});

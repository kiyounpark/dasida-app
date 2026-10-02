import type { LearnerProfile } from '@/features/learner/types';

import { resolveEntryRoute, shouldRedirectToConsent } from '../consent-route';

/**
 * 동의 화면으로 보내는 문 둘 (1.0.11 1줄) — app/index.tsx(콜드 스타트)와 app/_layout.tsx.
 * "기존 가입자도 다음 실행 때 같은 화면"을 여기서 잠근다.
 */

const DONE_PROFILE = { nickname: '학생', grade: 'g3' } as LearnerProfile;
const NEW_PROFILE = { nickname: '', grade: 'unknown' } as LearnerProfile;

describe('콜드 스타트 — resolveEntryRoute', () => {
  const base = { isReady: true, authGateState: 'authenticated' as const, profile: DONE_PROFILE };

  it('기존 가입자(프로필 있음) + 동의 없음 → 동의 화면', () => {
    expect(resolveEntryRoute({ ...base, consentStatus: 'needed' })).toBe('/consent');
  });

  it('동의를 아직 모르면 기다린다(빈 화면) — 홈을 먼저 보여주지 않는다', () => {
    expect(resolveEntryRoute({ ...base, consentStatus: 'checking' })).toBeNull();
  });

  it('동의 끝났으면 홈', () => {
    expect(resolveEntryRoute({ ...base, consentStatus: 'ok' })).toBe('/(tabs)/quiz');
  });

  it('새 가입자는 온보딩이 먼저 — 동의는 그다음', () => {
    expect(resolveEntryRoute({ ...base, profile: NEW_PROFILE, consentStatus: 'needed' })).toBe('/onboarding');
  });

  it('로그인 전이면 로그인, 개발용 게스트는 동의 없이 홈', () => {
    expect(
      resolveEntryRoute({ ...base, authGateState: 'required', profile: null, consentStatus: 'not-required' }),
    ).toBe('/sign-in');
    expect(
      resolveEntryRoute({ ...base, authGateState: 'guest-dev', consentStatus: 'not-required' }),
    ).toBe('/(tabs)/quiz');
  });

  it('인증 확인 중이면 아무 데도 안 보낸다', () => {
    expect(resolveEntryRoute({ ...base, isReady: false, consentStatus: 'checking' })).toBeNull();
    expect(resolveEntryRoute({ ...base, authGateState: 'loading', consentStatus: 'checking' })).toBeNull();
  });
});

describe('그 밖의 화면 — shouldRedirectToConsent', () => {
  const base = {
    authGateState: 'authenticated' as const,
    profile: DONE_PROFILE,
    consentStatus: 'needed' as const,
  };

  it('홈·사진·알림으로 연 화면에서도 동의가 필요하면 보낸다(온보딩 직후 포함)', () => {
    expect(shouldRedirectToConsent({ ...base, rootSegment: '(tabs)' })).toBe(true);
    expect(shouldRedirectToConsent({ ...base, rootSegment: 'photo' })).toBe(true);
    expect(shouldRedirectToConsent({ ...base, rootSegment: 'quiz' })).toBe(true);
  });

  it('동의·로그인·온보딩 화면 자신과 index는 건드리지 않는다', () => {
    for (const rootSegment of ['consent', 'sign-in', 'onboarding', undefined]) {
      expect(shouldRedirectToConsent({ ...base, rootSegment })).toBe(false);
    }
  });

  it('동의 끝남·확인 중·게스트·프로필 미완이면 안 보낸다', () => {
    expect(shouldRedirectToConsent({ ...base, consentStatus: 'ok', rootSegment: '(tabs)' })).toBe(false);
    expect(shouldRedirectToConsent({ ...base, consentStatus: 'checking', rootSegment: '(tabs)' })).toBe(false);
    expect(shouldRedirectToConsent({ ...base, authGateState: 'guest-dev', rootSegment: '(tabs)' })).toBe(false);
    expect(shouldRedirectToConsent({ ...base, profile: NEW_PROFILE, rootSegment: '(tabs)' })).toBe(false);
  });
});

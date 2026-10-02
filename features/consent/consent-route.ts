import type { AuthGateState } from '@/features/auth/auth-policy';
import type { LearnerProfile } from '@/features/learner/types';

/**
 * 동의 화면으로 보내는 문 — 순수 계산 (1.0.11 1줄).
 * 문은 둘이다: 콜드 스타트 app/index.tsx(resolveEntryRoute)와 app/_layout.tsx의 AuthGateRedirector
 * (로그인 직후는 resolveEntryRoute, 그 밖의 화면은 shouldRedirectToConsent).
 *
 * 'not-required' = 로그인 계정이 아님(개발용 게스트). 서버 동의는 firebase 계정만 받는다.
 * 'checking'     = 이 계정의 동의를 아직 모른다 — 문은 기다린다(엉뚱한 화면으로 먼저 보내지 않는다).
 */
export type ConsentGateStatus = 'not-required' | 'checking' | 'needed' | 'ok';

export type EntryRoute = '/sign-in' | '/onboarding' | '/consent' | '/(tabs)/quiz';

function isProfileIncomplete(profile: LearnerProfile | null) {
  return profile?.grade === 'unknown' || !profile?.nickname;
}

/** null = 아직 모른다(빈 화면으로 기다린다) */
export function resolveEntryRoute(input: {
  isReady: boolean;
  authGateState: AuthGateState;
  profile: LearnerProfile | null;
  consentStatus: ConsentGateStatus;
}): EntryRoute | null {
  if (!input.isReady || input.authGateState === 'loading') return null;
  if (input.authGateState === 'required') return '/sign-in';
  if (isProfileIncomplete(input.profile)) return '/onboarding';
  if (input.consentStatus === 'checking') return null;
  if (input.consentStatus === 'needed') return '/consent';
  return '/(tabs)/quiz';
}

/** 로그인·온보딩·동의 화면 자신은 건드리지 않는다. 첫 칸이 없으면(index) index가 스스로 보낸다 */
const CONSENT_GATE_EXEMPT_SEGMENTS: ReadonlySet<string> = new Set(['sign-in', 'onboarding', 'consent']);

/** 홈·사진·알림으로 연 화면 등 — 동의가 필요하면 어디서든 동의 화면으로 */
export function shouldRedirectToConsent(input: {
  authGateState: AuthGateState;
  profile: LearnerProfile | null;
  consentStatus: ConsentGateStatus;
  rootSegment: string | undefined;
}): boolean {
  if (input.authGateState !== 'authenticated') return false;
  if (input.consentStatus !== 'needed') return false;
  if (isProfileIncomplete(input.profile)) return false;
  if (!input.rootSegment || CONSENT_GATE_EXEMPT_SEGMENTS.has(input.rootSegment)) return false;
  return true;
}

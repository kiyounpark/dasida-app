import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { logEvent } from '@/features/analytics/log-event';
import { useCurrentLearner } from '@/features/learner/provider';
import {
  CONSENT_GA_EVENTS,
  CONSENT_KINDS,
  CONSENT_REQUIRED,
  type ConsentKind,
} from '@/functions/src/photo-store-contract';

import {
  canSubmitConsent,
  initialConsentChoice,
  isAllChecked,
  toggleAllConsent,
  toggleConsentKind,
} from '../consent-choice';
import { CONSENT_COPY } from '../consent-copy';
import { useConsentGate } from '../consent-provider';

export type ConsentRow = {
  kind: ConsentKind;
  tag: string;
  label: string;
  checked: boolean;
};

export type UseConsentScreenResult = ReturnType<typeof useConsentScreen>;

function formatErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return CONSENT_COPY.genericError;
}

export function useConsentScreen() {
  const { signOut, deleteAccount } = useCurrentLearner();
  const { submit } = useConsentGate();
  const [choice, setChoice] = useState(initialConsentChoice);
  const [busyAction, setBusyAction] = useState<'submit' | 'sign-out' | 'delete-account' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    logEvent(CONSENT_GA_EVENTS.view, {});
  }, []);

  // 줄 순서·꼬리표는 약속 파일이 정한다 — 숫자로 박지 않는다
  const rows: ConsentRow[] = CONSENT_KINDS.map((kind) => ({
    kind,
    tag: CONSENT_REQUIRED[kind] ? CONSENT_COPY.requiredTag : CONSENT_COPY.optionalTag,
    label: CONSENT_COPY.kinds[kind],
    checked: choice.decisions[kind],
  }));

  const canSubmit = canSubmitConsent(choice.decisions) && busyAction === null;

  async function onSubmit() {
    if (!canSubmit) return;
    setBusyAction('submit');
    setErrorMessage(null);

    try {
      // 서버가 저장했다고 답해야 넘어간다(기기 사본은 서버 응답으로만 — 🔒 10.02 줄 0 리뷰)
      await submit(choice.decisions, choice.via);
      logEvent(CONSENT_GA_EVENTS.submit, { review: choice.decisions.review, via: choice.via });
      router.replace('/(tabs)/quiz');
    } catch (error) {
      console.warn('[consent] 저장 실패 — 화면에 머문다', error);
      setErrorMessage(CONSENT_COPY.saveFailed);
    } finally {
      setBusyAction(null);
    }
  }

  async function onSignOut() {
    if (busyAction) return;
    setBusyAction('sign-out');
    setErrorMessage(null);

    try {
      // 로그인 화면으로는 _layout의 문이 보낸다(로그아웃 = 인증 필요 상태)
      await signOut();
    } catch (error) {
      setErrorMessage(formatErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function onDeleteAccount() {
    if (busyAction) return;
    setBusyAction('delete-account');
    setErrorMessage(null);

    try {
      await deleteAccount();
      router.replace('/sign-in');
    } catch (error) {
      setErrorMessage(`${CONSENT_COPY.deleteFailedPrefix} ${formatErrorMessage(error)}`);
    } finally {
      setBusyAction(null);
    }
  }

  return {
    allChecked: isAllChecked(choice.decisions),
    rows,
    canSubmit,
    busyAction,
    errorMessage,
    onToggleAll: () => setChoice(toggleAllConsent),
    onToggle: (kind: ConsentKind) => setChoice((prev) => toggleConsentKind(prev, kind)),
    onSubmit,
    onSignOut,
    onDeleteAccount,
  };
}

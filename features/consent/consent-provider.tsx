import Constants from 'expo-constants';
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useCurrentLearner } from '@/features/learner/provider';
import {
  needsConsentScreen,
  type ConsentDecisions,
  type ConsentVia,
} from '@/functions/src/photo-store-contract';

import { createConsentRemote } from './consent-api';
import type { ConsentGateStatus } from './consent-route';
import { decideConsentGate, submitConsent } from './consent-sync';

/**
 * 지금 계정이 사진 동의 화면을 봐야 하나 (1.0.11 1줄). app/_layout.tsx가 CurrentLearnerProvider 안에 건다.
 * 로그인 계정이 바뀌면 다시 정한다. 정하는 규칙은 consent-sync.ts.
 */
export type ConsentGateValue = {
  status: ConsentGateStatus;
  /** 동의 화면의 [다음]. 서버가 저장해야 'ok'가 된다 — 실패·타임아웃이면 던진다(화면에 머문다) */
  submit(decisions: ConsentDecisions, via: ConsentVia): Promise<void>;
};

const ConsentGateContext = createContext<ConsentGateValue | undefined>(undefined);

type GateState = { accountKey: string | null; status: ConsentGateStatus };

export function ConsentProvider({ children }: { children: ReactNode }) {
  const { authGateState, session, getRemoteAuthHeaders } = useCurrentLearner();
  const accountKey =
    authGateState === 'authenticated' && session?.status === 'authenticated' ? session.accountKey : null;
  const [state, setState] = useState<GateState>({ accountKey: null, status: 'not-required' });

  const remote = useMemo(() => createConsentRemote(getRemoteAuthHeaders), [getRemoteAuthHeaders]);

  useEffect(() => {
    if (!accountKey) {
      setState({ accountKey: null, status: 'not-required' });
      return;
    }

    let active = true;
    void decideConsentGate(accountKey, remote).then((decision) => {
      if (active) setState({ accountKey, status: decision });
    });
    return () => {
      active = false;
    };
  }, [accountKey, remote]);

  const submit = useCallback(
    async (decisions: ConsentDecisions, via: ConsentVia) => {
      if (!accountKey) return;
      const doc = await submitConsent({
        accountKey,
        decisions,
        via,
        appVersion: Constants.expoConfig?.version ?? null,
        remote,
      });
      setState({ accountKey, status: needsConsentScreen(doc) ? 'needed' : 'ok' });
    },
    [accountKey, remote],
  );

  // 계정이 막 바뀐 렌더에선 옛 상태가 남아 있다 — 새 계정 판정이 나올 때까지 'checking'
  const status: ConsentGateStatus = !accountKey
    ? 'not-required'
    : state.accountKey === accountKey
      ? state.status
      : 'checking';

  const value = useMemo<ConsentGateValue>(() => ({ status, submit }), [status, submit]);

  return <ConsentGateContext.Provider value={value}>{children}</ConsentGateContext.Provider>;
}

export function useConsentGate(): ConsentGateValue {
  const context = use(ConsentGateContext);
  if (!context) {
    throw new Error('useConsentGate must be used within ConsentProvider');
  }
  return context;
}

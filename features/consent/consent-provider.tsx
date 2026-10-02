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
  isConsentOn,
  needsConsentScreen,
  type ConsentDecisions,
  type ConsentDoc,
  type ConsentVia,
} from '@/functions/src/photo-store-contract';

import { createConsentRemote } from './consent-api';
import type { ConsentGateStatus } from './consent-route';
import { readLocalConsent } from './consent-store';
import { decideConsentGate, submitConsent } from './consent-sync';

/**
 * 지금 계정이 사진 동의 화면을 봐야 하나 (1.0.11 1줄). app/_layout.tsx가 CurrentLearnerProvider 안에 건다.
 * 로그인 계정이 바뀌면 다시 정한다. 정하는 규칙은 consent-sync.ts.
 */
export type ConsentGateValue = {
  status: ConsentGateStatus;
  /** 동의 화면의 [다음]. 서버가 저장해야 'ok'가 된다 — 실패·타임아웃이면 던진다(화면에 머문다) */
  submit(decisions: ConsentDecisions, via: ConsentVia): Promise<void>;
  /** [선택] 검토 동의가 지금 켜져 있나(기기 사본 = 서버 응답 기준). 아직 모르면 null — 설정 스위치를 안 그린다 */
  reviewOn: boolean | null;
  /**
   * 설정의 [선택] 스위치(🔒 10.02 기윤). 필수 두 칸·누른 방식(via)은 지금 문서 그대로 보내고 검토만 바꾼다 —
   * via는 동의 화면을 넘긴 방식이라 설정에서 덮지 않는다. 끄면 서버가 검토본을 바로 지운다.
   * 서버가 저장해야 바뀐다 — 실패·타임아웃이면 던진다(스위치는 그대로).
   */
  setReview(on: boolean): Promise<void>;
};

const ConsentGateContext = createContext<ConsentGateValue | undefined>(undefined);

type GateState = { accountKey: string | null; status: ConsentGateStatus; doc: ConsentDoc | null };

export function ConsentProvider({ children }: { children: ReactNode }) {
  const { authGateState, session, getRemoteAuthHeaders } = useCurrentLearner();
  const accountKey =
    authGateState === 'authenticated' && session?.status === 'authenticated' ? session.accountKey : null;
  const [state, setState] = useState<GateState>({ accountKey: null, status: 'not-required', doc: null });

  const remote = useMemo(() => createConsentRemote(getRemoteAuthHeaders), [getRemoteAuthHeaders]);

  useEffect(() => {
    if (!accountKey) {
      setState({ accountKey: null, status: 'not-required', doc: null });
      return;
    }

    let active = true;
    void decideConsentGate(accountKey, remote).then(async (decision) => {
      // 판정 뒤의 기기 사본(서버 응답으로만 쓰인 것)을 설정 스위치가 읽는다
      const doc = await readLocalConsent(accountKey).catch(() => null);
      if (active) setState({ accountKey, status: decision, doc });
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
      setState({ accountKey, status: needsConsentScreen(doc) ? 'needed' : 'ok', doc });
    },
    [accountKey, remote],
  );

  const currentDoc = state.accountKey === accountKey ? state.doc : null;

  const setReview = useCallback(
    async (on: boolean) => {
      if (!accountKey || !currentDoc) throw new Error('consent not loaded');
      const doc = await submitConsent({
        accountKey,
        decisions: {
          analysis: isConsentOn(currentDoc.analysis, 'analysis'),
          store: isConsentOn(currentDoc.store, 'store'),
          review: on,
        },
        via: currentDoc.via,
        appVersion: Constants.expoConfig?.version ?? null,
        remote,
      });
      setState({ accountKey, status: needsConsentScreen(doc) ? 'needed' : 'ok', doc });
    },
    [accountKey, currentDoc, remote],
  );

  // 계정이 막 바뀐 렌더에선 옛 상태가 남아 있다 — 새 계정 판정이 나올 때까지 'checking'
  const status: ConsentGateStatus = !accountKey
    ? 'not-required'
    : state.accountKey === accountKey
      ? state.status
      : 'checking';

  const reviewOn = currentDoc ? isConsentOn(currentDoc.review, 'review') : null;

  const value = useMemo<ConsentGateValue>(
    () => ({ status, submit, reviewOn, setReview }),
    [status, submit, reviewOn, setReview],
  );

  return <ConsentGateContext.Provider value={value}>{children}</ConsentGateContext.Provider>;
}

export function useConsentGate(): ConsentGateValue {
  const context = use(ConsentGateContext);
  if (!context) {
    throw new Error('useConsentGate must be used within ConsentProvider');
  }
  return context;
}

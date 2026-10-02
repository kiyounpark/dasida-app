import {
  CONSENT_KINDS,
  CONSENT_REQUIRED,
  type ConsentDecisions,
  type ConsentKind,
  type ConsentVia,
} from '@/functions/src/photo-store-contract';

/**
 * 동의 화면 체크 상태 — 순수 계산 (1.0.11 1줄).
 *
 * via(누른 방식, 🔒): [전체 동의]를 켜서 넘겼으면 'all', 하나씩 골라 넘겼으면 'individual'.
 * 전체 동의로 다 켠 뒤 한 칸이라도 손대면 그때부터 'individual'이다 —
 * 마지막에 어떻게 골랐나를 남긴다. 세 칸을 하나씩 다 켜서 [전체 동의]가 같이 켜져 보여도 'individual'.
 */
export type ConsentChoice = { decisions: ConsentDecisions; via: ConsentVia };

export function initialConsentChoice(): ConsentChoice {
  const decisions = {} as ConsentDecisions;
  for (const kind of CONSENT_KINDS) decisions[kind] = false;
  return { decisions, via: 'individual' };
}

export function isAllChecked(decisions: ConsentDecisions): boolean {
  return CONSENT_KINDS.every((kind) => decisions[kind]);
}

/** [다음] 잠금 — 필수 칸이 하나라도 꺼져 있으면 못 누른다 */
export function canSubmitConsent(decisions: ConsentDecisions): boolean {
  return CONSENT_KINDS.every((kind) => !CONSENT_REQUIRED[kind] || decisions[kind]);
}

export function toggleAllConsent(choice: ConsentChoice): ConsentChoice {
  const turnOn = !isAllChecked(choice.decisions);
  const decisions = {} as ConsentDecisions;
  for (const kind of CONSENT_KINDS) decisions[kind] = turnOn;
  return { decisions, via: turnOn ? 'all' : 'individual' };
}

export function toggleConsentKind(choice: ConsentChoice, kind: ConsentKind): ConsentChoice {
  return {
    decisions: { ...choice.decisions, [kind]: !choice.decisions[kind] },
    via: 'individual',
  };
}

import {
  canSubmitConsent,
  initialConsentChoice,
  isAllChecked,
  toggleAllConsent,
  toggleConsentKind,
} from '../consent-choice';

/**
 * 동의 화면 체크 규칙 (1.0.11 1줄).
 * [다음]은 필수 둘(analysis·store)이 다 켜져야 열린다 — 약속 파일 CONSENT_REQUIRED를 본다.
 * via는 "마지막에 어떻게 골랐나" — 서버 문서와 GA consent_submit이 같은 값을 쓴다(🔒).
 */
describe('동의 화면 체크 규칙', () => {
  it('처음엔 다 꺼져 있고 [다음]이 잠겨 있다', () => {
    const choice = initialConsentChoice();

    expect(choice.decisions).toEqual({ analysis: false, store: false, review: false });
    expect(canSubmitConsent(choice.decisions)).toBe(false);
  });

  it('필수 하나라도 빠지면 잠김, 필수 둘이면 열림 — 선택은 상관없다', () => {
    let choice = toggleConsentKind(initialConsentChoice(), 'analysis');
    expect(canSubmitConsent(choice.decisions)).toBe(false);

    choice = toggleConsentKind(choice, 'review');
    expect(canSubmitConsent(choice.decisions)).toBe(false);

    choice = toggleConsentKind(choice, 'store');
    expect(canSubmitConsent(choice.decisions)).toBe(true);

    choice = toggleConsentKind(choice, 'review');
    expect(canSubmitConsent(choice.decisions)).toBe(true);
  });

  it('[전체 동의]는 셋 다 켜고 via=all, 한 번 더 누르면 셋 다 끈다', () => {
    const on = toggleAllConsent(initialConsentChoice());
    expect(on).toEqual({ decisions: { analysis: true, store: true, review: true }, via: 'all' });
    expect(isAllChecked(on.decisions)).toBe(true);

    const off = toggleAllConsent(on);
    expect(off.decisions).toEqual({ analysis: false, store: false, review: false });
    expect(canSubmitConsent(off.decisions)).toBe(false);
  });

  it('전체 동의 뒤 선택 칸을 끄면 via=individual, [다음]은 그대로 열림', () => {
    const choice = toggleConsentKind(toggleAllConsent(initialConsentChoice()), 'review');

    expect(choice.via).toBe('individual');
    expect(choice.decisions).toEqual({ analysis: true, store: true, review: false });
    expect(isAllChecked(choice.decisions)).toBe(false);
    expect(canSubmitConsent(choice.decisions)).toBe(true);
  });

  it('하나씩 셋 다 켜면 [전체 동의]가 같이 켜져 보여도 via=individual', () => {
    let choice = initialConsentChoice();
    choice = toggleConsentKind(choice, 'analysis');
    choice = toggleConsentKind(choice, 'store');
    choice = toggleConsentKind(choice, 'review');

    expect(isAllChecked(choice.decisions)).toBe(true);
    expect(choice.via).toBe('individual');
  });
});

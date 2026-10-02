import {
  CONSENT_REQUIRED,
  canonicalNoteJson,
  isConsentOn,
  needsConsentScreen,
  notePhotoPath,
  safeNoteFileStem,
  type ConsentDoc,
  type PhotoNoteWire,
} from '@/functions/src/photo-store-contract';

import type { PhotoNote } from './types';

/**
 * 약속 파일(functions/src/photo-store-contract.ts) ↔ 앱 PhotoNote가 어긋나지 않게 잠근다 (1.0.11 줄 0).
 * 타입 칸은 jest(babel)가 안 본다 — `npm run typecheck`가 이 파일에서 빨간 줄을 낸다.
 */

type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/** 폰 전용 칸 셋을 뺀 앱 노트 = 서버로 가는 노트 */
type LocalWireShape = Omit<PhotoNote, 'photoUri' | 'submissionId' | 'cloudStoredAt'>;

// 칸 이름이 양쪽에서 같아야 한다 — 한쪽에만 칸을 더하면 여기서 tsc가 깨진다
const sameKeys: Equal<keyof LocalWireShape, keyof PhotoNoteWire> = true;
// 앱 노트가 그대로 서버 모양에 들어가야 한다(좁은 id 타입 → string)
const toWire = (note: LocalWireShape): PhotoNoteWire => note;

const NOTE: LocalWireShape = {
  id: 'photo-2026-09-15T12:34:56.789Z',
  createdAt: '2026-09-15T12:34:56.789Z',
  schemaVersion: 1,
  dateLabel: '9/15',
  quote: '−12×(−2)=−24',
  why: '음수끼리 곱했다',
  fix: '부호부터 정한다',
  methodLabel: '근의 공식',
  typeLabel: '계산 실수',
  methodId: 'cps',
  mistakeType: 'calc_slip',
  weaknessIds: [],
  primaryWeaknessId: null,
  checkPassed: true,
  retryResult: 'none',
};

function consentDoc(overrides: Partial<ConsentDoc> = {}): ConsentDoc {
  const on = { version: 1, agreedAt: '2026-10-10T00:00:00.000Z', revokedAt: null };
  return {
    schemaVersion: 1,
    accountKey: 'user:abc',
    analysis: on,
    store: on,
    review: { version: 1, agreedAt: null, revokedAt: null },
    via: 'all',
    updatedAt: '2026-10-10T00:00:00.000Z',
    appVersion: '1.0.11',
    ...overrides,
  };
}

describe('photo-store-contract', () => {
  it('앱 노트와 서버 노트의 칸이 같다', () => {
    expect(sameKeys).toBe(true);
    expect(toWire(NOTE).id).toBe(NOTE.id);
  });

  it('파일명 규칙은 폰 문서 폴더와 서버 경로가 같다', () => {
    expect(safeNoteFileStem(NOTE.id)).toBe('photo-2026-09-15T12-34-56-789Z');
    expect(notePhotoPath('user:abc', NOTE.id)).toBe(
      'photo-notes/user:abc/photo-2026-09-15T12-34-56-789Z.jpg',
    );
  });

  it('🔒 10.02 오후: 전송·보관 필수, 검토 선택', () => {
    expect(CONSENT_REQUIRED).toEqual({ analysis: true, store: true, review: false });
  });

  it('필수 둘이 켜져 있으면 동의 화면을 안 띄운다 — 검토를 안 했어도', () => {
    expect(needsConsentScreen(null)).toBe(true);
    expect(needsConsentScreen(consentDoc())).toBe(false);
    expect(
      needsConsentScreen(consentDoc({ store: { version: 1, agreedAt: null, revokedAt: null } })),
    ).toBe(true);
  });

  it('끈 시각이 켠 시각보다 뒤면 꺼진 것', () => {
    expect(
      isConsentOn(
        { version: 1, agreedAt: '2026-10-10T00:00:00.000Z', revokedAt: '2026-10-11T00:00:00.000Z' },
        'review',
      ),
    ).toBe(false);
    expect(
      isConsentOn(
        { version: 1, agreedAt: '2026-10-12T00:00:00.000Z', revokedAt: '2026-10-11T00:00:00.000Z' },
        'review',
      ),
    ).toBe(true);
  });

  it('같은 노트는 칸 순서·빠진 선택 칸과 무관하게 같은 문자열', () => {
    const reordered = { ...NOTE, checkSkipped: undefined } as PhotoNoteWire;
    expect(canonicalNoteJson(toWire(NOTE))).toBe(canonicalNoteJson(reordered));
    expect(canonicalNoteJson(toWire(NOTE))).not.toBe(canonicalNoteJson({ ...toWire(NOTE), why: '다름' }));
  });
});

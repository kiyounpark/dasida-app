import { act, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { setCloudNoteState } from '../../cloud/save-note-remote';
import type { PhotoNote } from '../../types';
import { PhotoNoteCard } from '../photo-note-card';

jest.mock('expo-image', () => {
  const React = require('react');
  const RN = jest.requireActual('react-native');
  return {
    Image: ({ source: _s, contentFit: _f, ...props }: any) => React.createElement(RN.View, props),
  };
});

function noteWith(weaknessIds: PhotoNote['weaknessIds']): PhotoNote {
  return {
    id: 'photo-2026-08-13T00:00:00.000Z',
    createdAt: '2026-08-13T00:00:00.000Z',
    schemaVersion: 1,
    dateLabel: '8/13',
    photoUri: null,
    quote: '2x² − 5x + 3',
    why: '부호를 옮기면서 −가 하나 사라졌어.',
    fix: '괄호 풀 때 앞의 −를 먼저 적고 시작하자.',
    methodLabel: '완전제곱식',
    typeLabel: '개념 구멍',
    methodId: 'cps',
    mistakeType: 'concept_gap',
    weaknessIds,
    primaryWeaknessId: weaknessIds.length === 1 ? weaknessIds[0] : null,
    checkPassed: true,
    retryResult: 'pass',
  };
}

describe('PhotoNoteCard — 약점 이름표 줄', () => {
  // 저장이 붙으면 옛 노트의 약점 id가 여기로 흘러온다. 목록에서 사라진 id를 만나도
  // 카드가 죽는 대신 대체 문구가 나가야 한다 (data/weakness-removal-safety.test.ts와 같은 자리).
  it('목록에 없는 약점 id가 와도 카드가 안 죽는다', () => {
    render(<PhotoNoteCard note={noteWith(['사라진_약점' as PhotoNote['weaknessIds'][number]])} />);

    expect(screen.getByText('🏷️ 알 수 없음')).toBeTruthy();
  });

  it('약점을 찾았으면 이름으로 뜬다', () => {
    render(<PhotoNoteCard note={noteWith(['formula_understanding'])} />);

    expect(screen.getByText('🏷️ 공식 이해 부족')).toBeTruthy();
  });

  it('못 찾았으면 줄 자체가 없다 — 빈 이름표는 학생한테 값이 0이다 (2026.08.13 🔒)', () => {
    render(<PhotoNoteCard note={noteWith([])} />);

    // 186칸 중 131칸이 이 경우다. 폴백 문구를 넣는 순간 이 단언이 깨진다 — 그게 목적이다.
    expect(screen.queryByText(/🏷️/)).toBeNull();
  });

  it('여럿이면 "또는"으로 잇는다 — 구분자가 · 면 이름 안의 ·와 안 갈린다', () => {
    render(<PhotoNoteCard note={noteWith(['g2_prop_contrapositive', 'g2_prop_quantifier'])} />);

    // '역·이·대우 혼동'이 · 를 품고 있어서, ' · '로 이으면 점 4개 중 뭐가 구분자인지 안 보인다
    expect(screen.getByText('🏷️ 역·이·대우 혼동 또는 전칭·존재 명제 혼동')).toBeTruthy();
  });

  // ── 말풍선에서 고른 값이 있으면 그것만 뜬다 (2026.09.20) ──

  it('학생이 고른 약점이 있으면 그것만 뜬다 — 골라놓고 "또는"이 남으면 물어본 의미가 없다', () => {
    const note = {
      ...noteWith(['radical_simplification_error', 'rationalization_error']),
      primaryWeaknessId: 'rationalization_error' as PhotoNote['primaryWeaknessId'],
    };
    render(<PhotoNoteCard note={note} />);

    expect(screen.getByText(/분모 유리화 실수/)).toBeTruthy();
    expect(screen.queryByText(/또는/)).toBeNull();
  });

  it('안 골랐으면(「잘 모르겠어」) 후보를 "또는"으로 잇는다', () => {
    const note = {
      ...noteWith(['radical_simplification_error', 'rationalization_error']),
      primaryWeaknessId: null,
    };
    render(<PhotoNoteCard note={note} />);

    expect(screen.getByText(/또는/)).toBeTruthy();
  });
});

/**
 * 1.0.10 — 검산에서 빠진 쪽지는 학생이 안 본 문제다. ✗로 적으면 안 본 걸 틀렸다고 적는 셈이다 (web-proto와 같은 규칙).
 */
describe('PhotoNoteCard — 오늘 확인 줄', () => {
  it('쪽지·재도전을 둘 다 봤으면 둘 다 적는다', () => {
    render(<PhotoNoteCard note={noteWith([])} />);

    expect(screen.getByText('오늘 확인: 쪽지시험 ✔ · 재도전 ✔')).toBeTruthy();
  });

  it('쪽지를 틀렸으면 ✗', () => {
    render(<PhotoNoteCard note={{ ...noteWith([]), checkPassed: false, retryResult: 'fail' }} />);

    expect(screen.getByText('오늘 확인: 쪽지시험 ✗ · 재도전 ✗')).toBeTruthy();
  });

  it('쪽지를 건너뛰었으면 쪽지 칸을 안 적는다 — ✗로 둔갑하지 않는다', () => {
    render(<PhotoNoteCard note={{ ...noteWith([]), checkPassed: false, checkSkipped: true }} />);

    expect(screen.getByText('오늘 확인: 재도전 ✔')).toBeTruthy();
    expect(screen.queryByText(/쪽지시험/)).toBeNull();
  });

  it('둘 다 안 봤으면 줄이 빈다', () => {
    render(
      <PhotoNoteCard note={{ ...noteWith([]), checkPassed: false, checkSkipped: true, retryResult: 'none' }} />,
    );

    expect(screen.queryByText(/오늘 확인/)).toBeNull();
  });

  it('1.0.9까지 저장된 노트(checkSkipped 칸 없음)는 전처럼 쪽지를 적는다', () => {
    // noteWith는 checkSkipped 칸을 안 만든다 — 1.0.9 저장본과 같은 모양
    render(<PhotoNoteCard note={{ ...noteWith([]), checkPassed: false, retryResult: 'none' }} />);

    expect(screen.getByText('오늘 확인: 쪽지시험 ✗')).toBeTruthy();
  });
});

/**
 * 10.07 — 흐름 끝 카드 「왜」 칸 넷째 줄이 안 그려졌다(시뮬레이터 실측 높이 87.9998779296875).
 * 줄 높이 22면 n줄 높이가 화소 칸에 딱 맞아 잰 높이에 여유가 0이고, 레이아웃 소수점 오차로 칸이 그보다
 * 조금만 작아져도 iOS가 마지막 줄을 안 그린다. 여기선 그 여유가 남는지만 본다 — 그리기는 jest가 못 본다.
 */
describe('PhotoNoteCard — 행 줄 높이 여유', () => {
  // 앱(RN)은 글 높이를 잴 때 화소 칸으로 올림한다 — 그 올림이 남기는 여유.
  // 오차는 화면 좌표 8192pt 아래에서 0.0005pt 미만이라 0.001이면 넉넉하다.
  const slack = (lineHeight: number, lines: number, scale: number) =>
    Math.ceil(lineHeight * lines * scale - 1e-9) / scale - lineHeight * lines;

  it.each(['왜', '부호를 옮기면서 −가 하나 사라졌어.'])('「%s」는 1~12줄 어디서도 여유가 남는다', (text) => {
    render(<PhotoNoteCard note={noteWith([])} />);
    const { lineHeight } = StyleSheet.flatten(screen.getByText(text).props.style);

    for (const scale of [2, 3]) {
      for (let lines = 1; lines <= 12; lines += 1) {
        expect(slack(lineHeight, lines, scale)).toBeGreaterThan(0.001);
      }
    }
  });
});

/** 1.0.11 — ☁ 줄. 서버 응답으로만 바뀐다(약속 파일 CloudNoteState) */
describe('PhotoNoteCard — ☁ 줄', () => {
  it.each([
    [{ kind: 'saving' } as const, '☁ 저장 중'],
    [{ kind: 'stored', storedAt: '2026-10-10T00:00:00.000Z', hasPhoto: true } as const, '☁ 저장됨'],
    [{ kind: 'stored', storedAt: '2026-10-10T00:00:00.000Z', hasPhoto: false } as const, '☁ 저장됨 · 사진은 계정에 못 올림'],
    [{ kind: 'failed', retryable: true } as const, '☁ 저장 못 함 · 이 기기엔 남아 있어'],
  ])('%o → %s', (cloud, line) => {
    render(<PhotoNoteCard cloud={cloud} note={noteWith([])} />);

    expect(screen.getByText(line)).toBeTruthy();
  });

  it('상태가 없거나 안 올라간 노트면 줄을 안 낸다 — 1.0.10까지와 같은 카드', () => {
    render(<PhotoNoteCard note={noteWith([])} />);
    expect(screen.queryByText(/☁/)).toBeNull();

    render(<PhotoNoteCard cloud={{ kind: 'local-only' }} note={noteWith([])} variant="list" />);
    expect(screen.queryByText(/☁/)).toBeNull();
  });

  it('cloud를 안 주면 이번 실행에서 올린 상태를 note.id로 따라간다', () => {
    const note = { ...noteWith([]), id: 'photo-card-session-test' };
    render(<PhotoNoteCard note={note} />);
    expect(screen.queryByText(/☁/)).toBeNull();

    act(() => setCloudNoteState(note.id, { kind: 'saving' }));
    expect(screen.getByText('☁ 저장 중')).toBeTruthy();

    act(() => setCloudNoteState(note.id, { kind: 'stored', storedAt: '2026-10-10T00:00:00.000Z', hasPhoto: true }));
    expect(screen.getByText('☁ 저장됨')).toBeTruthy();
    expect(screen.queryByText('☁ 저장 중')).toBeNull();
  });
});

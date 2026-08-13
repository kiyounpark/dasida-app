import { render, screen } from '@testing-library/react-native';

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
    dateLabel: '8/13',
    photoUri: null,
    quote: '2x² − 5x + 3',
    why: '부호를 옮기면서 −가 하나 사라졌어.',
    fix: '괄호 풀 때 앞의 −를 먼저 적고 시작하자.',
    methodLabel: '완전제곱식',
    typeLabel: '개념 구멍',
    weaknessIds,
    checkPassed: true,
    retryResult: 'pass',
  };
}

describe('PhotoNoteCard — 약점 이름표 줄', () => {
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
});

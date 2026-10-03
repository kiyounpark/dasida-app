import type { PhotoNote } from '@/features/photo/types';

import { buildNotesHeading } from './home-notes-heading';

const note = (primaryWeaknessId: string | null) => ({ primaryWeaknessId }) as PhotoNote;

describe('buildNotesHeading — 노트는 있는데 복습이 0일 때', () => {
  it('약점 이름이 안 붙은 노트면 이유까지 말한다', () => {
    expect(buildNotesHeading(note(null), 1)).toEqual({
      title: '오답노트 1장 있어요',
      body: '복습 날짜는 안 잡혔어요 — 약점 이름이 안 붙은 노트라서요.',
    });
  });

  it('이름이 붙었는데 과제가 없으면(저장 실패·30일 차까지 끝냄) 사실만 말한다 — 「아직」이면 남은 게 있는 것처럼 들린다', () => {
    expect(buildNotesHeading(note('discriminant_calculation'), 3)).toEqual({
      title: '오답노트 3장 있어요',
      body: '지금 잡힌 복습은 없어요.',
    });
  });
});

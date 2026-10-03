import type { PhotoNote } from '@/features/photo/types';

/**
 * 노트는 있는데 복습 과제가 0일 때 홈 제목. 「아직 복습할 게 없어요 / 찍어서 올리면 쌓여요」는
 * 이미 올린 학생에게 거짓이다(기윤 10.03 실측). 과제는 약점 이름이 하나로 정해진 노트만 생긴다
 * (use-photo-flow.ts 과제 만들기) — 이름이 있는데 과제가 없으면 저장 실패이거나 30일 차까지 다 끝낸 것이라 이유를 단정하지 않고 사실만 말한다(astra 리뷰 10.03).
 */
export function buildNotesHeading(note: PhotoNote, count: number): { title: string; body: string } {
  return {
    title: `오답노트 ${count}장 있어요`,
    body:
      note.primaryWeaknessId == null
        ? '복습 날짜는 안 잡혔어요 — 약점 이름이 안 붙은 노트라서요.'
        : '지금 잡힌 복습은 없어요.',
  };
}

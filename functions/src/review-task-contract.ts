/**
 * 복습 과제 종류 — 앱·서버가 같은 규칙으로 가르는 유일한 자리 (1.0.12 서버 과제 모양 (가), 2026-10-05).
 *
 * 종류 칸은 따로 두지 않고 (출처, 약점) 쌍에서 읽는다.
 *   - 약점 과제: weaknessId가 있다. 진단·모의고사·약점 연습, 그리고 사진 복습에서 틀려 생긴 과제(source 'photo')도 여기다.
 *   - 노트 과제: source 'photo' + weaknessId null. 약점 이름이 안 붙은 노트를 다시 보는 과제 — 만들기는 ⑴ 화면 뒤에 시작한다.
 * null은 사진 과제에만 있다(서버 ReviewTaskSchema가 막는다). 그래서 약점 칸 하나로 가른다.
 * 화면·집계·묶기는 weaknessId를 직접 보지 말고 이 함수를 본다 — 나중에 kind 칸이 생겨도 여기만 바뀐다.
 * 설계: docs/research/2026-10-04-review-floor-design.md 「서버 과제 모양」
 *
 * import 0 — photo-store-contract.ts와 같은 이유. 앱은 `@/functions/src/review-task-contract`로 읽는다.
 * 0줄인지는 features/learning/review-task-contract.test.ts가 본다.
 */

export type ReviewTaskKind = 'weakness' | 'note';

type KindInput = { weaknessId: string | null };

export function reviewTaskKind(task: KindInput): ReviewTaskKind {
  return task.weaknessId === null ? 'note' : 'weakness';
}

/** 약점 과제로 좁힌다 — 약점 이름표·약점 3단계처럼 weaknessId가 꼭 있어야 하는 자리에서 쓴다 */
export function isWeaknessReviewTask<T extends KindInput>(
  task: T,
): task is T & { weaknessId: NonNullable<T['weaknessId']> } {
  return reviewTaskKind(task) === 'weakness';
}

/** 과제 id — 약점 과제 `{출처id}__{약점id}__{단계}`(지금 꼴 그대로) · 노트 과제 `{노트id}__note__{단계}` */
export function buildReviewTaskId(sourceId: string, weaknessId: string | null, stage: string): string {
  return `${sourceId}__${weaknessId ?? 'note'}__${stage}`;
}

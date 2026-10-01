import { resolveWeaknessLabel, type WeaknessId } from '@/data/diagnosisMap';

import type { CheckResult, ScriptRetryResult } from './script-io';

/**
 * 노트 카드의 글자 줄 — 웹 카드(app.js)와 앱 카드(PhotoNoteCard)가 같은 글자를 내게 한 곳에 둔다.
 * 수식 포매터는 그리는 쪽이 인용·왜·다음엔에만 건다(이름표·확인 줄엔 수식이 없다).
 */
export type NoteCardSource = {
  quote: string;
  checkResult: CheckResult;
  retryResult: ScriptRetryResult;
  methodLabel: string;
  typeLabel: string;
  weaknessIds: WeaknessId[];
  primaryWeaknessId: WeaknessId | null;
};

/** 📌 접는 기준 — 2021 「수학/과탐 n제 복습 팁」(orbi 205👍)의 기준 문장. 노트 뜰 때 같이 뜬다 (🔒 10.01 앱 카드에도) */
export const NOTE_ASK_LINE =
  "📌 \"수능장에서 이 풀이를 생각해 낼 수 있는가\" — 답이 '당연하지'가 아니면, 이 문제 페이지를 접어 둬.";

const CHECK_MARK: Partial<Record<CheckResult, string>> = { pass: '쪽지시험 ✔', fail: '쪽지시험 ✗' };
const RETRY_MARK: Partial<Record<ScriptRetryResult, string>> = { pass: '재도전 ✔', fail: '재도전 ✗' };

export function noteCardLines(note: NoteCardSource) {
  // 안 본 문제는 줄에 안 적는다 — 검산에서 빠진 쪽지(skip)·재도전(unverified·none)이 ✗로 둔갑하지 않게
  const marks = [CHECK_MARK[note.checkResult], RETRY_MARK[note.retryResult]].filter(Boolean);
  // 학생이 골랐으면 그것만, 아니면 후보 전부를 「또는」으로. 대화에서 오는 id는 늘 통역표 키다 —
  // 목록에서 사라진 id는 저장된 옛 노트에서만 오고, 그땐 카드가 죽지 않게 대체 문구(resolveWeaknessLabel)
  const shown = note.primaryWeaknessId ? [note.primaryWeaknessId] : note.weaknessIds;
  return {
    quote: note.quote ? `"${note.quote}"` : '(없음)',
    checks: marks.length > 0 ? `오늘 확인: ${marks.join(' · ')}` : '',
    tags: `#${note.methodLabel} #${note.typeLabel}`,
    weaknessLabels: shown.map((id) => resolveWeaknessLabel(id)),
  };
}

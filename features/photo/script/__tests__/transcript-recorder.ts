// 테스트용 ScriptIO — 대본이 부른 것을 웹 녹음기(web-golden.test.ts)와 같은 골든 모양으로 적는다.
// 말풍선 합치기는 웹 coachSays·앱 use-photo-thread와 같은 규칙, 글자는 공용 포매터를 거친 값.
import { formatMathText } from '@/components/math/format-math-text';

import type { PhotoAction } from '../../types';
import { noteCardLines } from '../note-card-lines';
import type { ScriptEvent } from '../script-events';
import type { NoteView, ScriptEffect, ScriptEnding, ScriptIO, TextPrompt } from '../script-io';
import { goldenEvent, type GoldenEntry, type GoldenNote } from './golden';

type Item =
  | { kind: 'coach'; paras: string[]; ask: boolean }
  | { kind: 'me'; text: string }
  | { kind: 'note'; note: GoldenNote }
  | { kind: 'card'; title: string; body: string };

const ENDING_ENTRY: Record<string, GoldenEntry> = {
  'note:success': { ending: 'note:success' },
  'note:fail': { ending: 'note:fail' },
  weakness: { ending: 'weakness' },
  closed: { ending: 'closed' },
};

function toGoldenNote(view: NoteView): GoldenNote {
  const lines = noteCardLines(view);
  return {
    date: view.dateLabel,
    photo: view.photoUri !== null,
    quote: formatMathText(lines.quote),
    why: formatMathText(view.why),
    fix: formatMathText(view.fix),
    checks: lines.checks,
    tags: lines.tags,
    weakness: lines.weaknessLabels,
    askLine: view.askLine,
  };
}

export function createTranscriptRecorder({ appEvents = false } = {}) {
  const items: Item[] = [];
  const events: ScriptEvent[] = [];
  let actions: PhotoAction[] = [];
  let prompt: TextPrompt | null = null;
  let effect: ScriptEffect | null = null;
  let ending: ScriptEnding | null = null;
  let seen = 0;
  let seenParas = 0;
  let seenAsk = false;
  let seenEvents = 0;

  const markAsk = () => {
    const last = items.at(-1);
    if (last?.kind === 'coach') last.ask = true;
  };

  const io: ScriptIO = {
    say(text) {
      const last = items.at(-1);
      if (last?.kind === 'coach' && !last.ask) last.paras.push(text);
      else items.push({ kind: 'coach', paras: [text], ask: false });
    },
    mySay(text) {
      items.push({ kind: 'me', text });
    },
    ask(next) {
      markAsk();
      actions = next;
      prompt = null;
    },
    askText(next) {
      markAsk();
      actions = [];
      prompt = next;
    },
    showNote(note) {
      items.push({ kind: 'note', note: toGoldenNote(note) });
    },
    showWeaknessCard(card) {
      items.push({ kind: 'card', title: card.title, body: card.body });
    },
    end(next) {
      ending = next;
      actions = [];
      prompt = null;
    },
    run(next) {
      effect = next;
    },
    log(event) {
      events.push(event);
    },
  };

  /** 지난 단계 뒤로 생긴 것 — 웹 녹음기와 같은 순서(대화 → 이벤트 → 끝 상태 하나) */
  function snapshot(): GoldenEntry[] {
    const out: GoldenEntry[] = [];
    for (let i = Math.max(seen - 1, 0); i < items.length; i += 1) {
      const item = items[i];
      const isOld = i < seen;
      if (item.kind === 'coach') {
        const paras = item.paras.map(formatMathText);
        if (isOld) {
          const fresh = paras.slice(seenParas);
          if (fresh.length > 0 || item.ask !== seenAsk) out.push({ coach: fresh, ask: item.ask, cont: true });
          continue;
        }
        out.push({ coach: paras, ask: item.ask });
      } else if (isOld) {
        continue;
      } else if (item.kind === 'me') {
        out.push({ me: formatMathText(item.text) });
      } else if (item.kind === 'note') {
        out.push({ note: item.note });
      } else {
        out.push({ card: { title: formatMathText(item.title), body: formatMathText(item.body) } });
      }
    }
    seen = items.length;
    const last = items.at(-1);
    seenParas = last?.kind === 'coach' ? last.paras.length : 0;
    seenAsk = last?.kind === 'coach' && last.ask;

    for (const { name, ...params } of events.slice(seenEvents)) {
      const entry = goldenEvent(name, params, { appEvents });
      if (entry) out.push(entry);
    }
    seenEvents = events.length;

    if (effect) {
      out.push({ effect });
      effect = null;
    } else if (ending) {
      out.push(ENDING_ENTRY[ending.kind === 'note' ? `note:${ending.variant}` : ending.kind]);
      ending = null;
    } else if (prompt) {
      out.push({ input: { placeholder: prompt.placeholder, maxLength: prompt.maxLength, submit: prompt.submitLabel } });
    } else if (actions.length > 0) {
      out.push({ buttons: actions.map((a) => [formatMathText(a.label), a.kind ?? null]) });
    }
    return out;
  }

  /** 어댑터처럼 — 누른 순간 버튼부터 비운다 */
  function press(label: string) {
    const action = actions.find((a) => formatMathText(a.label) === label);
    if (!action) {
      throw new Error(`버튼 없음: ${label} (있는 것: ${actions.map((a) => formatMathText(a.label)).join(' / ')})`);
    }
    actions = [];
    action.onPress();
  }

  function type(text: string) {
    if (!prompt) throw new Error(`입력칸 없음: ${text}`);
    const { onSubmit } = prompt;
    prompt = null;
    onSubmit(text);
  }

  return { io, snapshot, press, type, events };
}

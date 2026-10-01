import { useCallback, useRef, useState } from 'react';

import type { TextPrompt, WeaknessCardView } from '../script/script-io';
import type { PhotoAction, PhotoBubble, PhotoNote } from '../types';

export type PhotoThread = {
  bubbles: PhotoBubble[];
  actions: PhotoAction[];
  /** 방법을 학생 말로 받는 입력칸. actions와 둘 중 하나만 뜬다 */
  textPrompt: TextPrompt | null;
  /** 코치 말풍선. 직전이 아직 답을 안 기다리는 코치 말풍선이면 문단만 덧붙인다. */
  say: (text: string) => void;
  /** 내 말풍선 */
  mySay: (text: string) => void;
  /** 오답노트 한 장을 대화에 얹는다 */
  showNote: (note: PhotoNote) => void;
  /** 설문 결말 카드를 대화에 얹는다 */
  showWeaknessCard: (card: WeaknessCardView) => void;
  /** 하단 버튼을 통째로 갈아끼우고, 직전 코치 말풍선을 '답 기다리는 중'으로 표시 */
  ask: (buttons: PhotoAction[]) => void;
  /** 버튼 대신 입력칸. 직전 코치 말풍선을 '답 기다리는 중'으로 표시 (web-proto markAsk) */
  askText: (prompt: TextPrompt) => void;
  /** 버튼을 누르는 통로. 누른 순간 버튼을 먼저 비운다 — 두 번 눌러 흐름이 두 갈래로 가는 걸 막는다. */
  press: (action: PhotoAction) => void;
  /** 입력칸을 보내는 통로. press와 같은 순서 — 입력칸부터 비우고 보낸다. 빈 글자는 안 보낸다 */
  submitText: (text: string) => void;
  clear: () => void;
};

/**
 * 대화 상태. 대본(features/photo/script)이 쓰는 건 say/mySay/ask/askText와 카드 둘이고,
 * web-proto app.js의 coachSays/userSays/setActions와 같은 규칙을 지킨다.
 */
export function usePhotoThread(): PhotoThread {
  const [bubbles, setBubbles] = useState<PhotoBubble[]>([]);
  const [actions, setActions] = useState<PhotoAction[]>([]);
  const [textPrompt, setTextPrompt] = useState<TextPrompt | null>(null);
  const textPromptRef = useRef<TextPrompt | null>(null);
  const nextId = useRef(0);

  const say = useCallback((text: string) => {
    const id = (nextId.current += 1);
    setBubbles((prev) => {
      const last = prev[prev.length - 1];
      // 한 생각 = 한 덩어리. 단 이미 답을 기다리는 말풍선(ask)에는 붙이지 않는다 — 질문 덩어리는 닫아 둔다.
      if (last && last.kind === 'coach' && !last.ask) {
        return [...prev.slice(0, -1), { ...last, paras: [...last.paras, text] }];
      }
      return [...prev, { id, kind: 'coach', paras: [text], ask: false }];
    });
  }, []);

  const mySay = useCallback((text: string) => {
    const id = (nextId.current += 1);
    setBubbles((prev) => [...prev, { id, kind: 'me', paras: [text] }]);
  }, []);

  const showNote = useCallback((note: PhotoNote) => {
    const id = (nextId.current += 1);
    setBubbles((prev) => [...prev, { id, kind: 'note', note }]);
  }, []);

  const showWeaknessCard = useCallback((card: WeaknessCardView) => {
    const id = (nextId.current += 1);
    setBubbles((prev) => [...prev, { id, kind: 'weakness', card }]);
  }, []);

  const markAsk = useCallback(() => {
    setBubbles((prev) => {
      const last = prev[prev.length - 1];
      if (!last || last.kind !== 'coach' || last.ask) return prev;
      return [...prev.slice(0, -1), { ...last, ask: true }];
    });
  }, []);

  const setPrompt = useCallback((prompt: TextPrompt | null) => {
    textPromptRef.current = prompt;
    setTextPrompt(prompt);
  }, []);

  const ask = useCallback(
    (buttons: PhotoAction[]) => {
      markAsk();
      setPrompt(null);
      setActions(buttons);
    },
    [markAsk, setPrompt],
  );

  const askText = useCallback(
    (prompt: TextPrompt) => {
      markAsk();
      setActions([]);
      setPrompt(prompt);
    },
    [markAsk, setPrompt],
  );

  const press = useCallback((action: PhotoAction) => {
    setActions([]);
    action.onPress();
  }, []);

  const submitText = useCallback(
    (text: string) => {
      const prompt = textPromptRef.current;
      const value = text.trim();
      if (!prompt || !value) return;
      setPrompt(null);
      prompt.onSubmit(value);
    },
    [setPrompt],
  );

  const clear = useCallback(() => {
    setBubbles([]);
    setActions([]);
    setPrompt(null);
  }, [setPrompt]);

  return {
    bubbles,
    actions,
    textPrompt,
    say,
    mySay,
    showNote,
    showWeaknessCard,
    ask,
    askText,
    press,
    submitText,
    clear,
  };
}

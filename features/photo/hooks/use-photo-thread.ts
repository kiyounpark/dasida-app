import { useCallback, useRef, useState } from 'react';

import type { PhotoAction, PhotoBubble } from '../types';

export type PhotoThread = {
  bubbles: PhotoBubble[];
  actions: PhotoAction[];
  /** 코치 말풍선. 직전이 아직 답을 안 기다리는 코치 말풍선이면 문단만 덧붙인다. */
  say: (text: string) => void;
  /** 내 말풍선 */
  mySay: (text: string) => void;
  /** 하단 버튼을 통째로 갈아끼우고, 직전 코치 말풍선을 '답 기다리는 중'으로 표시 */
  ask: (buttons: PhotoAction[]) => void;
  /** 버튼을 누르는 통로. 누른 순간 버튼을 먼저 비운다 — 두 번 눌러 흐름이 두 갈래로 가는 걸 막는다. */
  press: (action: PhotoAction) => void;
  clear: () => void;
};

/**
 * 대화 상태. 흐름 코드가 쓰는 건 say/mySay/ask 셋뿐이고,
 * web-proto app.js의 coachSays/userSays/setActions와 같은 규칙을 지킨다.
 */
export function usePhotoThread(): PhotoThread {
  const [bubbles, setBubbles] = useState<PhotoBubble[]>([]);
  const [actions, setActions] = useState<PhotoAction[]>([]);
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

  const ask = useCallback((buttons: PhotoAction[]) => {
    setBubbles((prev) => {
      const last = prev[prev.length - 1];
      if (!last || last.kind !== 'coach' || last.ask) return prev;
      return [...prev.slice(0, -1), { ...last, ask: true }];
    });
    setActions(buttons);
  }, []);

  const press = useCallback((action: PhotoAction) => {
    setActions([]);
    action.onPress();
  }, []);

  const clear = useCallback(() => {
    setBubbles([]);
    setActions([]);
  }, []);

  return { bubbles, actions, say, mySay, ask, press, clear };
}

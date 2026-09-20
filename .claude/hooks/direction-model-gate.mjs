#!/usr/bin/env node

// 방향·마케팅 질문이 오면 "새 숫자 있나?"를 먼저 묻게 만드는 알림.
// 근거: 🧭 09.15 🔒 "기윤이 방향 얘기를 꺼내면 Claude가 먼저 '새 숫자 있나?'를 묻는다(기억할 것 0개)"
//      그런데 09.20에 그 규칙을 Claude가 어겼다 — 기억에 기대는 장치라서.
// 그래서 기억을 훅으로 옮긴다. 기윤이 누를 건 0개.
//
// 이 훅은 Fable을 부르지 않는다. Claude에게 "먼저 물어라"를 띄울 뿐이다.
// 실제 호출은 기윤이 승낙한 뒤에 Claude가 한다 (Fable은 울트라코드와 주간 한도를 나눠 먹는다).

import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';

// CCR 자동 루틴 환경에서는 스킵 (기존 훅과 같은 기준)
if (!process.env.HOME?.startsWith('/Users/')) process.exit(0);

try {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  const input = JSON.parse(raw || '{}');

  const prompt = String(input.prompt || '');
  const sessionId = String(input.session_id || '');
  if (!prompt || !sessionId) process.exit(0);

  // 단독으로 발동하는 말 — 이 말이 있으면 거의 방향 얘기다
  // ⚠️ "마케팅"은 뺐다. 09.20 첫 발동이 "마케팅 훅을 어떻게 만들까"에 걸린 오탐이었다.
  //    도구·훅 얘기에도 그 단어가 나온다.
  const STRONG = [
    '사람을 어떻게',
    '사람 어떻게',
    '사람을 모',
    '사람 모으',
    '어떻게 알리',
    '어떻게 모으',
    '안 먹히',
    '안먹히',
    '먹히나',
    '먹히는지',
    '다음 글 뭐',
    '뭐 쓸까',
    '뭘 쓸까',
    '후보 a',
    'a/b/c',
  ];

  // 주제어 + 결정어가 같이 있을 때만 발동
  const TOPIC = [
    '오르비',
    '커뮤',
    '커뮤니티',
    '마케팅',
    '방향',
    '전략',
    '글 모양',
    '다음 3편',
    '다음 세 편',
    '쇼츠',
    '영상',
    '타겟',
    '홍보',
    '제목',
    '세는 줄',
    '유입',
    '조회',
    '좋아요',
  ];
  const DECIDE = [
    '정할까',
    '정해야',
    '정하자',
    '골라',
    '고를까',
    '바꿀까',
    '어떻게 할까',
    '어떻게 하지',
    '뭘 할까',
    '결정',
    '판단',
    '잠글까',
    '추천해',
  ];

  const lower = prompt.toLowerCase();
  const has = (list) => list.some((w) => lower.includes(w));

  const hit = has(STRONG) || (has(TOPIC) && has(DECIDE));
  if (!hit) process.exit(0);

  // 세션당 두 번까지. 매 턴 뜨면 소음이 되고, 한 번만 두면
  // 오탐 한 번에 기회가 없어진다 (09.20 실측 — 첫 발동이 오탐이었다).
  const stateDir = join(tmpdir(), 'dasida-direction-gate');
  const stateFile = join(stateDir, `${sessionId}.count`);
  let fired = 0;
  if (existsSync(stateFile)) {
    fired = Number.parseInt(readFileSync(stateFile, 'utf8'), 10) || 0;
  }
  if (fired >= 2) process.exit(0);
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(stateFile, String(fired + 1));

  const lines = [
    '[방향 질문으로 감지됨 — 🧭 09.15 🔒 · 세션당 1회]',
    '',
    '답하기 전에 한 줄로 먼저 물어라:',
    '  "새 숫자 있어요?"',
    '',
    '- 새 숫자가 있으면 → Fable에 같은 질문을 던져 답을 갈라 본다.',
    '  부르는 법은 🔒 09.20 기윤 결정 "C" — 세션 모델을 바꾸지 말고',
    '  Agent 도구를 model: "fable"로 띄워 답만 받아온다.',
    '  ⚠️ 호출은 기윤이 "그래"라고 한 뒤에. Fable은 울트라코드와 주간 한도를 나눠 먹는다.',
    '  ⚠️ 프롬프트엔 숫자와 타겟만 넣고 이미 잠근 결정(🔒)은 빼라 —',
    '     다 주면 우리가 쳐놓은 울타리 안에서만 답한다 (09.20 실측).',
    '  받은 답은 Opus 답과 나란히 놓고 "갈린 자리"를 기윤에게 보여준다.',
    '',
    '- 새 숫자가 없으면 → 여기서 그냥 답한다.',
    '  숫자 없이 방향을 돌리면 같은 재료라 같은 답이 나온다 (09.14 실측:',
    '  "쉽게 풀어줘"가 다섯 번 나왔고 결론은 새 게 없었다).',
    '',
    '- 흔들리는 날이면 결정하지 않는다 (🧭 08.05). 후보만 좁히고 잠그는 건 다음 날.',
  ];

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: lines.join('\n'),
      },
    })
  );
} catch {
  // 훅이 깨져도 대화는 막지 않는다
  process.exit(0);
}

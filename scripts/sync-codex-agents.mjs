#!/usr/bin/env node
/**
 * .claude/agents/*.md → .codex/agents/*.toml 사본 맞추기
 *
 * 왜 있나: 두 곳이 같은 에이전트를 각자 들고 있는데 수동 사본이라 갈라졌다.
 * 2026.09.19에 `.md` 넷을 고쳤더니 `.toml`은 옛 내용 그대로였다 — 그중 하나는
 * `.md`에서 지운 거짓 문장("학생이 읽는 유일한 줄")을 아직 들고 있었다.
 * 노션 사본이 갈라진 08.01 사고와 같은 모양이라 그때처럼 손으로 맞추지 않고 스크립트로 둔다.
 *
 * 쓰는 법: node scripts/sync-codex-agents.mjs [--check]
 *   --check 를 주면 고치지 않고 어긋난 파일만 알려준다 (종료코드 1).
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = '.claude/agents';
const DST = '.codex/agents';
const checkOnly = process.argv.includes('--check');

/** md 앞머리(--- ... ---)에서 name·description을 꺼내고 본문을 돌려준다 */
function parse(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('앞머리(---)가 없다');
  const front = m[1];
  const body = m[2].trim();
  const pick = (key) => {
    const line = front.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
    return line ? line[1].trim() : '';
  };
  return { name: pick('name'), description: pick('description'), body };
}

const drifted = [];

for (const file of readdirSync(SRC).filter((f) => f.endsWith('.md'))) {
  const md = readFileSync(join(SRC, file), 'utf8');
  const { name, description, body } = parse(md);

  // 본문에 """가 있으면 toml 여러 줄 문자열이 깨진다 — 고치기 전에 멈춘다
  if (body.includes('"""')) {
    throw new Error(`${file}: 본문에 삼중따옴표가 있어 toml로 못 옮긴다`);
  }

  const toml = `name = ${JSON.stringify(name)}\ndescription = ${JSON.stringify(description)}\ndeveloper_instructions = """\n${body}"""\n`;
  const out = join(DST, file.replace(/\.md$/, '.toml'));

  let before = '';
  try {
    before = readFileSync(out, 'utf8');
  } catch {
    before = '';
  }

  if (before === toml) continue;

  drifted.push(out);
  if (!checkOnly) writeFileSync(out, toml);
}

if (drifted.length === 0) {
  console.log('.codex/agents — 어긋난 것 없음');
  process.exit(0);
}

console.log(`${checkOnly ? '어긋남' : '맞춤'} ${drifted.length}개:`);
for (const f of drifted) console.log(`  ${f}`);
process.exit(checkOnly ? 1 : 0);

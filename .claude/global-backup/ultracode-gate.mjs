#!/usr/bin/env node

// 울트라코드 판정 게이트 (2026.09.15 🔒 · ~/.claude/CLAUDE.md)
//
// 왜: Claude가 판정을 말하지 않고 코드를 고치거나 조사를 돌리는 일이 반복됐다.
// 09.15 실측 — 워크플로우 두 번을 다 안 묻고 돌렸고 두 번째가 세션 한도를 먹었다.
// 규칙을 기억하는 건 Claude 몫인데 대화가 길어지면 미끄러진다 → 환경에서 막는다.
//
// 세션당 한 번만 건다. 매번 걸면 한 주 만에 무뎌진다.
//
// ask가 아니라 deny인 이유 (09.15 실측): 이 맥의 설정이 defaultMode "auto"라
// ask는 기윤에게 창도 안 뜨고 자동 승인된다 — 게이트가 아무 일도 안 한 셈이 된다.
// deny면 첫 시도가 막히고 그 이유가 Claude에게 돌아가, Claude가 멈춰서 판정을 말하게 된다.
// 기윤이 누를 것도 0개다. 대가는 세션당 도구 호출 한 번이 헛도는 것뿐.
//
// Bash를 넣은 이유 (09.15 실측): auto 모드가 Claude에게 "파일 수정도 Bash로 하라"고
// 지시한다. 그래서 Edit/Write만 막으면 sed -i · cat > · python 스크립트가 게이트를
// 통째로 비켜간다 — 그날 세션이 앱 코드 5734줄을 그렇게 지웠다.
// 반대로 Bash 전부를 걸면 세션 첫 ls 한 번에 게이트가 소진된다.
// 그래서 "읽기만 하는 게 확실한 것"만 통과시키고 나머지는 전부 건다.
// 애매하면 거는 쪽으로 기운다 — 헛도는 비용은 도구 호출 한 번뿐이고,
// 놓치는 비용은 게이트가 없는 것과 같기 때문이다.
//
// 임시 파일을 빼는 이유 (09.15 실측): 그날 세션의 첫 Write는 앱 코드가 아니라
// 분석용 임시 스크립트였다. 게이트가 거기서 소진되고, 정작 session.tsx 263줄을
// 지울 때는 이미 열려 있었다. 세션당 한 번뿐인 기회를 스크래치패드가 먹으면 안 된다.
// 그래서 /tmp · /var/folders 같은 임시 경로에 쓰는 것은 플래그를 소진하지 않는다.
// ~/.claude 는 임시가 아니다 — 훅과 규칙 문서를 고치는 건 진짜 작업이다.

import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const GATED = ['Workflow', 'Bash', 'Edit', 'MultiEdit', 'Write', 'NotebookEdit'];
const STATE_DIR = join(homedir(), '.claude', '.ultracode-gate');
const KEEP_MS = 7 * 24 * 60 * 60 * 1000;

// 임시 경로. 여기에 쓰는 건 작업이 아니라 메모라서 게이트를 소진하지 않는다.
const TEMP_PREFIXES = [
  '/tmp/', '/private/tmp/', '/var/tmp/', '/private/var/tmp/',
  '/var/folders/', '/private/var/folders/',
];
const isTempPath = (p) => TEMP_PREFIXES.some((t) => String(p || '').startsWith(t));

// 읽기만 하는 게 확실한 명령. 여기 없으면 전부 쓰기로 본다.
const READ_ONLY = new Set([
  'ls', 'cat', 'head', 'tail', 'wc', 'stat', 'file', 'find', 'grep', 'rg', 'egrep', 'fgrep',
  'echo', 'pwd', 'which', 'type', 'printenv', 'env', 'date', 'awk', 'sort', 'uniq', 'cut',
  'tr', 'jq', 'realpath', 'dirname', 'basename', 'du', 'df', 'tree', 'diff', 'true', 'test',
  'sleep', 'man', 'whoami', 'hostname', 'uname', 'ps', 'lsof', 'column', 'less', 'more',
]);

const GIT_READ = new Set([
  'log', 'status', 'diff', 'show', 'branch', 'remote', 'blame', 'describe',
  'for-each-ref', 'rev-list', 'rev-parse', 'ls-files', 'ls-tree', 'shortlog', 'cat-file',
]);

function isReadOnlySegment(segment) {
  let s = segment.trim();
  if (!s) return true;

  // 버려지는 리디렉션은 쓰기가 아니다
  s = s.replace(/\d?&?>>?\s*\/dev\/null/g, ' ').replace(/2>&1/g, ' ');
  // 임시 경로로 가는 리디렉션도 작업이 아니다 (cat > /tmp/x · … > /tmp/out.log)
  s = s.replace(/\d?&?>>?\s*("?)(\/(?:private\/)?(?:tmp|var\/tmp|var\/folders)\/[^\s"'|;&]*)\1/g, ' ');
  // 남은 > 가 있으면 진짜 파일에 쓰는 것
  if (s.includes('>')) return false;

  const parts = s.split(/\s+/).filter(Boolean);
  let i = 0;
  while (i < parts.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(parts[i])) i += 1; // FOO=bar cmd
  if (i >= parts.length) return true;

  const cmd = parts[i].replace(/^.*\//, ''); // /usr/bin/git · ./node_modules/.bin/jest
  const args = parts.slice(i + 1);

  if (cmd === 'sed') return !args.includes('-i'); // sed -n 은 읽기, sed -i 는 쓰기
  if (cmd === 'git') return GIT_READ.has(args[0] || '');
  if (cmd === 'npm') return args[0] === 'ls' || args[0] === 'view';
  if (cmd === 'npx') return (args[0] || '').replace(/^.*\//, '') === 'tsc';

  // 스크립트 실행은 안을 못 보니 전부 쓰기로 본다 (python3 edits.py 같은 것)
  return READ_ONLY.has(cmd);
}

function bashMayWrite(command) {
  return String(command)
    .split(/&&|\|\||[;|\n]/)
    .some((segment) => !isReadOnlySegment(segment));
}

let raw = '';
for await (const chunk of process.stdin) raw += chunk;

let input = {};
try {
  input = JSON.parse(raw || '{}');
} catch {
  process.exit(0); // 입력이 깨졌으면 조용히 통과 — 게이트가 작업을 막는 쪽으로 실패하면 안 된다
}

const tool = String(input.tool_name || '');
if (!GATED.includes(tool)) process.exit(0);

// 읽기만 하는 Bash는 플래그를 소진하지 않고 통과시킨다
if (tool === 'Bash' && !bashMayWrite(input?.tool_input?.command ?? '')) process.exit(0);

// 임시 경로에 쓰는 Write/Edit 계열도 마찬가지 — 스크래치패드가 게이트를 먹으면 안 된다
if (tool !== 'Bash' && tool !== 'Workflow' && isTempPath(input?.tool_input?.file_path)) {
  process.exit(0);
}

const sessionId = String(input.session_id || '').replace(/[^A-Za-z0-9_-]/g, '') || 'unknown';
const flag = join(STATE_DIR, `${sessionId}.done`);
if (existsSync(flag)) process.exit(0);

try {
  mkdirSync(STATE_DIR, { recursive: true });
  // 오래된 플래그 청소 — 세션 하나당 파일 하나라 안 지우면 계속 쌓인다
  const now = Date.now();
  for (const name of readdirSync(STATE_DIR)) {
    const p = join(STATE_DIR, name);
    if (now - statSync(p).mtimeMs > KEEP_MS) unlinkSync(p);
  }
  writeFileSync(flag, new Date().toISOString());
} catch {
  // 상태를 못 써도 한 번은 묻고 넘어간다
}

const common =
  '세 칸 중 하나로 말한다 — "판정: ○○급 · 이유 한 줄 · 예상 파일 N개". ' +
  '① 전구급 = 어디를 고칠지 알고 파일 1~2개 → 지금 설정(high) 그대로 진행해도 된다고 말한다. ' +
  '② 무거움 = 고칠 자리는 아는데 어렵거나 길다 → "/effort에서 xhigh로 바꾸세요"라고 알린다. ' +
  '③ 모름 = 어디부터 손댈지 모른다 → "/effort에서 울트라코드로 바꾸세요"라고 알린다. ' +
  'max는 쓰지 않는다 — 공식 문서가 "대부분 작업에서 품질 개선 없이 비용만 증가"라고 적고 있다. ' +
  'high가 Opus 5의 공식 기본값이라 ①이면 아무것도 안 바꿔도 된다. ' +
  '기윤이 "진행"이라고 하기 전에는 시작하지 않는다.';

const head = '[울트라코드 판정 게이트 · 세션 첫 1회 자동 거절] 이 거절은 오류가 아니라 규칙이다. ';
const tail =
  '판정을 말한 뒤 기윤이 "진행"이라고 하면 같은 도구를 다시 부른다 — 두 번째부터는 이 게이트가 통과시킨다.';

let reason;
if (tool === 'Workflow') {
  reason =
    `${head}조사를 돌리기 전에 판정부터 말했나? ${common} ` +
    '조사를 돌릴 때는 한 줄 더 붙인다 — "조사: 에이전트 N개를 어느 강도로"(낮음/보통/높음). ' +
    `09.15에 16개를 전부 같은 강도로 돌려 세션 한도를 먹었다. ${tail}`;
} else if (tool === 'Bash') {
  reason =
    `${head}이 Bash 명령은 파일을 쓰는 것으로 보인다. 도구 이름을 Edit/Write에서 Bash로 바꿔도 규칙은 같다. ` +
    `코드를 고치기 전에 판정부터 말했나? ${common} ${tail} ` +
    '읽기만 하는 명령이었다면 게이트 판정이 틀린 것이니, 기윤에게 그 명령을 알려 목록에 넣게 한다.';
} else {
  reason = `${head}코드를 고치기 전에 판정부터 말했나? ${common} ${tail}`;
}

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }),
);

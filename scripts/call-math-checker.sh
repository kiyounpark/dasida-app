#!/usr/bin/env bash
# math-checker를 gpt-5.6-sol로 부른다.
#
# 왜 스크립트냐 — `codex exec`에는 에이전트를 지정하는 플래그가 없다(2026.09.20 확인).
# 정의를 프롬프트 앞에 손으로 붙여야 하는데, 손으로 하면 빠뜨린다.
# 09.16에 깨진 원인이 정확히 그거였다: "금지 규칙은 이미 있었는데 프롬프트에 안 들어갔다".
#
# 정의는 `.codex/agents/math-checker.toml`에서 꺼내 쓴다. 그 파일은
# `scripts/sync-codex-agents.mjs`가 `.claude/agents/math-checker.md`와 맞춰 둔다.
# 즉 정의를 고치면 이 스크립트가 자동으로 새 정의를 쓴다.
#
#   scripts/call-math-checker.sh <프롬프트파일> [출력파일]
#
# 프롬프트파일에는 이번 검산 대상만 적는다 — 역할·규칙·답 형식은 정의가 준다.
# ⚠️ 정답·해설·정답 표시는 빼고 넣는다. 가린 채 풀어야 검산이지 확인 도장이 안 된다.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROMPT_FILE="${1:-}"
OUT_FILE="${2:-}"

if [[ -z "$PROMPT_FILE" || ! -f "$PROMPT_FILE" ]]; then
  echo "쓰는 법: $0 <프롬프트파일> [출력파일]" >&2
  exit 1
fi

DEF="$ROOT/.codex/agents/math-checker.toml"
if [[ ! -f "$DEF" ]]; then
  echo "정의가 없다: $DEF" >&2
  echo "scripts/sync-codex-agents.mjs 를 먼저 돌려라." >&2
  exit 1
fi

# 정의가 .md와 어긋나 있으면 멈춘다 — 낡은 규칙으로 도는 게 제일 나쁘다
if ! node "$ROOT/scripts/sync-codex-agents.mjs" --check >/dev/null 2>&1; then
  echo "⚠️ .codex 사본이 .claude/agents와 어긋나 있다." >&2
  echo "   node scripts/sync-codex-agents.mjs 로 맞춘 뒤 다시 돌려라." >&2
  exit 1
fi

# 기윤의 ~/.codex/config.toml은 [mcp_servers.notion]·[stitch]에 command가 없어
# CLI가 시작을 거부한다. auth만 복사한 임시 홈으로 우회한다.
TMP_HOME="$(mktemp -d)"
trap 'rm -rf "$TMP_HOME"' EXIT
chmod 700 "$TMP_HOME"
cp "$HOME/.codex/auth.json" "$TMP_HOME/auth.json"
cat > "$TMP_HOME/config.toml" <<'TOML'
model = "gpt-5.6-sol"
model_reasoning_effort = "high"
TOML

# 정의(developer_instructions)를 꺼낸다 — """ 사이
INSTRUCTIONS="$(python3 - "$DEF" <<'PY'
import re, sys, io
src = io.open(sys.argv[1], encoding='utf-8').read()
m = re.search(r'developer_instructions\s*=\s*"""\n?([\s\S]*?)"""', src)
if not m:
    sys.stderr.write('developer_instructions를 못 찾았다\n')
    sys.exit(1)
print(m.group(1).rstrip())
PY
)"

FULL_PROMPT="$(cat <<EOF
$INSTRUCTIONS

$(printf '%.0s─' {1..62})
여기까지가 네 역할 정의다. 아래가 이번 일감이다.
$(printf '%.0s─' {1..62})

$(cat "$PROMPT_FILE")
EOF
)"

echo "→ math-checker (gpt-5.6-sol · high) 부르는 중…" >&2
echo "  정의 $(wc -l <<<"$INSTRUCTIONS" | tr -d ' ')줄 + 일감 $(wc -l < "$PROMPT_FILE" | tr -d ' ')줄" >&2

if [[ -n "$OUT_FILE" ]]; then
  CODEX_HOME="$TMP_HOME" codex exec "$FULL_PROMPT" -C "$ROOT" -s read-only < /dev/null > "$OUT_FILE"
  echo "✅ $OUT_FILE" >&2
else
  CODEX_HOME="$TMP_HOME" codex exec "$FULL_PROMPT" -C "$ROOT" -s read-only < /dev/null
fi

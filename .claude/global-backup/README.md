# 전역 설정 백업 (`~/.claude/`)

이 폴더의 파일은 **여기서 실행되지 않는다.** `~/.claude/` 아래에 있는 진짜 파일의 **사본**이고, 맥이 죽었을 때 복원하려고 둔다.

프로젝트 훅은 `.claude/hooks/`에 따로 있다. 헷갈리지 말 것.

## 들어 있는 것

| 파일 | 원본 | 하는 일 |
|---|---|---|
| `ultracode-gate.mjs` | `~/.claude/hooks/ultracode-gate.mjs` | 울트라코드 판정 게이트. 세션당 한 번 첫 쓰기를 자동 거절하고 판정 3칸을 돌려준다 |

## 복원하는 법

```bash
mkdir -p ~/.claude/hooks
cp .claude/global-backup/ultracode-gate.mjs ~/.claude/hooks/
chmod +x ~/.claude/hooks/ultracode-gate.mjs
```

그리고 `~/.claude/settings.json`의 `hooks.PreToolUse`에 이 줄을 넣는다.

```json
{
  "matcher": "Workflow|Bash|Edit|MultiEdit|Write|NotebookEdit",
  "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/ultracode-gate.mjs" }]
}
```

판정 3칸 규칙(전구급 `high` / 무거움 `xhigh` / 모름 울트라코드)은 **스크립트 안에 그대로 들어 있다.** 그래서 이 사본 하나만 살아 있어도 규칙이 복원된다.

## 백업 안 하는 것

**`~/.claude/CLAUDE.md`는 여기 안 넣는다.** 개인 정보(생년월일·가족 관계 등)가 들어 있고 **이 저장소는 공개**다. 그 파일은 기윤이 따로 백업한다.

## 갱신 규칙

`~/.claude/hooks/ultracode-gate.mjs`를 고치면 **이 사본도 같이 고친다.** 안 그러면 사본이 조용히 낡는다.

```bash
cp ~/.claude/hooks/ultracode-gate.mjs .claude/global-backup/ultracode-gate.mjs
```

마지막 동기화: 2026-09-15

# DASIDA Notion 개발 기록 시스템 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 브레인스토밍 spec 저장 시 Notion 초안 자동 생성, 구현 완료 시 Notion 업데이트가 누락 없이 이루어지는 워크플로우를 구축한다.

**Architecture:** PostToolUse 훅이 `docs/superpowers/specs/*.md` 저장을 감지해 Claude에게 Notion 기록 지시를 컨텍스트로 주입한다. CLAUDE.md 종료 절차에 Notion 업데이트 단계를 명시해 구현 완료 시 Claude가 반드시 실행하도록 한다. SessionEnd 훅은 사용자 터미널에 최종 체크 메시지를 출력해 이중 보호한다.

**Tech Stack:** Node.js (ESM), Claude Code Hooks (PostToolUse / SessionEnd), Notion MCP (`notion-create-database`, `notion-create-pages`, `notion-update-page`, `notion-search`)

---

## File Map

| 파일 | 작업 |
|------|------|
| Notion 워크스페이스 | 데이터베이스 "DASIDA 개발 기록" 신규 생성 (MCP 호출) |
| `.claude/hooks/notion-spec-reminder.mjs` | 신규 생성 — PostToolUse spec 파일 감지 → Notion 초안 지시 출력 |
| `.claude/hooks/notion-session-end-check.mjs` | 신규 생성 — SessionEnd 시 사용자 터미널에 체크 메시지 출력 |
| `.claude/settings.json` | PostToolUse Write 매처 추가, SessionEnd 훅 추가 |
| `CLAUDE.md` | 종료 절차에 Notion 업데이트 단계 추가, Spec 저장 시 Notion 기록 지시 추가 |

---

### Task 1: Notion 데이터베이스 생성

**Background:**
- `notion-create-database`는 `schema` (SQL DDL)와 선택적 `parent`(page_id)를 받는다.
- `parent` 생략 시 워크스페이스 최상위 프라이빗 페이지로 생성된다.
- 반환값 `<data-source url="collection://...">` 에서 data_source_id를 추출해 Task 3 마이그레이션에 사용한다.

- [ ] **Step 1: `notion-create-database` 호출로 데이터베이스 생성**

```
tool: mcp__claude_ai_Notion__notion-create-database
parameters:
  title: "DASIDA 개발 기록"
  schema: >
    CREATE TABLE (
      "기능명" TITLE,
      "날짜" DATE,
      "상태" SELECT('기획중':blue, '구현완료':green),
      "카테고리" MULTI_SELECT('복습시스템':orange, '홈':blue, '인증':purple, '프로필':green, '진단':yellow, '기타':gray),
      "Spec" URL,
      "Plan" URL,
      "구현완료일" DATE
    )
```

- [ ] **Step 2: 반환된 data_source_id 메모**

반환된 마크다운에서 `<data-source url="collection://XXXX">` 형태의 ID를 찾아 메모한다. Task 3(마이그레이션)에서 사용.

- [ ] **Step 3: 테스트 페이지 생성으로 동작 확인**

```
tool: mcp__claude_ai_Notion__notion-create-pages
parameters:
  parent:
    type: "data_source_id"
    data_source_id: "<Step 2에서 메모한 ID>"
  pages:
    - properties:
        기능명: "테스트 페이지 (삭제 예정)"
        날짜: "2026-04-08"
        상태: "기획중"
        카테고리: "기타"
      content: "## 배경/목적\n테스트 페이지입니다."
```

- [ ] **Step 4: Notion 열어서 "DASIDA 개발 기록" 데이터베이스와 테스트 페이지 확인**

정상 생성됐으면 테스트 페이지 수동 삭제 후 다음 Task 진행.

---

### Task 2: `notion-spec-reminder.mjs` 작성

**Background:**
- `PostToolUse` 훅은 stdin으로 `{session_id, tool_name, tool_input, tool_response}` JSON을 받는다.
- `tool_input.file_path`가 `docs/superpowers/specs/`를 포함하고 `.md`로 끝나는 경우에만 동작.
- stdout에 `{hookSpecificOutput: {hookEventName, additionalContext}}` JSON 출력 → Claude 컨텍스트에 주입.

- [ ] **Step 1: `.claude/hooks/notion-spec-reminder.mjs` 작성**

```javascript
#!/usr/bin/env node

import fs from 'node:fs';

let input = {};
try {
  const raw = fs.readFileSync('/dev/stdin', 'utf8');
  input = JSON.parse(raw);
} catch {
  process.exit(0);
}

const toolName = String(input.tool_name ?? '');
const filePath = String(input.tool_input?.file_path ?? '');

if (toolName !== 'Write') process.exit(0);
if (!filePath.includes('docs/superpowers/specs/') || !filePath.endsWith('.md')) process.exit(0);

const lines = [
  `NOTION_REMINDER: spec 파일이 저장되었습니다 → ${filePath}`,
  '',
  '지금 바로 Notion "DASIDA 개발 기록" 데이터베이스에 초안 페이지를 생성하세요:',
  '1. notion-search 로 "DASIDA 개발 기록" 데이터베이스 ID 확인',
  '2. notion-create-pages 로 신규 페이지 생성:',
  '   - 기능명: spec 파일명에서 날짜 제외한 기능 이름 (한국어로)',
  '   - 날짜: 오늘 날짜',
  '   - 상태: 기획중',
  '   - 카테고리: spec 내용에서 판단',
  '   - Spec: 파일 경로 (커밋 후 GitHub permalink로 업데이트)',
  '   - 본문: ## 배경/목적 / ## 아키텍처 요약 / ## 변경 파일 섹션 포함',
];

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: lines.join('\n'),
    },
  })
);
```

- [ ] **Step 2: 실행 권한 부여**

```bash
chmod +x .claude/hooks/notion-spec-reminder.mjs
```

- [ ] **Step 3: 문법 검증**

```bash
node --check .claude/hooks/notion-spec-reminder.mjs
```

Expected: 아무 출력 없음 (오류 없음)

---

### Task 3: `notion-session-end-check.mjs` 작성

**Background:**
- `SessionEnd` 훅은 Claude 세션 종료 시 실행된다. Claude는 이미 종료 중이므로 이 훅 출력은 사용자 터미널에만 표시된다.
- 사용자에게 "Notion 업데이트 완료했나요?" 체크를 상기시키는 역할.
- stderr로 출력해 터미널에서 눈에 띄게 표시.

- [ ] **Step 1: `.claude/hooks/notion-session-end-check.mjs` 작성**

```javascript
#!/usr/bin/env node

process.stderr.write(
  '\n[Notion 체크] "DASIDA 개발 기록" 업데이트 완료됐나요?\n' +
  '  - 새 기능 기획: 초안 페이지 생성 (상태: 기획중)\n' +
  '  - 구현 완료:   상태 → 구현완료, 구현완료일 채우기, Spec GitHub permalink 업데이트\n\n'
);
```

- [ ] **Step 2: 실행 권한 부여**

```bash
chmod +x .claude/hooks/notion-session-end-check.mjs
```

- [ ] **Step 3: 문법 검증**

```bash
node --check .claude/hooks/notion-session-end-check.mjs
```

Expected: 아무 출력 없음 (오류 없음)

- [ ] **Step 4: 커밋**

```bash
git add .claude/hooks/notion-spec-reminder.mjs .claude/hooks/notion-session-end-check.mjs
git commit -m "feat: Notion 개발 기록 훅 스크립트 추가 (spec 감지 + 세션 종료 체크)"
```

---

### Task 4: `.claude/settings.json` 업데이트

**Background:**
- 기존 `PostToolUse` 항목 없음 → 새로 추가.
- 기존 `SessionEnd`에 `clear-expo-skill-state.mjs` 하나 있음 → 배열에 항목 추가.
- `matcher: "Write"`는 Write 도구에만 훅을 실행하도록 필터링.

- [ ] **Step 1: `settings.json` 수정**

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR/.claude/hooks/select-expo-skill.mjs\"",
            "timeout": 5
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Read",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR/.claude/hooks/check-expo-skill-before-tools.mjs\"",
            "timeout": 5
          }
        ]
      },
      {
        "matcher": "Edit|MultiEdit|Write|Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR/.claude/hooks/check-expo-skill-before-tools.mjs\"",
            "timeout": 5
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR/.claude/hooks/notion-spec-reminder.mjs\"",
            "timeout": 5
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR/.claude/hooks/clear-expo-skill-state.mjs\"",
            "timeout": 5
          },
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR/.claude/hooks/notion-session-end-check.mjs\"",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 2: JSON 유효성 확인**

```bash
node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: 커밋**

```bash
git add .claude/settings.json
git commit -m "feat: settings.json에 Notion PostToolUse/SessionEnd 훅 추가"
```

---

### Task 5: `CLAUDE.md` 업데이트

**Background:**
- 종료 절차(8번)에 Notion 업데이트 단계를 추가한다.
- 2번 기본 역할에 "spec 저장 직후 Notion 초안 생성" 지시를 추가한다.
- PostToolUse 훅이 리마인더를 주지만, CLAUDE.md에도 명시해 이중 보호한다.

- [ ] **Step 1: CLAUDE.md 수정 — 기본 역할(2번)에 Notion 지시 추가**

`2. 기본 역할` 항목 끝에 아래 줄 추가:

```
- 브레인스토밍 spec 파일(`docs/superpowers/specs/*.md`) 저장 직후, Notion "DASIDA 개발 기록" 데이터베이스에 초안 페이지를 생성한다 (상태: 기획중). PostToolUse 훅이 리마인더를 출력하므로 그 즉시 실행한다.
```

- [ ] **Step 2: CLAUDE.md 수정 — 종료 절차(8번)에 Notion 업데이트 단계 추가**

`8. 종료 절차:` 항목을 아래로 교체:

```markdown
8. 종료 절차:
- `pre-commit`은 사용하지 않음
- 가능한 경우 `git commit -> git push origin <현재 브랜치> -> npm run log:commit`
- 개발 기록은 `docs/PROGRESS.md` 기준으로 남김
- **Notion 업데이트 (필수)**: 이번 세션에서 기능을 구현 완료했다면, Notion "DASIDA 개발 기록"에서 해당 페이지를 업데이트한다:
  1. `notion-update-page`로 상태 → `구현완료`, 구현완료일 → 오늘 날짜
  2. Spec/Plan 필드를 GitHub permalink로 업데이트 (커밋 해시 포함 URL)
  3. 본문 `## 완료 메모` 섹션에 특이사항 추가 (없으면 생략)
```

- [ ] **Step 3: 커밋**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md 종료 절차에 Notion 업데이트 단계 추가"
```

---

### Task 6: 기존 Spec 파일 Notion 마이그레이션

**Background:**
- `docs/superpowers/specs/`에 기존 14개 spec 파일이 있다.
- 각 파일의 날짜, 기능명, 내용을 읽어 Notion 페이지를 일괄 생성한다.
- plan 파일이 있는 것은 `Plan` URL도 채운다. 이미 구현 완료된 기능은 상태를 `구현완료`로 설정한다.
- `plans/` 파일과 짝이 맞는 것들은 구현완료, 없는 것은 기획중으로 처리한다.

**기존 Spec 파일 목록 및 상태:**

| spec 파일 | 상태 | 카테고리 |
|-----------|------|----------|
| 2026-03-29-exam-pdf-ocr-design.md | 기획중 | 기타 |
| 2026-04-01-exam-solve-screen-redesign-design.md | 구현완료 | 홈 |
| 2026-04-01-mock-exam-graduation-design.md | 구현완료 | 홈 |
| 2026-04-01-onboarding-screen-design.md | 구현완료 | 홈 |
| 2026-04-02-journey-exam-lock-design.md | 구현완료 | 홈 |
| 2026-04-03-ebbinghaus-review-design.md | 구현완료 | 복습시스템 |
| 2026-04-03-feedback-screen-simplification-design.md | 구현완료 | 홈 |
| 2026-04-03-grade-track-diagnostic-design.md | 구현완료 | 진단 |
| 2026-04-03-playwright-smoke-test-design.md | 구현완료 | 기타 |
| 2026-04-05-review-dev-testing-design.md | 구현완료 | 복습시스템 |
| 2026-04-06-firebase-emulator-design.md | 구현완료 | 기타 |
| 2026-04-06-hide-journey-board-after-onboarding-design.md | 구현완료 | 홈 |
| 2026-04-06-home-weakness-section-design.md | 구현완료 | 복습시스템 |
| 2026-04-06-no-review-day-card-design.md | 구현완료 | 복습시스템 |
| 2026-04-07-account-deletion-design.md | 구현완료 | 프로필 |
| 2026-04-07-list-review-tasks-design.md | 구현완료 | 복습시스템 |
| 2026-04-07-notion-dev-log-design.md | 기획중→구현완료(이 작업) | 기타 |
| 2026-04-07-weakness-accuracy-chart-design.md | 구현완료 | 복습시스템 |

- [ ] **Step 1: 각 spec 파일을 읽어 배경/목적, 아키텍처 요약, 변경 파일 추출**

각 spec 파일을 Read로 읽은 뒤, `notion-create-pages`를 호출해 일괄 등록한다. 한 번에 최대 10개씩 배치로 나눠 호출한다.

**배치 1 (2026-03-29 ~ 2026-04-03, 8개):**

```
tool: mcp__claude_ai_Notion__notion-create-pages
parameters:
  parent:
    type: "data_source_id"
    data_source_id: "<Task 1 Step 2에서 메모한 ID>"
  pages:
    - properties:
        기능명: "수능 기출 PDF OCR 추출"
        "date:날짜:start": "2026-03-29"
        "date:날짜:is_datetime": 0
        상태: "기획중"
        카테고리: "기타"
        Spec: "https://github.com/[repo]/blob/main/docs/superpowers/specs/2026-03-29-exam-pdf-ocr-design.md"
      content: |
        ## 배경/목적
        (spec 파일에서 추출)

        ## 아키텍처 요약
        (spec 파일에서 추출)

        ## 변경 파일
        (spec 파일에서 추출)
    # ... 나머지 7개도 같은 구조로
```

> **주의**: GitHub repo 경로는 실제 저장소 URL로 대체할 것. `git remote get-url origin`으로 확인 가능.

- [ ] **Step 2: `git remote get-url origin` 실행해서 실제 GitHub URL 확인 후 링크 구성**

```bash
git remote get-url origin
```

- [ ] **Step 3: 배치 1 (8개) 등록**

각 spec 파일을 Read로 읽은 뒤 notion-create-pages로 등록.

- [ ] **Step 4: 배치 2 (나머지 10개) 등록**

같은 방식으로 나머지 파일 등록.

- [ ] **Step 5: Notion에서 데이터베이스 열어 전체 등록 확인**

`notion-search`로 "DASIDA 개발 기록" 검색 → 페이지 수 확인.

---

### Task 7: 통합 검증

- [ ] **Step 1: Claude Code 세션 재시작**

훅 변경은 새 세션에서 적용되므로, 현재 세션 종료 후 재시작.

- [ ] **Step 2: 더미 spec 파일 작성으로 PostToolUse 훅 동작 확인**

```
Write 도구로 docs/superpowers/specs/2026-04-08-test-notion-hook-design.md 저장
→ Claude 응답에 "NOTION_REMINDER" 컨텍스트가 보이는지 확인
→ Claude가 Notion 페이지 생성을 시도하는지 확인
```

더미 파일은 확인 후 삭제:

```bash
rm docs/superpowers/specs/2026-04-08-test-notion-hook-design.md
```

- [ ] **Step 3: SessionEnd 훅 동작 확인**

세션 종료 시 터미널에 `[Notion 체크]` 메시지가 출력되는지 확인.

- [ ] **Step 4: 종료 절차 검증**

CLAUDE.md의 Notion 업데이트 단계를 따라 이번 구현(`2026-04-08-notion-dev-log`)의 Notion 페이지를 구현완료로 업데이트:

```
tool: mcp__claude_ai_Notion__notion-update-page
parameters:
  page_id: "<notion-dev-log 페이지 ID>"
  command: "update_properties"
  properties:
    상태: "구현완료"
    "date:구현완료일:start": "2026-04-08"
    "date:구현완료일:is_datetime": 0
  content_updates: []
```

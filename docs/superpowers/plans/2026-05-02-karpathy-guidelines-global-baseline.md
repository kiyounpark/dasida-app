# Karpathy Guidelines 글로벌 베이스라인 적용 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Karpathy 4원칙(`forrestchang/andrej-karpathy-skills`)을 기윤님 글로벌 `~/.claude/CLAUDE.md`에 import 형태로 추가해, 모든 프로젝트의 코딩 행동 베이스라인으로 깔리게 한다.

**Architecture:** 원본 CLAUDE.md를 `~/.claude/karpathy-guidelines.md`로 verbatim 복사(헤더 4줄만 추가) 후, `~/.claude/CLAUDE.md`에 `@karpathy-guidelines.md` import 한 줄 추가. DASIDA repo 내부엔 spec 문서만 추가하고 코드 변경은 없음.

**Tech Stack:** 셸(`curl`), Read/Write/Edit 도구, git.

**Spec:** [docs/superpowers/specs/2026-05-02-karpathy-guidelines-global-baseline-design.md](../specs/2026-05-02-karpathy-guidelines-global-baseline-design.md)

---

## File Structure

작업 대상 파일 (변경 범위 외과적):

| 파일 | 동작 | 책임 |
|------|------|------|
| `~/.claude/karpathy-guidelines.md` | **신규** | Karpathy 4원칙 verbatim + 출처/업데이트 헤더 |
| `~/.claude/CLAUDE.md` | **수정** | `@karpathy-guidelines.md` import 한 줄 추가 |
| `docs/superpowers/plans/2026-05-02-karpathy-guidelines-global-baseline.md` | **신규** | 이 plan 파일 (DASIDA repo 내) |

---

## Task 1: 원본 백업 및 다운로드 검증

**Files:**
- Read: `~/.claude/CLAUDE.md` (기존 글로벌 instruction 백업 확인)
- Test: `curl -sI` 응답 코드 확인

- [ ] **Step 1: 기존 글로벌 CLAUDE.md 내용 확인 (백업 차원)**

Read 도구로 `/Users/baggiyun/.claude/CLAUDE.md`를 읽어 현재 내용을 확인하고 메모한다. 예상 내용:

```markdown
@RTK.md
```

기존 내용이 위와 다르면 (예: 추가 import가 더 있다면) 다음 단계의 수정 방식을 조정한다.

- [ ] **Step 2: 원본 raw URL 접근성 검증**

Run:
```bash
curl -sI https://raw.githubusercontent.com/forrestchang/andrej-karpathy-skills/main/CLAUDE.md | head -1
```

Expected: `HTTP/2 200` (또는 `HTTP/1.1 200 OK`)

200 아니면 STOP — repo가 옮겨졌거나 파일명이 바뀐 것. 사용자에게 보고하고 결정 받기.

- [ ] **Step 3: 충돌 파일 체크 (덮어쓰기 방지)**

Run:
```bash
test -e ~/.claude/karpathy-guidelines.md && echo "EXISTS" || echo "NEW"
```

Expected: `NEW`

`EXISTS` 반환 시 STOP — 같은 이름 파일이 이미 있음. Task 2의 heredoc은 덮어쓰므로 절대 그대로 진행하지 말 것. 사용자에게 보고:
- 기존 파일 내용 확인 (`cat ~/.claude/karpathy-guidelines.md`)
- 동일 작업 이전 흔적이면 `mv ... .bak`로 백업 후 진행
- 무관한 파일이면 다른 파일명 결정 (예: `karpathy-guidelines-v2.md`)

---

## Task 2: `~/.claude/karpathy-guidelines.md` 생성

**Files:**
- Create: `/Users/baggiyun/.claude/karpathy-guidelines.md`

- [ ] **Step 1: 헤더 작성 (heredoc으로 파일 생성)**

Run:
```bash
cat > ~/.claude/karpathy-guidelines.md <<'HEADER_EOF'
# Karpathy Guidelines

> 원본: https://github.com/forrestchang/andrej-karpathy-skills/blob/main/CLAUDE.md
> 업데이트: `curl -o ~/.claude/karpathy-guidelines.md https://raw.githubusercontent.com/forrestchang/andrej-karpathy-skills/main/CLAUDE.md` 실행 후 이 헤더(이 4줄)를 다시 추가

---

HEADER_EOF
```

Expected: 명령어 무출력 (성공). 헤더만 들어간 파일 생성됨.

- [ ] **Step 2: 원본 내용을 파일 끝에 append**

Run:
```bash
curl -sf https://raw.githubusercontent.com/forrestchang/andrej-karpathy-skills/main/CLAUDE.md >> ~/.claude/karpathy-guidelines.md
```

Expected: 명령어 무출력 (성공). HTTP 에러 시 `-f` 플래그 덕에 비-0 exit. 그 경우 STOP.

- [ ] **Step 3: 파일 존재 및 내용 검증**

Run:
```bash
test -f ~/.claude/karpathy-guidelines.md && echo "OK" || echo "MISSING"
head -8 ~/.claude/karpathy-guidelines.md
echo "---"
wc -l ~/.claude/karpathy-guidelines.md
```

Expected:
- `OK` 출력
- 첫 줄: `# Karpathy Guidelines`
- 5번째 줄: `---` (구분선)
- 8번째 줄 즈음: 원본 시작 (예: `# CLAUDE.md`)
- 라인 수: 대략 20줄 이상 (원본은 짧지만 의미 있는 줄이 들어 있음)

내용이 비정상이면 — 빈 파일이거나 헤더만 있다면 — Task 2 Step 1부터 재시도. 절대 그대로 두지 말 것 (다음 Task에서 import해도 빈 내용 로드됨).

---

## Task 3: `~/.claude/CLAUDE.md`에 import 추가

**Files:**
- Modify: `/Users/baggiyun/.claude/CLAUDE.md` (1줄 추가)

- [ ] **Step 1: 현재 내용 확인 (Task 1 Step 1 결과 재사용)**

Read `/Users/baggiyun/.claude/CLAUDE.md`. Task 1에서 본 내용과 동일해야 함 (그 사이 변경 없음 가정).

- [ ] **Step 2: import 라인 추가 (Edit 도구 사용)**

Edit 도구로:
- `old_string`: `@RTK.md`
- `new_string`: `@RTK.md\n@karpathy-guidelines.md`

(만약 Task 1 Step 1에서 다른 내용이 더 있었다면 — 예를 들어 빈 줄이나 추가 텍스트 — 그 형식을 보존하면서 마지막 import 다음에 `@karpathy-guidelines.md`만 추가)

- [ ] **Step 3: 변경 검증**

Run:
```bash
cat ~/.claude/CLAUDE.md
```

Expected:
```
@RTK.md
@karpathy-guidelines.md
```

(또는 기존 추가 내용 + 마지막에 `@karpathy-guidelines.md`)

---

## Task 4: DASIDA repo 정리 (spec & plan 커밋)

**Files:**
- spec: `docs/superpowers/specs/2026-05-02-karpathy-guidelines-global-baseline-design.md` (이미 작성됨)
- plan: `docs/superpowers/plans/2026-05-02-karpathy-guidelines-global-baseline.md` (이 파일)

- [ ] **Step 1: git status 확인**

Run:
```bash
git status
```

Expected: untracked 파일 목록에 spec과 plan 두 파일이 보여야 함. 그 외 변경은 없어야 함 (Karpathy "Surgical Changes" 원칙).

만약 다른 변경이 있다면 — 그건 이 작업과 무관한 것. 사용자에게 보고하고 결정 받기 (별도 커밋으로 분리 등).

- [ ] **Step 2: 두 파일 스테이징**

Run:
```bash
git add docs/superpowers/specs/2026-05-02-karpathy-guidelines-global-baseline-design.md docs/superpowers/plans/2026-05-02-karpathy-guidelines-global-baseline.md
```

- [ ] **Step 3: 커밋**

Run:
```bash
git commit -m "$(cat <<'EOF'
docs: Karpathy 가이드라인 글로벌 베이스라인 적용 spec & plan

원본 forrestchang/andrej-karpathy-skills의 4원칙을 글로벌
~/.claude/CLAUDE.md에 import해 모든 프로젝트의 코딩 행동
베이스라인으로 적용한다. 구현은 글로벌 셋업 변경(DASIDA repo
외부)이며, repo 내엔 추적용 spec/plan 문서만 추가.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: 커밋 성공 메시지. pre-commit 훅 없으므로 (DASIDA 룰) 그냥 통과.

- [ ] **Step 4: 커밋 검증**

Run:
```bash
git log --oneline -1
git status
```

Expected:
- 최근 커밋이 위 메시지로 보임
- working tree clean

---

## Task 5: 동작 검증 (사용자 수동)

이 작업은 새 Claude Code 세션을 시작해야 글로벌 CLAUDE.md 변경이 반영되므로, **자동화 불가**. 사용자에게 검증 절차 안내.

- [ ] **Step 1: 사용자에게 검증 가이드 전달**

다음 메시지를 사용자에게 출력:

```
글로벌 셋업 적용 완료. 검증을 위해:

1. 이 Claude Code 세션을 종료하고 새 세션을 연다 (또는 다른 프로젝트에서 새 세션)
2. 새 세션에서 임의의 간단한 코딩 작업을 시킨다 (예: "이 함수에 입력 검증 추가해줘")
3. Claude의 첫 응답에서 다음 패턴이 나타나는지 본다:
   - 가정을 명시하거나 명확화 질문을 던지는가?
   - 무관한 코드 리팩터링을 자제하는가?
   - "이렇게 변경하면 OK인가?"식 검증 가능 목표를 제시하는가?

위 패턴이 보이면 4원칙이 작동 중. 안 보이면 ~/.claude/CLAUDE.md를 직접 cat해서 import가 제대로 들어가 있는지 재확인.
```

- [ ] **Step 2: DASIDA 종료 알림 (선택)**

DASIDA CLAUDE.md 룰에 따라 — 이번 작업은 글로벌 셋업 변경이라 "영향 범위가 좁은 단순 수정"으로 분류 가능하지만, 명시적으로 알림을 보내고 싶다면:

Run:
```bash
npm run notify:done -- "Karpathy 가이드라인 글로벌 베이스라인 적용 완료 (spec/plan 커밋 + ~/.claude 셋업 변경)"
```

(사용자 판단에 맡김. 작은 변경이라 생략 가능.)

---

## Self-Review Checklist (작성 후)

- **Spec 커버리지**: spec의 모든 변경 내용이 task에 매핑됨 ✅
  - karpathy-guidelines.md 신규 → Task 2
  - CLAUDE.md import 추가 → Task 3
  - 검증 → Task 5
- **Placeholder**: TBD/TODO 없음 ✅
- **Type 일관성**: 파일 경로/명령어 모두 일관 ✅
- **외과적 변경**: 변경 파일 정확히 3개 (글로벌 2 + repo spec/plan), 그 외 손대지 않음 ✅

---

## Notion 등록 (참고)

DASIDA CLAUDE.md 룰: spec 저장 직후 Notion "DASIDA 개발 기록" DB에 초안 페이지 생성. 단 이 작업은 **외부 시스템 publish**라 권한 시스템이 hook reminder만으로는 차단함. 사용자가 명시적으로 "Notion에 spec 페이지 만들어줘"라고 지시 시에만 진행.

이 작업은 글로벌 셋업 변경이라 DASIDA 개발 기록 DB(주로 DASIDA 기능 추적)와 결이 약간 다르므로, **Notion 등록은 생략 권장**. 사용자 결정.

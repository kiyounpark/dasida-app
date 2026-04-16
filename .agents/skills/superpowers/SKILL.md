---
name: superpowers
description: DASIDA 슈퍼파워스 스킬. 공식 obra/superpowers 워크플로우를 참조하여 브레인스토밍, 계획 작성, 구현 실행을 지원합니다.
---

# DASIDA Superpowers

이 스킬은 공식 [obra/superpowers](https://github.com/obra/superpowers) 플러그인을 기반으로 합니다.

**사용 전 필수**: 아래 공식 스킬 원본을 WebFetch로 읽어 최신 워크플로우를 따르세요.

## 공식 스킬 원본 URL

| 서브스킬 | 공식 원본 URL |
|----------|-------------|
| using-superpowers (진입점) | `https://raw.githubusercontent.com/obra/superpowers/main/skills/using-superpowers/SKILL.md` |
| brainstorming | `https://raw.githubusercontent.com/obra/superpowers/main/skills/brainstorming/SKILL.md` |
| writing-plans | `https://raw.githubusercontent.com/obra/superpowers/main/skills/writing-plans/SKILL.md` |
| executing-plans | `https://raw.githubusercontent.com/obra/superpowers/main/skills/executing-plans/SKILL.md` |
| subagent-driven-development | `https://raw.githubusercontent.com/obra/superpowers/main/skills/subagent-driven-development/SKILL.md` |

## 작업 진입 순서

1. 먼저 `using-superpowers` URL을 WebFetch해서 전체 흐름을 파악한다
2. 요청에 맞는 서브스킬 URL을 WebFetch해서 해당 워크플로우를 따른다
3. brainstorming 결과는 `docs/superpowers/specs/YYYY-MM-DD-<slug>-design.md`에 저장
4. 구현 계획은 `docs/superpowers/plans/YYYY-MM-DD-<slug>.md`에 저장

## 트리거 매핑

| 요청 | 서브스킬 |
|------|----------|
| 새 기능 아이디어, 스펙 작성 | `brainstorming` → `writing-plans` |
| 계획 파일 실행 | `executing-plans` |
| 병렬 구현 | `subagent-driven-development` |

## DASIDA 프로젝트 규칙

- 스펙/플랜 파일 저장 후 Notion "DASIDA 개발 기록"에 초안 페이지 생성 (상태: 기획중)
- PostToolUse 훅 리마인더가 뜨면 즉시 실행
- 파일명: `YYYY-MM-DD-<slug>.md` (오늘 날짜 기준, 영어 kebab-case)

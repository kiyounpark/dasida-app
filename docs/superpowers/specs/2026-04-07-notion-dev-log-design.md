# DASIDA Notion 개발 기록 시스템 — Design

## 목적

브레인스토밍(spec 완성)과 구현 완료(커밋) 두 시점에 자동으로 Notion에 기록을 남겨, 나중에 "내가 언제 어떤 기능을 왜 만들었는지"를 빠르게 파악할 수 있게 한다.

---

## Notion 데이터베이스 구조

**데이터베이스명:** `DASIDA 개발 기록`

| 속성 | 타입 | 설명 |
|------|------|------|
| 기능명 | Title | 예: "복습 첫 시도 정답률 기록" |
| 날짜 | Date | spec 작성일 |
| 상태 | Select | `기획중` / `구현완료` |
| 카테고리 | Multi-select | 복습시스템 / 홈 / 인증 / 프로필 / 진단 / 기타 |
| Spec | URL | GitHub spec 파일 링크 (초안 시점엔 파일 경로, 커밋 후 permalink로 업데이트) |
| Plan | URL | GitHub plan 파일 링크 |
| 구현완료일 | Date | 커밋 완료 시 채워짐 |

### 각 페이지 본문 구성

```
## 배경/목적
spec에서 핵심 2-3줄 요약

## 아키텍처 요약
plan의 Architecture 섹션 1-2줄

## 변경 파일
plan의 File Map 그대로

## 완료 메모
구현 완료 시 추가 — 특이사항, 주의점 등
```

---

## 자동화 워크플로우

### Spec 저장 시 (기획 단계)

1. 브레인스토밍 완료 → `docs/superpowers/specs/*.md` 파일 저장
2. `PostToolUse` 훅 감지 → Claude에게 리마인더 출력
3. Claude → Notion MCP로 페이지 생성 (상태: `기획중`)

### 구현 완료 시

1. `git commit + push` 완료
2. CLAUDE.md 종료 절차의 Notion 업데이트 단계 실행
3. `SessionEnd` 훅 → "Notion 업데이트 완료했나요?" 이중 체크
4. Claude → Notion MCP로 페이지 업데이트 (상태: `구현완료`, 구현완료일 채움)

---

## 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `CLAUDE.md` | 종료 절차에 Notion 업데이트 단계 추가 |
| `.claude/settings.json` | PostToolUse 훅 (spec 파일 감지), SessionEnd 훅 (완료 체크) 추가 |
| `.claude/hooks/notion-reminder.mjs` | 훅 스크립트 신규 생성 |

---

## 설계 결정 근거

- **B안 선택 (CLAUDE.md + 훅 조합)**: 매번 직접 요청하지 않아도 자동으로 기록되도록 하기 위해
- **상세도 B (배경+변경파일)**: spec 전체 복붙은 중복 관리 부담, 제목만은 컨텍스트 부족 — 중간이 적절
- **GitHub 링크**: 로컬 경로 대신 GitHub permalink 사용 — 어디서든 접근 가능하고 영구적
- **PostToolUse 훅**: 쉘 훅이 Notion MCP를 직접 호출할 수 없으므로, Claude에게 텍스트 리마인더를 출력해 Claude가 MCP를 호출하도록 유도

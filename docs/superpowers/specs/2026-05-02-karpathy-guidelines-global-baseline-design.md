# Karpathy 가이드라인 글로벌 베이스라인 설계

> 날짜: 2026-05-02
> 범위: `~/.claude/CLAUDE.md`, `~/.claude/karpathy-guidelines.md` — 글로벌 셋업 변경 (DASIDA repo 외부)

---

## 문제

기윤님 글로벌 `~/.claude/CLAUDE.md`는 현재 거의 비어있고 (`@RTK.md` 한 줄), 모든 프로젝트에 적용되는 *코딩 행동 베이스라인*이 부재함. 결과적으로:

- 새 프로젝트로 옮길 때마다 기본 코딩 규율(가정 명시, 단순성, 외과적 변경, 목표 검증)이 사라짐
- DASIDA repo는 자체 CLAUDE.md로 행동 룰을 보강하지만, 글로벌엔 없음
- LLM 코딩 함정(과도한 리팩터링, 추측 기반 변경, 과잉 추상화)이 프로젝트별로 반복됨

[forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills)의 4원칙이 정확히 이 갭을 메우는 가이드라인.

---

## 설계 방향

**옵션 A 채택 — 글로벌 CLAUDE.md에 Karpathy 가이드라인을 import**

검토한 대안:
- **B (플러그인 설치)**: 트리거 기반 → 베이스라인 보장 안 됨. 비채택.
- **B+A (둘 다)**: 중복, 동기화 부담. 60줄짜리 가이드라인엔 오버킬.
- **C (DASIDA 프로젝트만)**: 다른 프로젝트엔 적용 안 됨 — 가장 가치 있는 곳(낯선 코드베이스)에서 못 막음.

A의 핵심:
- 원본 `CLAUDE.md` 60줄을 **verbatim** 복사 (영어 그대로, 번역 없음)
- 별도 파일(`~/.claude/karpathy-guidelines.md`)로 두고 `~/.claude/CLAUDE.md`에서 `@karpathy-guidelines.md` import
- 출처/업데이트 방법 한 줄을 파일 상단에 추가

---

## 변경 내용

### 신규: `~/.claude/karpathy-guidelines.md`

원본 `forrestchang/andrej-karpathy-skills/CLAUDE.md` 내용을 그대로 복사하되, 맨 위에 출처 헤더 추가:

```markdown
# Karpathy Guidelines

> 원본: https://github.com/forrestchang/andrej-karpathy-skills/blob/main/CLAUDE.md
> 업데이트: `curl -o ~/.claude/karpathy-guidelines.md <원본 raw URL>` 실행 후 이 헤더(이 4줄)를 다시 추가

---

[원본 CLAUDE.md 내용 verbatim — 약 60줄, 4원칙]
```

### 수정: `~/.claude/CLAUDE.md`

기존:
```markdown
@RTK.md
```

변경 후:
```markdown
@RTK.md
@karpathy-guidelines.md
```

---

## 작용 방식 (참고)

세션 시작 시 instruction 로드 순서:

```
1. ~/.claude/CLAUDE.md (= RTK + Karpathy 4원칙)   ← 글로벌, 모든 세션
2. <프로젝트>/CLAUDE.md                            ← 해당 repo에서만
3. 사용자 메시지 명시 지시                          ← 세션 한정
```

3 → 2 → 1 우선순위. 충돌 시 더 구체적인 게 이김. 충돌 없으면 누적.

DASIDA repo에서는 Karpathy 4원칙 + DASIDA 자체 룰(Notion 연동, Expo 검증, superpowers 워크플로우)이 함께 적용됨. 둘은 레이어가 달라(Karpathy=*행동*, DASIDA/superpowers=*프로세스*) 충돌 거의 없음.

> **단서**: Karpathy §2(Simplicity First "시킨 것 외 추가 금지")와 §3(Surgical Changes "무관한 리팩터링 금지")는 *사용자 요청 범위 내*에서 적용된다. 사용자가 명시적으로 `superpowers:brainstorming`이나 `plan-eng-review` 같은 *범위 확장형 워크플로우*를 호출하면, 그 워크플로우가 수행하는 범위 탐색·대안 제시·spec 확장은 그 자체가 user request 영역이므로 §2/§3와 마찰하지 않는다. Karpathy 원칙은 사용자가 *시키지 않은* 즉흥적 확장을 막는 것이지, 사용자가 *호출한* 사고 도구를 막는 게 아님.

---

## 변경 범위

- 외부(글로벌) 파일 2개:
  - 신규: `~/.claude/karpathy-guidelines.md`
  - 수정: `~/.claude/CLAUDE.md` (1줄 추가)
- DASIDA repo 내부 파일: spec 문서 1개 (이 파일)만 추가, 나머지 변경 없음

---

## 검증

1. 새 Claude Code 세션 시작 후, 임의 프로젝트(또는 DASIDA)에서 동작 확인
2. `~/.claude/CLAUDE.md`가 import한 두 파일이 모두 시스템 프롬프트에 반영되는지 확인 (간단한 코드 작업을 시켜보고, "가정 명시" / "최소 변경" 같은 카르파티 패턴이 발현되는지)
3. 충돌 없는지 확인: DASIDA repo에서 평소대로 작업해보고 superpowers/Notion/Expo 룰이 깨지지 않는지

---

## 결정 이력

- **A (글로벌 import)** vs B (플러그인) vs C (프로젝트만): A 채택 — 베이스라인 보장 + 60줄짜리에 플러그인 메커니즘 오버킬 회피
- **영어 원본 그대로** vs 한국어 번역: 영어 채택 — 원작자 의도 보존, `curl` 한 줄로 업데이트, 사람이 자주 들여다보는 파일이 아님

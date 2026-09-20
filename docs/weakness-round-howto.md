# 한 판 어떻게 도나 — 약점 빈 칸 채우기

> 왜 문서가 아니라 **스크립트**가 앞에 있냐 — 2026.09.16에 깨진 원인이
> "금지 규칙은 이미 있었는데 프롬프트에 안 들어갔다"였다. 문서로 두면 또 빠뜨린다.
>
> 설계 근거는 `docs/weakness-routine-v2-2026-09-20.md`. 여기는 **손 쓰는 법**만 적는다.

## 배치 🔒 (2026.09.20 · 세 모델 일치)

| 역할 | 누구 | 어떻게 부르나 |
|---|---|---|
| 0단계 | 코드 | `tsx scripts/weakness-stage0.ts …` |
| 만들기 | `weakness-author` · **Opus** | Agent 툴 · `subagent_type: weakness-author` |
| 검산 | `math-checker` · **gpt-5.6-sol `high`** | `scripts/call-math-checker.sh` |
| 린트 | `target-student` · **Haiku** | Agent 툴 · `subagent_type: target-student` |

고쳐쓰기는 **1회**. `xhigh`는 안 쓴다.

⚠️ **검산만 부르는 법이 다르다.** `codex exec`에는 에이전트를 지정하는 플래그가 없다
(2026.09.20에 옵션 전부 확인). 그래서 스크립트가 `.codex/agents/math-checker.toml`의
지시문을 프롬프트 앞에 붙여 준다. **손으로 codex를 부르면 정의가 안 붙는다** — 그냥 GPT가 된다.

## 순서

### 0. 칸을 고른다

```bash
tsx scripts/weakness-stage0.ts --methods        # 풀이법 목록과 빈 칸 수
tsx scripts/weakness-stage0.ts sequence         # 그 풀이법 6칸 상태 + 기존 재료
```

- 🚫 **차 있음** → 그 칸은 안 연다. 하나 더 넣으면 `primaryWeaknessId`가 null이 된다
- 🟨 **두루뭉술만** → **열 수 있다.** 구체적인 걸 넣으면 두루뭉술한 걸 밀어낸다
- ⬜ **빈 칸** → 열 수 있다

출력 전문을 그대로 다음 단계에 넘긴다 (`weakness-author` 「받는 것」 2·3번).

### 1. 만들기 — Opus

Agent 툴, `subagent_type: weakness-author`, `model: opus`.

프롬프트에 넣을 것:
- 대상 칸 (풀이법 id × 실수유형 id)
- **0단계 출력 전문**
- 실수 유형 구분 기준 — `docs/superpowers/specs/2026-07-25-photo-flow-error-pointing-design.md:34-39`
- 보충 흐름 견본 하나 (`data/remedial-flows/` 아무 파일)

역할·금지·답 형식은 **안 적는다.** 정의가 준다.

### 2. 0단계 세트 검사

```bash
tsx scripts/weakness-stage0.ts --set <세트.json>
```

세트 json: `weaknessId` · `methodId` · `labelKo` · `desc` · `tip` · `choiceText`

C(문장 중복) · D(린트) · E(착지 완결성 11곳)를 본다. 빠진 곳이 있으면 종료코드 1.

### 3. 검산 — sol

```bash
scripts/call-math-checker.sh <일감.txt> [출력.txt]
```

일감에는 **이번 검산 대상만** 적는다.

⚠️ **정답을 알려주는 건 빼고 넣는다** — 확인 문제의 `answerIndex`·`explanation`,
`thinkingSteps` 선택지의 정답 표시. 가린 채 풀어야 검산이지 확인 도장이 안 된다.

판정이 셋으로 온다 — `깨짐` / `통과` / `통과 + 권고`.

### 4. 린트 — Haiku

Agent 툴, `subagent_type: target-student`, `model: haiku`.

**탈락 권한이 없다** (2026.09.19). 개선안과 가설만 받는다.
이 답만으로 후보를 떨어뜨리지 않는다.

### 5. 고쳐쓰기 — 1회만

`깨짐`이거나 `통과 + 권고`면 `weakness-author`에게 반박 전문 + 권고 + 문구 개선안을 주고
**한 번만** 다시 쓰게 한다.

**2차본은 검산기가 다시 본다** (바뀐 자리만). 09.16에 깨진 게 전부 "고치다가 옆이 깨진 것"이고
그걸 잡은 게 2차 검산이었다.

한 번 고쳐서도 깨지면 **그 칸은 비워 둔다.**

### 6. 코드에 넣기

통과한 것만. 기윤이 diff를 보고 정한다. **에이전트가 코드를 고치지 않는다.**

넣을 자리 11곳은 0단계 E가 세어 준다. 넣고 나서:

```bash
npm run typecheck && npm test
cd functions && npx tsc --noEmit    # weaknessOrder·weaknessLabels 때문에
tsx scripts/weakness-stage0.ts --set <세트.json>   # 11곳 다 ✅ 인지
```

## 매번 빠뜨리기 쉬운 것

- **복습 콘텐츠** — `review-content-map`·`remedial-flows`는 `Partial`이라 빠져도 컴파일이 안 깨진다.
  2026.09.19에 `g3_seq_sum_term`이 실제로 그렇게 들어갔다
- **서버 두 곳** — `functions/src/learning-history.ts`의 `weaknessOrder`(zod enum)와
  `weaknessLabels`(Record). 앞엣것이 빠지면 서버가 거부하고, 뒤엣것이 빠지면 functions tsc가 깨진다
- **`weakness-mistake-type-map.test.ts`의 박힌 숫자** — 약점을 늘리면 같이 고친다. 일부러 그렇게 뒀다
- **`.codex` 사본** — 에이전트 정의를 고치면 `node scripts/sync-codex-agents.mjs`

## 다음 판에 가져가지 말 것

09.19에 무효가 됐는데 옛 문서에 흔적이 남아 있다.

- ~~고쳐쓰기 최대 2회~~ → 1회
- ~~약점 이름에 "계산" 금지~~ → 근거가 철회됐다 (분모가 학생 50명이 아니라 글 50편,
  핵심 인용은 지구과학1 글)
- ~~"사진 흐름은 학생한테 아무것도 안 묻는다"~~ → 묻는다 (`use-photo-flow.ts:337`).
  다만 **왜 틀렸는지는 안 물으니** 학생 행동 단정 금지 규칙 자체는 살아 있다

## 판이 끝나면

숫자를 적는다 — **에이전트 몇 개 썼나 · 몇 칸 통과했나.**
09.16(v1)은 47개 → 1칸이었다. v2가 나은지는 이 숫자로만 알 수 있다.

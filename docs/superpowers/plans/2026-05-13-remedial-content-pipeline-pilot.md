# Remedial Content Pipeline — Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Spec(`2026-05-13-remedial-content-pipeline-design.md`)의 6단계 파이프라인을 시범 약점 `discriminant_calculation` 1개에 풀 사이클로 적용해 작동성을 검증하고, 실측치(토큰값·합격선·페르소나 응답 품질)를 회수해 spec §7 TBD 항목을 채운다.

**Architecture:** 본 plan은 코드 인프라(매핑 스크립트·sympy 검증기·서브에이전트 프롬프트 파일)를 먼저 작성한 뒤, 메인 Claude가 콘텐츠를 생성하고 Opus 서브에이전트 2명 + sympy 3개 게이트를 통과시켜 `data/remedial-flows/discriminant_calculation.ts`를 산출한다. 통과 후 `review-remedial-flows.ts` 등록 + 무결성 테스트 + iOS 시뮬레이터 수동 QA(시나리오 A/B/E)로 끝낸다.

**Tech Stack:** TypeScript (`data/**`), Python 3 + sympy (수식 검증), Bash (스크립트 글루), Claude Code Agent tool (Opus 서브에이전트 호출), Jest (무결성 테스트), Expo iOS simulator.

---

## File Structure

| 경로 | 역할 | 신규/수정 |
|---|---|---|
| `scripts/remedial-pipeline/map-intent-to-weakness.ts` | 1,700 시험 풀이의 intent를 약점 키워드로 분류해 약점별 사례 묶음을 만든다 (pilot은 `discriminant_calculation`만) | 신규 |
| `scripts/remedial-pipeline/keywords.ts` | 약점별 매핑 키워드 사전 | 신규 |
| `scripts/remedial-pipeline/verify-formulas.py` | sympy로 수식 항등성·계산 정확성 검증 | 신규 |
| `scripts/remedial-pipeline/prompts/math-teacher.md` | Opus 서브에이전트 1 — 수학 교사 페르소나 프롬프트 | 신규 |
| `scripts/remedial-pipeline/prompts/struggling-student.md` | Opus 서브에이전트 2 — 수포자 학생 페르소나 프롬프트 | 신규 |
| `scripts/remedial-pipeline/prompts/content-author.md` | 메인 Claude — 콘텐츠 생성 시스템 프롬프트 | 신규 |
| `data/remedial-flows/discriminant_calculation.ts` | 시범 약점 보완 노드 그래프 (산출물) | 신규 |
| `data/review-remedial-flows.ts:51` | `discriminant_calculation` 등록 추가 | 수정 |
| `data/review-content-map.ts` | `discriminant_calculation`의 오답 Choice에 `remedialFlowStartNodeId` + `weaknessId` 부여 | 수정 |
| `docs/superpowers/specs/2026-05-13-remedial-content-pipeline-design.md` | §7 TBD 채우기 → 정식 spec | 수정 |

스크립트는 `scripts/remedial-pipeline/` 하위에 격리해 56개 확장 시 그대로 재사용한다.

---

## Task 1: 매핑 키워드 사전 작성

**Files:**
- Create: `scripts/remedial-pipeline/keywords.ts`

- [ ] **Step 1: 디렉터리 생성**

Run:
```bash
mkdir -p scripts/remedial-pipeline/prompts
```
Expected: 디렉터리 생성, 오류 없음.

- [ ] **Step 2: 키워드 사전 파일 작성**

`scripts/remedial-pipeline/keywords.ts`:
```ts
import type { WeaknessId } from '../../data/diagnosisMap';

/**
 * 시험 풀이 intent 텍스트를 약점으로 분류하는 키워드 사전.
 * 매칭: intent 문자열에 keywords 중 하나라도 포함되면 해당 약점에 매핑.
 * Pilot: discriminant_calculation만 채움. 56개 확장 시 나머지 채움.
 */
export const weaknessKeywords: Partial<Record<WeaknessId, readonly string[]>> = {
  discriminant_calculation: [
    '판별식',
    '실근',
    '허근',
    '중근',
    '근의 개수',
    'b²-4ac',
    'b^2-4ac',
    '이차방정식의 근',
  ],
};
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 새 파일 관련 오류 없음.

- [ ] **Step 4: 커밋**

```bash
git add scripts/remedial-pipeline/keywords.ts
git commit -m "feat(remedial-pipeline): add weakness keyword dictionary (pilot)"
```

---

## Task 2: 매핑 스크립트 작성 + 실행

**Files:**
- Create: `scripts/remedial-pipeline/map-intent-to-weakness.ts`

- [ ] **Step 1: 매핑 스크립트 작성**

`scripts/remedial-pipeline/map-intent-to-weakness.ts`:
```ts
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { weaknessKeywords } from './keywords';
import type { WeaknessId } from '../../data/diagnosisMap';

type Explanation = {
  number: number;
  intent: string;
  text: string;
  formulas: unknown[];
  imageKey: string | null;
};

type Bundle = { examId: string; explanations: Explanation[] };

type MappedCase = {
  weaknessId: WeaknessId;
  examId: string;
  problemNumber: number;
  intent: string;
  matchedKeywords: string[];
};

const EXAM_DIR = join(__dirname, '..', '..', 'data', 'exam');
const OUTPUT = join(__dirname, 'intent-weakness-map.json');

function loadBundles(): Bundle[] {
  const subdirs = readdirSync(EXAM_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const bundles: Bundle[] = [];
  for (const sub of subdirs) {
    const file = join(EXAM_DIR, sub, 'explanations.json');
    try {
      const raw = readFileSync(file, 'utf8');
      const parsed = JSON.parse(raw) as Bundle;
      bundles.push(parsed);
    } catch {
      // 파일 없음/파싱 실패는 무시 (extraction_report에서 잡힘)
    }
  }
  return bundles;
}

function mapBundle(bundle: Bundle): MappedCase[] {
  const out: MappedCase[] = [];
  for (const expl of bundle.explanations) {
    for (const [weaknessId, keywords] of Object.entries(weaknessKeywords)) {
      const matched = (keywords ?? []).filter((kw) => expl.intent.includes(kw));
      if (matched.length > 0) {
        out.push({
          weaknessId: weaknessId as WeaknessId,
          examId: bundle.examId,
          problemNumber: expl.number,
          intent: expl.intent,
          matchedKeywords: matched,
        });
      }
    }
  }
  return out;
}

const bundles = loadBundles();
const cases = bundles.flatMap(mapBundle);

const grouped: Partial<Record<WeaknessId, MappedCase[]>> = {};
for (const c of cases) {
  (grouped[c.weaknessId] ??= []).push(c);
}

writeFileSync(OUTPUT, JSON.stringify(grouped, null, 2), 'utf8');

console.log(`매핑 완료: ${OUTPUT}`);
for (const [weaknessId, list] of Object.entries(grouped)) {
  console.log(`  ${weaknessId}: ${(list as MappedCase[]).length}건`);
}
```

- [ ] **Step 2: 스크립트 실행**

Run: `npx tsx scripts/remedial-pipeline/map-intent-to-weakness.ts`
Expected:
```
매핑 완료: .../intent-weakness-map.json
  discriminant_calculation: <N>건
```
N >= 10 이어야 §6 성공 기준 충족. N < 10이면 Step 3으로 이동, N >= 10이면 Step 4로.

- [ ] **Step 3: (N < 10 시) 키워드 확장**

`keywords.ts`의 `discriminant_calculation` 배열에 추가 후보(예: `'D > 0'`, `'D < 0'`, `'이차방정식이 실근'`, `'근을 갖'`)를 더하고 Step 2 재실행. N >= 10 달성까지 반복.

- [ ] **Step 4: 결과 sanity check**

Run: `jq '.discriminant_calculation[0:3]' scripts/remedial-pipeline/intent-weakness-map.json`
Expected: 3개 사례 출력. intent 문자열에 키워드("판별식" 등)가 실제로 포함되는지 육안 확인. 명백히 무관한 사례(예: 판별식이 안 나오는 적분 문제)가 섞이면 키워드 정밀도 조정.

- [ ] **Step 5: 커밋**

```bash
echo "scripts/remedial-pipeline/intent-weakness-map.json" >> .gitignore
git add scripts/remedial-pipeline/map-intent-to-weakness.ts .gitignore
git commit -m "feat(remedial-pipeline): intent→weakness 매핑 스크립트"
```

(매핑 결과 JSON은 재생성 가능하므로 .gitignore. 약점 키워드 사전만 커밋.)

---

## Task 3: sympy 수식 검증 스크립트 작성

**Files:**
- Create: `scripts/remedial-pipeline/verify-formulas.py`

- [ ] **Step 1: Python·sympy 사용 가능 여부 확인**

Run:
```bash
python3 -c "import sympy; print(sympy.__version__)"
```
Expected: 버전 출력 (예: `1.12`). `ModuleNotFoundError`면 Step 2 실행, 출력되면 Step 3.

- [ ] **Step 2: (없으면) sympy 설치**

Run:
```bash
python3 -m pip install --user sympy
python3 -c "import sympy; print(sympy.__version__)"
```
Expected: 두 번째 명령에서 버전 출력.

- [ ] **Step 3: 검증 스크립트 작성**

`scripts/remedial-pipeline/verify-formulas.py`:
```python
#!/usr/bin/env python3
"""
수식 항등식 검증기.

입력 (stdin, JSON):
  [
    {"id": "node1.eq1", "lhs": "x**2 + 8*x + 16", "rhs": "(x + 4)**2"},
    {"id": "node1.eq2", "lhs": "b**2 - 4*a*c", "rhs": "discriminant"}
  ]

출력 (stdout, JSON):
  [
    {"id": "node1.eq1", "ok": true, "reason": null},
    {"id": "node1.eq2", "ok": false, "reason": "rhs uses undefined symbol 'discriminant'"}
  ]

사용:
  echo '[{"id":"t","lhs":"x**2+2*x+1","rhs":"(x+1)**2"}]' | \\
    python3 scripts/remedial-pipeline/verify-formulas.py
"""
import json
import sys
from sympy import simplify, sympify, SympifyError


def verify(case):
    case_id = case.get("id", "?")
    try:
        lhs = sympify(case["lhs"])
        rhs = sympify(case["rhs"])
        diff = simplify(lhs - rhs)
        return {"id": case_id, "ok": diff == 0, "reason": None if diff == 0 else f"lhs - rhs = {diff}"}
    except SympifyError as e:
        return {"id": case_id, "ok": False, "reason": f"파싱 실패: {e}"}
    except Exception as e:
        return {"id": case_id, "ok": False, "reason": f"검증 오류: {e}"}


def main():
    raw = sys.stdin.read()
    cases = json.loads(raw)
    results = [verify(c) for c in cases]
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: 셀프 테스트 — 통과 케이스**

Run:
```bash
echo '[{"id":"t1","lhs":"x**2+8*x+16","rhs":"(x+4)**2"}]' | python3 scripts/remedial-pipeline/verify-formulas.py
```
Expected: `"ok": true` 출력.

- [ ] **Step 5: 셀프 테스트 — 실패 케이스**

Run:
```bash
echo '[{"id":"t2","lhs":"x**2+8*x+15","rhs":"(x+4)**2"}]' | python3 scripts/remedial-pipeline/verify-formulas.py
```
Expected: `"ok": false`, `reason`에 `lhs - rhs = -1` 출력.

- [ ] **Step 6: 커밋**

```bash
chmod +x scripts/remedial-pipeline/verify-formulas.py
git add scripts/remedial-pipeline/verify-formulas.py
git commit -m "feat(remedial-pipeline): sympy 수식 검증 스크립트"
```

---

## Task 4: 서브에이전트 프롬프트 3종 작성

**Files:**
- Create: `scripts/remedial-pipeline/prompts/math-teacher.md`
- Create: `scripts/remedial-pipeline/prompts/struggling-student.md`
- Create: `scripts/remedial-pipeline/prompts/content-author.md`

- [ ] **Step 1: 수학 교사 페르소나 프롬프트 작성**

`scripts/remedial-pipeline/prompts/math-teacher.md`:
```markdown
# 역할: 한국 고등학교 수학 교사 (10년 경력)

당신은 한국 고등학교에서 수학을 10년 가르친 교사다. 학생용 학습 콘텐츠 초안을 검수한다.

## 검수 대상

`data/remedial-flows/<weaknessId>.ts` 한 파일의 모든 노드(ExplainNode/CheckNode). 사용자가 본문을 첨부해 준다.

## 검수 기준 (모두 통과해야 승인)

1. **수식·계산 정확성** — 모든 등식·전개·인수분해가 수학적으로 옳다
2. **개념 정의 정확성** — 용어(판별식, 실근 등)의 정의가 표준 교과서와 일치
3. **논리 비약 없음** — 한 단계에서 다음 단계로 가는 근거가 명시됨
4. **고등학교 교육 과정 범위** — 대학 수학 표기나 비교과 정의가 섞이지 않음
5. **선택지 정답 표시 정확성** — `isCorrect: true`로 표시된 선택지가 진짜 정답

## 출력 형식 (정확히 이대로)

```json
{
  "verdict": "approve" | "reject",
  "issues": [
    { "nodeId": "...", "severity": "blocker" | "minor", "issue": "...", "suggestion": "..." }
  ],
  "equationsToVerify": [
    { "id": "node1.eq1", "lhs": "...", "rhs": "..." }
  ]
}
```

- `verdict: "approve"`는 **blocker 이슈 0개**일 때만.
- `equationsToVerify`는 콘텐츠 내 모든 핵심 등식을 sympy 입력 형식(파이썬 표기: `x**2`, `*`, `**`)으로 추출.

## 금지

- 추측·"아마도"·"~일 수 있다" 표현 금지. 확신 못 하면 `severity: blocker`로 기록.
- 학생을 위로하는 톤 금지. 사실 검수만.
- 콘텐츠를 직접 고쳐주지 말 것. `suggestion` 필드에 한 줄만.
```

- [ ] **Step 2: 수포자 학생 페르소나 프롬프트 작성**

`scripts/remedial-pipeline/prompts/struggling-student.md`:
```markdown
# 역할: 수학 6등급 고1 학생 (수포자 직전)

당신은 수학 6등급 고1이다. 이차방정식이라는 단어는 들어봤지만 판별식·실근·허근은 처음 듣는다. 영어 단어가 나오면 멈춘다. 수식이 길어지면 눈이 흐려진다.

## 검수 대상

`data/remedial-flows/<weaknessId>.ts` 한 파일의 모든 노드를 학생 순서대로 따라간다.

## 검수 절차

각 노드를 처음부터 끝까지 한 번 읽고, **노드별로** 다음 중 하나로 표시:

- `understood`: 한 번 읽고 이해됨. 다음 노드로 넘어갈 수 있음.
- `confused`: 한 번 읽고 막힘. 어디서 막혔는지 인용.
- `bored`: 너무 당연한 소리만 있어서 학습 효과 없음.

## 출력 형식 (정확히 이대로)

```json
{
  "verdict": "approve" | "reject",
  "perNode": [
    { "nodeId": "...", "state": "understood" | "confused" | "bored", "where": "막힌 정확한 문구 인용 (state=confused 시)" }
  ]
}
```

- `verdict: "approve"`는 `confused` 0개일 때만. `bored`는 minor로 보고 reject 사유 아님.

## 절대 하지 말 것

- 모르는 척이 아니라 진짜 모름. 잘 모르면 `confused`라고 솔직히 말한다.
- "노력해서 이해한다" 금지. 한 번 읽고 이해 못 하면 `confused`.
- 내가 똑똑한 학생인 척하지 말 것. 6등급 수포자다.
```

- [ ] **Step 3: 콘텐츠 작성자 시스템 프롬프트 작성**

`scripts/remedial-pipeline/prompts/content-author.md`:
```markdown
# 역할: 복습 보완 콘텐츠 작성자

DASIDA 앱의 복습 세션에서 학생이 오답을 선택했을 때 보여줄 보완 노드 그래프를 작성한다.

## 입력

1. 약점 ID (예: `discriminant_calculation`)
2. 매핑된 시험 풀이 사례 묶음 (JSON; intent 텍스트 중심)
3. 참고 패턴 파일 (`data/remedial-flows/formula_understanding.ts`) — 구조·톤 레퍼런스
4. 약점 관련 `review-content-map.ts`의 ThinkingStep 정의 (해당 약점의 step·choice 목록)

## 출력

`data/remedial-flows/<weaknessId>.ts` 파일 본문 (TypeScript). 다음 규칙 준수:

1. **노드 ID 컨벤션:** `<prefix>_step<N>_<choice>_<role>` (예: `disc_step1_A_explain`, `disc_step1_A_check`, `disc_step1_exit`)
2. **prefix:** 약점 이름의 약어 (discriminant_calculation → `disc`)
3. **타입:** `data/review-remedial-flows.ts`의 `ExplainNode` / `CheckNode` / `ExitNode` 정확히 따름
4. **각 explain 노드에 `summary` + `triggers` 필드 채움** (Phase 2 라우터 후보 자격)
5. **`title` ≤ 30자, `body` ≤ 3문장**, 한국어 존댓말
6. **수식 표기:** 일반 텍스트로 작성 (예: "x² + 8x + 16 = (x+4)²"). 별도 `equations` 필드 없음.
7. **선택지의 `isCorrect`** 정확히 표시. 정답 1개, 오답 ≥2개.

## 톤

- formula_understanding 톤을 그대로 따름: 짧고 친근하되 단정적. 문장 끝 "~예요/~해요".
- "왜 그런지" 한 문장으로 짚고 넘어가기. 외우게 하지 않음.

## 입력으로 받은 시험 풀이 사례 활용

매핑된 시험 풀이 사례의 intent를 컨텍스트로 사용해 콘텐츠가 실제 수능·학평 문제 풀이 흐름과 연결되게 한다. 단, 사례 문장을 그대로 베끼지 말 것.

## 피드백 루프 (재시도 시)

이전 시도의 게이트 거절 사유(JSON)를 함께 받으면 해당 이슈만 수정해 재출력한다. 통과한 노드는 건드리지 않음.
```

- [ ] **Step 4: 커밋**

```bash
git add scripts/remedial-pipeline/prompts/
git commit -m "feat(remedial-pipeline): Opus 서브에이전트 + 콘텐츠 작성자 프롬프트 3종"
```

---

## Task 5: `discriminant_calculation` 콘텐츠 1차 생성

**Files:**
- Create: `data/remedial-flows/discriminant_calculation.ts`

- [ ] **Step 1: 컨텍스트 자료 모으기**

다음 4개 자료를 한 번에 읽어 컨텍스트 확보 (Read 도구):
1. `scripts/remedial-pipeline/prompts/content-author.md`
2. `data/remedial-flows/formula_understanding.ts` (참고 패턴)
3. `scripts/remedial-pipeline/intent-weakness-map.json`에서 `discriminant_calculation` 묶음
4. `data/review-content-map.ts`의 `discriminant_calculation` ThinkingStep 정의

- [ ] **Step 2: 메인 Claude가 콘텐츠 작성**

content-author 프롬프트를 시스템 컨텍스트로 사용하고, 위 4개 자료를 입력으로 `data/remedial-flows/discriminant_calculation.ts` 파일을 작성한다.

산출물 구조 (`formula_understanding.ts`와 동일 형식):
```ts
import type { RemedialFlow } from '../review-remedial-flows';

export const discriminant_calculation_flow: RemedialFlow = {
  nodes: {
    'disc_step1_A_explain': { /* ... */ },
    'disc_step1_A_check': { /* ... */ },
    // ...
    'disc_step1_exit': { id: 'disc_step1_exit', kind: 'exit' },
    // step2, step3 ...
  },
};
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 타입 오류 없음. (아직 review-remedial-flows에 등록 안 했으므로 unused-export 경고는 무시 가능)

- [ ] **Step 4: 임시 커밋 (게이트 통과 전 스냅샷)**

```bash
git add data/remedial-flows/discriminant_calculation.ts
git commit -m "wip(remedial): discriminant_calculation 1차 생성 (게이트 검증 전)"
```

게이트 통과 후 amend가 아니라 추가 커밋으로 변경분 쌓는다(CLAUDE.md "create new commits rather than amending").

---

## Task 6: 3개 게이트 + 피드백 루프

**Files:**
- 검증만 (수정 없음 또는 `data/remedial-flows/discriminant_calculation.ts` 재생성)

게이트 통과 시도 횟수 상한: **3회**. 3회 후에도 불통과면 사람이 검토 필요(spec §7 TBD에 기록).

- [ ] **Step 1: 수학 교사 게이트 (Opus 서브에이전트)**

Agent 도구 호출:
- `description`: "수학 교사 콘텐츠 검수"
- `subagent_type`: `general-purpose`
- `model`: `opus`
- `prompt`: `scripts/remedial-pipeline/prompts/math-teacher.md` 본문 + `data/remedial-flows/discriminant_calculation.ts` 본문 + 출력 형식 명시

서브에이전트 응답에서 JSON 추출:
- `verdict: "approve"` + `issues`에 blocker 0개 → 통과, Step 2로
- 그 외 → 거절. `issues` 기록하고 Task 5 Step 2로 회귀(피드백 포함 재생성). 재시도 카운터 +1.

- [ ] **Step 2: 수포자 학생 게이트 (Opus 서브에이전트)**

Agent 도구 호출:
- `description`: "수포자 학생 이해도 검수"
- `subagent_type`: `general-purpose`
- `model`: `opus`
- `prompt`: `scripts/remedial-pipeline/prompts/struggling-student.md` 본문 + `data/remedial-flows/discriminant_calculation.ts` 본문

응답 JSON:
- `verdict: "approve"` + `perNode`에 `confused` 0개 → 통과, Step 3로
- 그 외 → 거절. `confused` 사례 기록하고 Task 5 Step 2로 회귀. 재시도 카운터 +1.

- [ ] **Step 3: sympy 게이트**

Step 1에서 받은 `equationsToVerify` JSON 배열을 stdin으로 전달:
```bash
echo '<equationsToVerify JSON>' | python3 scripts/remedial-pipeline/verify-formulas.py
```

응답 JSON:
- 모든 항목 `ok: true` → 통과, Task 7로
- 하나라도 `ok: false` → 거절. 해당 `reason`을 기록하고 Task 5 Step 2로 회귀(거절 사유에 수식 오류 포함). 재시도 카운터 +1.

- [ ] **Step 4: 재시도 상한 도달 시 (3회)**

3회 후에도 한 게이트 이상 불통과면:
1. 게이트별 거절 이력을 `docs/superpowers/specs/2026-05-13-remedial-content-pipeline-design.md` §7 TBD 항목 아래 "실패 사례" 섹션으로 기록
2. 사용자에게 보고: "재시도 상한 도달. 사람 개입 필요. 다음 옵션: (a) 페르소나 프롬프트 강화 (b) 재시도 상한 상향 (c) 시범 약점 변경"
3. plan 실행 일시 중단.

- [ ] **Step 5: 통과 시 커밋**

```bash
git add data/remedial-flows/discriminant_calculation.ts
git commit -m "feat(remedial): discriminant_calculation 콘텐츠 게이트 통과"
```

(WIP 커밋과 합치지 않고 별도 커밋 — 게이트 통과 이력 보존)

---

## Task 7: 등록 + 무결성 테스트

**Files:**
- Modify: `data/review-remedial-flows.ts:49-53`
- Modify: `data/review-content-map.ts` (`discriminant_calculation`의 오답 Choice들)

- [ ] **Step 1: `review-remedial-flows.ts`에 등록**

`data/review-remedial-flows.ts`의 `import` 및 `remedialFlows` 객체 수정:

Before (lines 49-53):
```ts
import { formula_understanding_flow } from './remedial-flows/formula_understanding';

export const remedialFlows: Partial<Record<WeaknessId, RemedialFlow>> = {
  formula_understanding: formula_understanding_flow,
};
```

After:
```ts
import { formula_understanding_flow } from './remedial-flows/formula_understanding';
import { discriminant_calculation_flow } from './remedial-flows/discriminant_calculation';

export const remedialFlows: Partial<Record<WeaknessId, RemedialFlow>> = {
  formula_understanding: formula_understanding_flow,
  discriminant_calculation: discriminant_calculation_flow,
};
```

- [ ] **Step 2: `review-content-map.ts`의 `discriminant_calculation` 오답 Choice 연결**

`discriminant_calculation` 키 아래 모든 ThinkingStep의 오답 Choice에 `remedialFlowStartNodeId` + `weaknessId` 추가. 시작 노드 ID는 Task 5에서 생성한 콘텐츠의 노드 ID와 정확히 일치해야 함 (예: `disc_step1_A_explain`).

Pattern (각 오답 Choice마다):
```ts
{
  text: '<오답 텍스트>',
  correct: false,
  feedback: '<기존 피드백>',
  remedialFlowStartNodeId: 'disc_step1_A_explain',
  weaknessId: 'discriminant_calculation',
},
```

- [ ] **Step 3: 무결성 테스트 실행**

Run:
```bash
npm test -- data/review-remedial-flows.test.ts data/review-content-map.test.ts
```
Expected: 모든 테스트 PASS. 특히:
- `discriminant_calculation`의 모든 `remedialFlowStartNodeId`가 정의된 노드를 가리킨다
- 모든 노드의 `nextNodeId`/`secondaryNextNodeId`/`dontKnowNextNodeId`가 유효
- `ExitNode` 도달 가능

실패 시: 노드 ID 오타 추적. Task 5의 산출물과 Task 7의 연결을 대조해 수정.

- [ ] **Step 4: 타입 + 린트 + 전체 테스트**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: 모두 PASS.

- [ ] **Step 5: 커밋**

```bash
git add data/review-remedial-flows.ts data/review-content-map.ts
git commit -m "feat(remedial): register discriminant_calculation + link choices"
```

---

## Task 8: iOS 시뮬레이터 수동 QA (Phase 2 시나리오 A/B/E)

**Files:** 없음 (수동 검증)

- [ ] **Step 1: 네이티브 의존성 변경 확인**

Run: `git diff main -- package.json package-lock.json ios android`
Expected: 변경 없음 (이번 plan은 JS만 추가). 변경 있으면 Step 2 필수.

- [ ] **Step 2: 시뮬레이터 빌드**

Run:
```bash
npx expo prebuild --clean
npx expo run:ios
```
Expected: 시뮬레이터 부팅, 검정화면 없음, 앱 정상 진입.

(CLAUDE.md 규칙: 네이티브 변경 없어도 안전하게 prebuild --clean 권장.)

- [ ] **Step 3: 시나리오 A — 라우팅 성공 (자유 입력)**

수동 절차:
1. 홈 → DEV 메뉴 → `__mock__` 태스크 진입 (또는 `discriminant_calculation` task가 있다면 그것)
2. 첫 ThinkingStep에서 자유 입력 `"판별식이 뭔지 모르겠어요"` 전송
3. ai-typing → 라우터가 `disc_*_explain` 노드 중 하나를 entries에 띄움

Expected:
- 자유 입력 → ai-typing dots → remedial 노드 등장 (한 step 안에서)
- analytics 콘솔에 `review_router_called` + `review_router_succeeded` 발화 확인
- `polling fallback-input` 미등장

실패 시: 노드의 `summary` + `triggers` 부재 가능성 → Task 5로 회귀해 메타데이터 보강.

- [ ] **Step 4: 시나리오 B — 라우터 실패 → 폴백 챗**

수동 절차:
1. 같은 step에서(또는 새 task에서) 자유 입력 `"오늘 점심 뭐 먹지"` 전송

Expected:
- ai-typing → "응답…" 텍스트 → fallback-input(turn=2) 등장
- 2턴 더 입력 → done-cta 등장
- analytics `review_router_fallback` + 2턴 완료 시 `review_fallback_chat_completed`

- [ ] **Step 5: 시나리오 E — Remedial 도중 "모르겠어요"**

수동 절차:
1. ThinkingStep에서 오답 선택 → remedial 진입 → explain 노드 등장
2. explain 노드에서 "모르겠어요" 누름

Expected:
- AI 호출 **없이** 즉시 다음 정적 노드(`secondaryNextNodeId`)로 이동
- `fallback-input` 카드 등장 X

- [ ] **Step 6: 결과 기록**

3개 시나리오 결과를 메모에 남기기:
- 시나리오 A: ✅/❌, 메모
- 시나리오 B: ✅/❌, 메모
- 시나리오 E: ✅/❌, 메모

모두 ✅ → Task 9로. 한 개라도 ❌ → 원인 분석 후 Task 5~7 중 해당 단계로 회귀.

---

## Task 9: spec §7 TBD 채우기 + 정식 spec 업데이트

**Files:**
- Modify: `docs/superpowers/specs/2026-05-13-remedial-content-pipeline-design.md`

- [ ] **Step 1: 실측치·결정사항 정리**

다음 정보를 spec §7 자리에 채워 넣는다:
- **Opus 서브에이전트 페르소나 프롬프트:** `scripts/remedial-pipeline/prompts/math-teacher.md` 및 `struggling-student.md` 채택 (링크)
- **합격선 정의:** 수학 교사 `verdict: "approve"` + blocker 0개; 수포자 학생 `verdict: "approve"` + confused 0개; sympy 모든 항목 `ok: true`
- **sympy 호출 형식:** `equationsToVerify` JSON 배열을 stdin으로 전달 (Task 3 참고)
- **매핑 알고리즘:** 키워드 포함 기반 (Task 1의 `keywords.ts`). 임베딩·LLM 분류는 56개 확장 시 재평가
- **피드백 루프 재시도 상한:** 3회
- **토큰값 실측치:** Task 5+6에서 누적 토큰 (게이트 통과까지 소요된 입력+출력 합). 56개 추정치 = 1회분 × 56
- **출처 메타데이터 형식:** 각 채택본 옆에 주석 `// 출처: <examId> 문제<n>` 형태 (선택)

- [ ] **Step 2: spec 상태 전환**

상단 frontmatter 수정:
- `**상태**: 기획중 (...)` → `**상태**: 시범 구현 완료, 56개 확장 준비`

- [ ] **Step 3: TBD 섹션 제거 후 채택 사항 섹션으로 교체**

`## 7. TBD` 헤더를 `## 7. 채택된 결정사항`으로 변경하고 Step 1의 항목들로 본문 교체.

- [ ] **Step 4: 다음 행동 갱신**

`## 9. 다음 행동`을 56개 확장용 항목으로 갱신:
1. 56개 약점 키워드 사전 채우기 (`keywords.ts` 확장)
2. 매핑 결과 분포 점검 (약점별 사례 수 분포, 빈 약점 식별)
3. 3개 약점 batch 실행 (다양성 검증: 함수·도형·확통)
4. 56개 일괄 실행 (재시도 상한 도달 약점은 사람 검토 큐로)

- [ ] **Step 5: 커밋**

```bash
git add docs/superpowers/specs/2026-05-13-remedial-content-pipeline-design.md
git commit -m "docs(spec): 시범 1개 실측치 반영 → 정식 spec 전환"
```

- [ ] **Step 6: PROGRESS 로그**

`docs/PROGRESS.md` 상단에 항목 추가:
```markdown
## 2026-05-13 — 복습 보완 콘텐츠 파이프라인 시범 1개 완료
- 약점: `discriminant_calculation`
- 게이트: 수학 교사 ✅ / 수포자 학생 ✅ / sympy ✅
- 시뮬레이터 QA: 시나리오 A/B/E 통과
- 실측 재시도: <N>회
- 다음: 56개 batch 준비 (별도 plan)
```

- [ ] **Step 7: PROGRESS 커밋**

```bash
git add docs/PROGRESS.md
git commit -m "chore(progress): 시범 약점 1개 파이프라인 검증 완료"
```

---

## 검증 체크리스트 (시범 1개 풀 사이클 완료 조건)

- [ ] `scripts/remedial-pipeline/` 하위 5개 파일이 생성·커밋됨
- [ ] `intent-weakness-map.json`에서 `discriminant_calculation` 사례 ≥ 10건
- [ ] sympy 셀프 테스트 PASS (Task 3 Step 4/5)
- [ ] 3개 게이트(수학 교사 / 수포자 학생 / sympy) 모두 통과한 `data/remedial-flows/discriminant_calculation.ts` 산출
- [ ] `review-remedial-flows.ts` 등록 + `review-content-map.ts`의 오답 Choice 연결 완료
- [ ] 무결성 테스트 + 타입 체크 + 린트 + 전체 테스트 PASS
- [ ] iOS 시뮬레이터에서 시나리오 A/B/E 통과
- [ ] spec §7 TBD가 채택 사항으로 교체됨 (상태: 시범 구현 완료)
- [ ] `docs/PROGRESS.md`에 항목 추가됨

---

## Non-blocking / 후속 작업 (별도 plan)

- 56개 키워드 사전 일괄 채우기 + 매핑 점검
- 3개 약점 다양성 batch (`g2_trig_identity`, `g3_vector`, `counting_method_confusion` 등)
- 56개 일괄 실행 워크플로우 (재시도 상한 도달 약점 큐 관리)
- Notion DASIDA 개발 기록 페이지 정식 등록 (API 토큰 복구 후)

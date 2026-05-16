# 매핑 점검 런북 (진단↔보충 정합성 1회성 감사)

이 문서는 자기완결 절차서다. 다음 세션은 이 대화 컨텍스트가 전혀 없으므로,
이 점검을 다시 돌릴 때는 **이 문서에 적힌 대로만** 한다. 임의 변경 금지.

## 이 점검이 답하는 질문

> 진단(10문제·모의고사)이 학생을 어떤 약점으로 분류했을 때,
> 그 학생이 받는 보충(remedial) 내용이 그 막힘에 맞는가?

존재 여부(빈 구멍)가 아니라 **적절성**을 본다. 빈 구멍은 별도 결정론 검사로 이미 확인됨.

## 절대 규칙 — 반드시 2명으로 한다

이 점검은 **반드시 검사자 2명**으로 수행한다. 1명으로 끝내거나 다른 게이트로 대체 금지.

| 순서 | 검사자 | 페르소나 파일 | 범위 |
|---|---|---|---|
| ① | 매핑 검사자 | `scripts/remedial-pipeline/prompts/mapping-reviewer.md` | **131행 전수** 채점 |
| ② | 수포자 학생 | `scripts/remedial-pipeline/prompts/struggling-student.md` | ①이 `mismatch`/`weak` 잡은 행만 재확인 |

- ②는 전수 재검 금지 — ①이 의심한 행만 "나 같은 6등급 학생이 이 보충 받으면 황당한가?" 관점으로 교차확인.
- 두 검사자가 한 행에 대해 엇갈리면, 그 행은 보고서에 **이견 표시**하고 사람 판단으로 넘긴다.

## gates.ts 와의 관계 — 등록하지 않는다

이 점검은 `scripts/remedial-pipeline/gates.ts` 에 게이트로 **등록하지 않는다.**
이유: 기존 6게이트는 약점당 보충파일 1개를 검수하는 per-weakness 구조이고,
`state.json` 의 통과 추적과 자동 루틴(`check-triggers.ts`)이 거기 묶여 있다.
매핑 점검은 진단↔보충 *관계*(131개)를 보는 cross-cutting 1회성 감사라 성격이 다르며,
gates.ts 에 넣으면 기존 57개 약점이 전부 "신규 게이트 미통과"로 뒤집혀
자동 루틴이 헝클어진다. 따라서 자동 루틴·state.json 을 건드리지 않는 별도 감사로 둔다.

## 절차

1. 추출:
   ```
   npx tsx scripts/remedial-pipeline/extract-mapping-audit.ts
   ```
   → `scripts/remedial-pipeline/mapping-audit-input.json` 생성 (현재 131행: 선택지 100 + 폴백 31).

2. ① 매핑 검사자 호출 (Agent, model: opus):
   - 페르소나: `scripts/remedial-pipeline/prompts/mapping-reviewer.md`
   - 입력: `mapping-audit-input.json` 전체
   - 출력: 페르소나에 명시된 JSON (행별 `ok`/`weak`/`mismatch`/`skip`).
   - 행이 많으면 분할 호출 가능하나 **누락 0** 이어야 한다 (131행 전부 판정).

3. ② 수포자 학생 호출 (Agent, model: opus):
   - 페르소나: `scripts/remedial-pipeline/prompts/struggling-student.md`
   - 입력: ①이 `mismatch`/`weak` 로 표시한 행만 (해당 weaknessId 의 보충 흐름 함께 제시)
   - 출력: 행별 동의/이견.

4. 보고서 작성: `docs/superpowers/mapping-audit-report.md`
   - `mismatch` 와 이견 행만 기재. `ok`/`skip` 은 적지 않는다.
   - 각 항목: 무엇과 무엇이 어긋났는지(쉬운 한국어) + 제안 수정 + ② 동의 여부.
   - 수포자도 읽을 수 있게 수식·전문용어 최소화.

5. 사람이 보고서의 각 ⚠️ 항목에 "고쳐 / 둬" 결정. 결정된 것만 데이터 수정 후
   `extract-mapping-audit.ts` 재실행으로 재검.

## 산출물 정리

- 입력: `scripts/remedial-pipeline/mapping-audit-input.json` (재생성 가능, 커밋 선택)
- 보고서: `docs/superpowers/mapping-audit-report.md`
- 페르소나: `scripts/remedial-pipeline/prompts/mapping-reviewer.md`

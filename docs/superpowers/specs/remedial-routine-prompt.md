# Remedial Batch 자동 재개 루틴 프롬프트

이 문서는 `/schedule` 로 등록할 루틴의 자기완결 프롬프트다.
다음 세션은 이 컨텍스트가 전혀 없으므로 모든 절차가 명시되어 있어야 한다.

**실행 환경**: Anthropic 클라우드 (CCR). 작업 디렉터리는 clone 된 repo 루트. 로컬 워크트리 경로 사용 금지.

---

## 루틴 메타

- **name**: `remedial-batch-auto`
- **cron_expression**: `13 */4 * * *` (매 4시간 UTC. 서울: 9:13/13:13/17:13/21:13/1:13/5:13)
- **branch**: `claude/agitated-jackson-08304c`
- **model**: `claude-sonnet-4-6`

---

## 자기완결 프롬프트 (이대로 루틴에 박힘)

```
DASIDA remedial content pipeline 자동 재개 작업 (CCR 클라우드 환경).

## 0. 환경 셋업

작업 디렉터리는 clone 된 repo 루트.

# 작업 브랜치 체크아웃
git fetch origin
git checkout claude/agitated-jackson-08304c
git pull origin claude/agitated-jackson-08304c

# 의존성 (이미 설치돼 있어야 함, 없으면 설치)
which tsx || npm install -g tsx

# 시작 알림
npm run notify:start -- "auto: remedial batch (CCR)"

## 1. 다음 작업 확인

tsx scripts/remedial-pipeline/check-triggers.ts

nextAction 처리:
- "done" → 알림 6 (최종 완료) 발송, git push, 종료
- "backfill" → 누락 게이트 약점부터 1개씩 처리
- "main" → queue 첫 3개를 가져와 병렬 처리

## 2. 약점 3개 병렬 처리 — 역할 분리 (중요)

**도우미는 파일 생성만. 채점 절대 금지. 메인이 직접 채점관 호출.**

### 2a. 키워드 추가 + 매핑 재생성 (메인이 직렬)

3개 약점에 대해 각각:
- scripts/remedial-pipeline/keywords.ts 에 키워드 5-10개 추가
  (실제 시험 데이터 grep 으로 확인: grep -rh --include='explanations.json' -o '"intent":[[:space:]]*"[^"]*"' data/exam/ | grep -F "<키워드>" | wc -l)
- 매핑 ≥10건이면 이상적. 미달이면 키워드 확장 1회 시도.

3개 키워드 다 추가 후:
tsx scripts/remedial-pipeline/map-intent-to-weakness.ts

**매핑 부족해도 자동 진행** (spec content-author.md §"매핑된 사례 활용" — "사례 0건이어도 진행 가능. ... feedback 문장과 약점 정의만으로 작성"):
- 매핑 사례 수 무관하게 콘텐츠 작성 진행
- 매핑 0건/소량인 경우 → 작성자(도우미) 는 review-content-map.ts 의 해당 엔트리 (heroPrompt + thinkingSteps + feedback 문장) + diagnosisMap.ts 의 desc/tip 만으로 작성
- 실패 처리 X (이전 rationalization_error 처럼 수동 경로로 진행)
- 매핑 부족은 작성 난이도 ↑ 일 뿐, 차단 사유 아님

### 2b. 도우미 3명 병렬 dispatch (Agent 도구)

한 메시지에 3개 Agent 도구 호출 (model: opus, subagent_type: general-purpose).

각 도우미 프롬프트 (이대로):

---
DASIDA 보완 흐름 파일 생성만. 채점·평가·게이트 호출 절대 금지.

약점:
- weaknessId: <ID>
- prefix: <3글자 약어>
- depth: <shallow 또는 deep>

먼저 Read:
1. scripts/remedial-pipeline/prompts/content-author.md
2. data/remedial-flows/formula_understanding.ts (shallow) 또는 data/remedial-flows/calc_repeated_error.ts (deep)
3. data/review-content-map.ts 의 <weaknessId> 엔트리
4. scripts/remedial-pipeline/intent-weakness-map.json 의 <weaknessId> 사례 5개 정도
5. data/diagnosisMap.ts 의 <weaknessId> 엔트리

data/remedial-flows/<weaknessId>.ts 작성:
- 6 진입점 (step별 오답 2개씩)
- ExplainNode + CheckNode + ExitNode (shallow) 또는 + DiagnoseNode + SummaryNode (deep)
- 각 ExplainNode 진입점에 summary + triggers 메타데이터
- body ≤ 3문장 (shallow) 또는 ≤ 5문장 (deep), 친근한 존댓말 (~예요/~해요)
- 6등급 학생 기준 — 단원 안 세부 용어 (도함수, 변곡점, 볼록, 공통인수 등) 첫 등장 시 한 줄 정의 동봉
- 영어 단어 금지

응답 JSON (이것만):
{
  "filePath": "data/remedial-flows/<weaknessId>.ts",
  "nodeCount": <int>,
  "prefix": "<prefix>"
}

금지: status/gatesPassed/verdict 같은 채점 필드. 추가하지 마.
---

### 2c. 채점관 6명 호출 (메인이 직접) — 각 약점별 5명 병렬 + sympy

3개 약점이 도우미에서 돌아오면, 각 약점마다:

**A. 5명 병렬 호출** (한 메시지에 5개 Agent 도구 호출, model: opus):

- math-teacher (페르소나: scripts/remedial-pipeline/prompts/math-teacher.md)
- struggling-student (페르소나: scripts/remedial-pipeline/prompts/struggling-student.md)
- appearance-reviewer (페르소나: scripts/remedial-pipeline/prompts/appearance-reviewer.md, depth 명시)
- remedial-flow-reviewer (페르소나: scripts/remedial-pipeline/prompts/remedial-flow-reviewer.md, 시작 노드 6개 나열)
- thinkingstep-flow-reviewer (페르소나: scripts/remedial-pipeline/prompts/thinkingstep-flow-reviewer.md, 대상: review-content-map.ts 의 해당 엔트리)

각 호출: "DASIDA <게이트명> 검수. 대상: <파일 경로>. 페르소나: <경로>. Read 후 페르소나 명시 JSON 만 코드펜스로 출력."

**B. sympy** — math-teacher 응답의 equationsToVerify JSON 으로:

echo '<JSON>' | python3 scripts/remedial-pipeline/verify-formulas.py

3개 약점 총 채점관 호출: 5명 × 3약점 = 15 병렬 호출 (또는 약점별 5명씩 3번 직렬, 토큰 상황 따라).

### 2d. 거절 처리 (Level 3 자율 — 사용자 질문 금지)

각 약점:
- 모두 approve/pass: 통과
- 일부 reject: 메인이 직접 Edit 도구로 본문 수정 → 영향 받는 게이트 재호출
- 3회 재시도 상한. 후에도 reject: manualReview 로 record-complete

### 2e. 통과 시 등록 + 커밋

각 통과 약점:
- data/review-remedial-flows.ts 에 import + remedialFlows 객체 추가
- data/review-content-map.ts 의 오답 choice 에 remedialFlowStartNodeId + weaknessId 연결
- 모든 변경 모이면:
  npm test -- data/review-remedial-flows.test.ts data/review-content-map.test.ts
  git add -A
  git commit -m "feat(remedial): <약점 ID 들> 6게이트 통과 + 등록"

### 2f. 상태 기록

각 약점:
tsx scripts/remedial-pipeline/record-complete.ts --id <weaknessId> --result passed \
  --gates 'math-teacher,struggling-student,sympy,appearance-reviewer,remedial-flow,thinkingstep-flow' \
  --retries <N> --tokens <est>

manualReview 의 경우:
  --result manual-review --gates '<통과한 게이트만>' --rejection-gate <게이트명> --rejection-reason <한 줄>

state.json 변경분도 commit (state.json 은 git 추적 대상).

## 3. 트리거 처리

check-triggers 출력의 triggers 배열 확인:
- "progress_report" → tsx scripts/remedial-pipeline/progress-report.ts
- "drift_check" → 별도 처리 또는 슬랙 알림

## 4. push + 종료

git push origin claude/agitated-jackson-08304c

npm run notify:done -- "auto: <X>개 처리 완료 (passed/manualReview), 다음 약점: <ID>"

## 절대 지키기

- 사용자 질문 금지 (Level 3 자율 결정)
- 도우미한테 채점 시키기 금지 (자체 평가 = 거짓 보고)
- 메인이 6 게이트 직접 호출
- 거절 시 메인이 직접 Edit 수정
- 모든 변경은 git commit + push (state.json 포함)
- 토큰 한도 도달 시 자연 정지 (state.json 커밋 후 push 만 하고 종료)
- 절대경로 사용 금지 (CCR 환경에서 /Users/baggiyun 같은 경로 존재 안 함). 모든 경로는 repo 루트 기준 상대경로.

## 참고 파일 (repo 루트 기준)

- 전체 spec: docs/superpowers/specs/2026-05-13-remedial-content-pipeline-design.md
- 게이트 레지스트리: scripts/remedial-pipeline/gates.ts
- 작성자 가이드: scripts/remedial-pipeline/prompts/content-author.md
- 학생 페르소나 (단원 이름 규칙 포함): scripts/remedial-pipeline/prompts/struggling-student.md
- shallow 패턴: data/remedial-flows/formula_understanding.ts
- deep 패턴: data/remedial-flows/calc_repeated_error.ts
```

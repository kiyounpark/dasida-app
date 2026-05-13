# 복습 보완 콘텐츠 작성 파이프라인 설계

**작성일**: 2026-05-13
**개정**: 2026-05-13 (시범 약점 1개 풀 사이클 완료, §7 TBD 채택, §9 다음 행동 갱신)
**상태**: 시범 구현 완료 — 56개 일괄 확장 준비
**대상**: `data/remedial-flows/*`, `data/review-remedial-flows.ts`, `data/review-content-map.ts`

> 시범 약점 `discriminant_calculation` 1개 풀 사이클 완료. 3 게이트(수학 교사 / 수포자 학생 / sympy)가 1회 재시도로 수렴. 본 spec은 그 결과로 TBD 항목을 채택한 결정사항으로 교체하고, 다음 단계를 56개 일괄(조기 정지 게이트 포함)로 정의한다.

---

## 1. 배경

[2026-05-12 routed-chat spec §10.1](2026-05-12-review-session-routed-chat-design.md)에 따르면 복습 세션의 보완(remedial) 노드 그래프는 `formula_understanding` 한 약점만 구현돼 있고, 나머지 **약점 56개**(`basic_concept_needed` 폴백 제외)는 비어있다. spec은 약점 1개당 4단계 작업을 정의한다:

> **(a) 노드 그래프 설계 → (b) 본문 작성 → (c) `summary` / `triggers` 메타데이터 → (d) 검증**

본 spec은 이 4단계를 **수포자 창업자가 직접 수학 판단 없이 운영 가능한 6단계 파이프라인**으로 확장한다.

---

## 2. 핵심 제약 조건

- 작성자는 수학적 판단 능력이 없다 (자칭 수포자). 콘텐츠 정확성·교육 효과성을 직접 검증 못 함.
- 외부 인력(수학 교사·실제 학생) 활용 불가.
- Codex 미결제. Claude Code(Opus 4.7)만 사용 가능.

→ 결론: **검증을 시스템(서브에이전트 + 결정론적 도구 + 신뢰 출처)에 위임**한다. 작성자는 파이프라인 운영자 역할만 수행.

---

## 3. 신뢰 출처: 기존 시험 풀이 데이터

[data/exam/](../../data/exam/)에 이미 추출된 자료:
- **57개 시험 × 약 30문제 = 약 1,700 풀이 데이터**
- 수능·학력평가·모의고사 공식 출제 (EBS·학원 자료보다 신뢰도 높음)
- 한글 풀이 흐름(`intent` 필드)은 살아있고 수식은 깨짐 → 흐름만 활용, 수식은 sympy로 별도 검증

활용: 약점별로 관련 문제 풀이를 묶어 Claude의 생성 컨텍스트로 주입.

---

## 4. 파이프라인 (7단계, 4 게이트)

```
[0] 약점 ↔ 시험 문제 매핑
    1,700 풀이의 intent 텍스트를 56개 약점으로 분류 (키워드 포함 매칭)
    → 약점당 평균 사례 묶음 확보
                ↓
[1] 메인 Claude(Opus)가 약점 1개의 노드 그래프 + 본문 + 메타데이터 생성
    - 입력: 약점 ID, 매핑된 풀이 사례, formula_understanding 패턴, content-author 시스템 프롬프트
    - 출력: data/remedial-flows/<weaknessId>.ts 초안
                ↓
[2] Opus 서브에이전트 1 — "수학 교사 페르소나"
    - 수식·논리 정확성 검수
    - 출력: { verdict, issues[], equationsToVerify[] }
    - 통과 기준: verdict=approve AND blocker 0개
                ↓
[3] Opus 서브에이전트 2 — "수포자 학생 페르소나"
    - 이해 가능성 검수
    - 출력: { verdict, perNode[{ state: understood|confused|bored }] }
    - 통과 기준: verdict=approve AND confused 0개
                ↓
[4] sympy(Bash 도구) — 수식 결정론적 검증
    - 입력: 교사가 추출한 equationsToVerify JSON 배열
    - 통과 기준: 모든 식 ok=true
                ↓
[5] Opus 서브에이전트 3 — "외형 검수 페르소나" (56개 확장 phase 신규)
    - 한글 깨짐·분량(≤3문장)·구조·톤 자동 점검
    - 출력: { verdict, issues[{ criterion }] }
    - 통과 기준: verdict=approve AND issues 0개
                ↓
[6] 4개 게이트 다 통과 → 채택
    하나라도 NG → [1]로 거절 사유와 함께 회귀 (최대 3회 재시도)
                ↓
[7] 채택 시 등록
    - data/review-remedial-flows.ts 의 remedialFlows 에 등록
    - data/review-content-map.ts 의 오답 Choice 에 remedialFlowStartNodeId + weaknessId 연결
    - 무결성 테스트(`review-remedial-flows.test.ts`) PASS 확인
```

---

## 5. 시범 약점 (완료)

**`discriminant_calculation`** (이차방정식 판별식) — 2026-05-13 풀 사이클 완료.

결과:
- 매핑 사례: **44건** (threshold 10건 초과)
- 콘텐츠 노드: 24개 (6 explain main + 3 easy + 6 check + 6 remedy + 3 exit)
- 재시도 1회로 수렴 (1차 시도: 학생 페르소나 거절 — 용어 정의 누락; 2차 시도: 모든 게이트 통과)
- 무결성 테스트: 10/10 PASS

---

## 6. 시범 1개 풀 사이클의 성공 기준 (완료 표시)

- [x] [0] 매핑: `discriminant_calculation` 사례 44건 ≥ 10
- [x] [1] 생성: `data/remedial-flows/discriminant_calculation.ts` 산출
- [x] [2] 교사 페르소나: 명확한 JSON 판정 + equationsToVerify 추출
- [x] [3] 학생 페르소나: 명확한 perNode 판정 (1차 reject → 2차 approve)
- [x] [4] sympy: 6/6 식 모두 ok=true
- [x] [5] 피드백 루프 수렴 (1회 재시도)
- [x] [6] 등록 + 무결성 테스트 10/10 PASS
- [ ] 시뮬레이터 수동 QA — **batch 단계로 이관** (Phase 2 라우터가 콘텐츠와 독립적으로 검증된 상태라 약점 추가마다 시뮬 QA 반복은 비효율적. §9.5 참조)

---

## 7. 채택된 결정사항

(시범 1개 풀 사이클로 검증된 항목들)

### 7.1 Opus 서브에이전트 페르소나 프롬프트
- 수학 교사: [`scripts/remedial-pipeline/prompts/math-teacher.md`](../../scripts/remedial-pipeline/prompts/math-teacher.md)
- 수포자 학생: [`scripts/remedial-pipeline/prompts/struggling-student.md`](../../scripts/remedial-pipeline/prompts/struggling-student.md)
- 콘텐츠 작성자: [`scripts/remedial-pipeline/prompts/content-author.md`](../../scripts/remedial-pipeline/prompts/content-author.md)

### 7.2 합격선
- **수학 교사 게이트:** `verdict: "approve"` AND `issues[]`에 `severity: "blocker"` 0개
- **수포자 학생 게이트:** `verdict: "approve"` AND `perNode[]`에 `state: "confused"` 0개 (bored는 minor, 통과)
- **sympy 게이트:** 모든 `equationsToVerify` 항목이 `ok: true`

### 7.3 sympy 호출 형식
- 스크립트: [`scripts/remedial-pipeline/verify-formulas.py`](../../scripts/remedial-pipeline/verify-formulas.py)
- 입력: stdin으로 `[{ id, lhs, rhs }, ...]` JSON 배열 (lhs/rhs는 Python sympy 표기: `x**2`, `*`, `**`)
- 출력: `[{ id, ok: bool, reason }, ...]`
- 부등식·정의문은 검증 불가 → 교사 페르소나가 `equationsToVerify`에서 제외

### 7.4 매핑 알고리즘
- 키워드 포함 매칭: [`scripts/remedial-pipeline/keywords.ts`](../../scripts/remedial-pipeline/keywords.ts)에 약점별 키워드 사전 정의
- 스크립트: [`scripts/remedial-pipeline/map-intent-to-weakness.ts`](../../scripts/remedial-pipeline/map-intent-to-weakness.ts)
- 실측: discriminant_calculation 8개 키워드 → 44건 매핑. 임베딩·LLM 분류는 56개 확장 결과를 보고 재평가

### 7.5 피드백 루프 재시도 상한
- 약점 1개당 **최대 3회** 재시도
- 도달 시 사람(작성자) 검토 큐로 이관, plan 일시 중단

### 7.6 토큰값 실측
시범 1개 풀 사이클 누적:
- 콘텐츠 작성 (1차): ~67K
- 콘텐츠 수정 (2차, 1회 retry): ~59K
- 교사 게이트 (×2): ~55K + ~52K
- 학생 게이트 (×2): ~51K + ~51K
- 등록 + 테스트: ~47K
- **합계 약 380K 토큰/약점**

56개 일괄 예상치: **~21M 토큰** (조기 정지 게이트 없이 모두 1회 retry 가정. 실제론 retry율에 따라 변동).

### 7.7 출처 메타데이터 형식
- 채택본의 파일 상단 docblock에 매핑 출처(examId + 문제 번호) 기록 (선택)
- 본 시범에서는 적용 안 했음. 56개 확장 시 자동 삽입 여부 결정.

---

## 8. 범위 밖 (Non-goals, 본 phase)

- 실제 학생·교사 검증 (현 제약상 불가)
- 학생 사용 로그 기반 콘텐츠 튜닝 (출시 후 별도 phase)
- `basic_concept_needed`(폴백 약점) 콘텐츠 작성
- Phase 2 routed-chat 라우터 튜닝 (별도 phase)

---

## 9. 다음 행동: 56개 일괄 + 조기 정지 게이트

원래 계획의 "3개 batch 다양성 검증" 단계는 **생략**한다. 이유:
- 약점 1개당 3 게이트가 독립적으로 작동 → batch 단위 실패 없음
- 약점 1개 실패는 그 약점만 재시도 큐로 이관, 다른 약점 영향 없음
- 3 batch는 사실상 56 일괄 중간 샘플링과 동등

대신 **조기 정지 게이트**로 시스템적 결함(파이프라인 전반 영향)을 일찍 감지:

### 9.1 56개 일괄 실행 워크플로우 (별도 plan)

1. 56개 약점 키워드 사전 채우기 ([`scripts/remedial-pipeline/keywords.ts`](../../scripts/remedial-pipeline/keywords.ts) 확장)
2. 매핑 분포 점검: 약점별 사례 수, 사례 0건 약점 식별
3. 56개 순차 실행 (병렬 가능 약점은 dispatch 단계에서 결정). 각 약점마다 §4 파이프라인 적용
4. 결과를 약점별 상태 큐로 분류: `passed` / `manual-review` / `failed`

### 9.2 조기 정지 게이트 (필수)

다음 조건 하나라도 충족 시 일괄 작업 즉시 중단:
- **처음 10개 약점 중 5개 이상이 3회 재시도 후에도 게이트 통과 못 함** → 시스템적 결함 의심
- **누적 토큰 비용이 예상치(§7.6의 ~21M)의 2배 초과** → 토큰 폭주 (retry율 폭증)
- **특정 게이트가 10개 연속 같은 사유로 거절** → 페르소나 또는 sympy 사각지대

중단 시: 사람(작성자)에게 보고 → 원인 분석 → 페르소나 프롬프트 / sympy 스크립트 / 키워드 사전 수정 → 재개.

### 9.3 결과 분류 + 사람 검토 큐

각 약점 처리 결과는 다음 중 하나:
- `passed`: 3 게이트 통과 후 자동 등록 → 56개 batch 끝까지 그대로 진행
- `manual-review`: 3회 재시도 후에도 통과 못 함 → 검토 큐로 이관, 다음 약점으로 진행 (멈춤 없음)
- `failed`: 매핑 사례가 0건 등 사전 조건 미충족 → 키워드 사전 정밀화 후 재시도

### 9.4 진행률 보고 (자동, 사용자 부담 0)

매 **5개 약점 완료마다** 자동 보고. 사용자는 보기만, 결정 없음. 양식:

```
📊 진행: <N>/56 약점 (X%)
✅ 통과: <N>개
🟡 검토큐: <N>개 (사후 처리 대상)
🔴 실패: <N>개 (매핑 0건 등)
⏱️ 누적 토큰: <X>M / 21M 예산 (X%)
🔁 평균 재시도: <X>회
```

### 9.5 자동 외형 검수 (4번째 게이트)

수학·이해 게이트가 잡지 못하는 외형 이슈(한글 깨짐, 분량 초과, 톤 일탈, 구조 비대칭)를 자동으로 잡는 4번째 게이트. 약점 1개당 자동 작동.

- **페르소나 프롬프트:** [`scripts/remedial-pipeline/prompts/appearance-reviewer.md`](../../scripts/remedial-pipeline/prompts/appearance-reviewer.md)
- **모델:** Opus
- **검수 항목 4가지:**
  1. 한글 깨짐 (`?`, `??`, U+FFFD 등)
  2. 분량 (모든 `body` ≤ 3문장)
  3. 구조 (formula_understanding 패턴: 노드 ID 컨벤션, summary+triggers, nextNodeId 무결성)
  4. 톤 (사용자 기준 B 채택 — 친근한 존댓말 + 캐주얼 표현 OK / 명령조·반말·격식 남발 거절)
- **출력:** `{ verdict, issues[{ nodeId, criterion, issue, suggestion }] }`
- **합격선:** `verdict: "approve"` AND `issues[]` 비어있음
- **거절 시:** 다른 게이트와 동일하게 피드백 루프 → 콘텐츠 작성자가 거절 사유 수정 → 재시도 (3회 상한)

### 9.6 드리프트 검수 (10개 단위 자동)

콘텐츠 작성이 batch 중반·후반으로 갈수록 톤·구조가 baseline에서 멀어지는 현상(드리프트) 자동 감지. 사용자 부담 0, alert 시에만 결정 필요.

- **트리거:** 매 10개 약점 통과 시점
- **방식:** Opus 서브에이전트가 **최근 10개 통과 콘텐츠**와 **baseline (첫 5개 + formula_understanding)** 을 비교
- **감지 항목:**
  - 톤 드리프트 (예: 최근 10개에 명령조 표현 다수 출현)
  - 분량 드리프트 (예: baseline 평균 2.1문장 → 최근 평균 3.8문장)
  - 구조 드리프트 (예: 노드 수 비정상 증가, summary 누락 빈도 상승)
- **출력:** `{ verdict: "ok"|"drift", patterns[{ kind, baseline, recent, samples }] }`
- **합격 시:** 조용히 다음 batch 진행
- **드리프트 감지 시:** §9.7 Type 2 alert 트리거

### 9.7 사용자 alert 양식 (3종)

본인 손이 들어가는 유일한 시점. 자동 파이프라인이 알아서 못 결정하는 경우만 alert.

#### Type 1 — 검토큐 추가 (정보 알림, 결정 X)

```
🟡 검토큐 추가: <weaknessId>
사유: <게이트명> 3회 연속 거절 — <대표 거절 사유 1줄>
다음 약점으로 계속 진행 중 (멈춤 X).
사후 처리: batch 끝나면 일괄 정리.
```

본인은 보고만. 응답 불필요.

#### Type 2 — 드리프트 감지 (결정 필요)

```
⚠️ 드리프트 감지 (<N>번째 약점 시점)
패턴: <kind>: baseline <X> → 최근 <Y>
원인 추정: <한 줄>
권장 액션:
  A. 계속 진행 (이미 통과한 콘텐츠 유지)
  B. 멈춤 + 작성자 프롬프트 강화 후 재개
  C. 멈춤 + 최근 N개 재생성

본인 선택? (A/B/C)
```

본인 응답: A/B/C 중 하나.

#### Type 3 — 조기 정지 게이트 발동 (즉시 멈춤)

§9.2의 3개 멈춤 조건 중 하나 충족 시.

```
🚨 STOP — 조기 정지 발동
사유: <조건 인용>
패턴 분석: <게이트별 거절 분포 + 약점 카테고리별 분포>
원인 추정: <한 줄>
권장 액션:
  A. <원인 직접 수정 — 예: sympy 스크립트에 ∫ 파싱 추가 (10분)>
  B. <부분 수정 — 예: 특정 카테고리만 우회>
  C. 검토큐로 두고 재개 (사후 처리)

본인 선택? (A/B/C)
```

본인 응답: A/B/C 중 하나 + 후속 작업.

### 9.8 시뮬레이터 QA (batch 끝에서 1회)

56개 완료 후 또는 중간에 의미 있는 단위(예: 20개)가 모이면 시뮬레이터에서 1번 점검:
- 빌드: `npm install && npx expo run:ios` (네이티브 변경 없으면 prebuild --clean 불필요)
- DEV 메뉴에서 약점별 mock 진입로 (`__mock_<prefix>__`) 추가 후 샘플 5개 약점에 대해:
  - 시나리오 A: 자유 입력 → 보완 노드 등장
  - 시나리오 E: "모르겠어요" → 정적 노드 이동
  - 시각적 회귀 (한글 렌더링·레이아웃) 점검
- (시나리오 B는 라우터 콘텐츠와 무관 → 생략 가능)

### 9.9 출시 후 (별도 phase)

- 실제 학생 사용 로그에서 약점별 보완 진입 빈도·이탈 지점 분석
- 자주 진입하지만 학생이 이탈하는 약점 → 콘텐츠 재작성 큐
- 학생 자유 입력 로그 → 라우터 `triggers` 추가 후보

---

## 10. 참고 자료

- 시범 plan: [`docs/superpowers/plans/2026-05-13-remedial-content-pipeline-pilot.md`](../plans/2026-05-13-remedial-content-pipeline-pilot.md)
- 참조 패턴: [`data/remedial-flows/formula_understanding.ts`](../../data/remedial-flows/formula_understanding.ts)
- 시범 산출물: [`data/remedial-flows/discriminant_calculation.ts`](../../data/remedial-flows/discriminant_calculation.ts)
- 상위 spec: [2026-05-12 routed-chat design §10.1](2026-05-12-review-session-routed-chat-design.md)

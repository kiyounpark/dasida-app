# Remedial Pilot — `calc_repeated_error` 결과

**시범 기간**: 2026-05-14
**시범 약점**: `calc_repeated_error` (계산 실수 반복)
**분류**: deep

---

## 처리 요약

| 단계 | 결과 |
|---|---|
| ThinkingStep 자동 교정 | 0회 (1차 audit에서 approve, blocker 0개) |
| 보완 흐름 작성 | 48 노드, 6 진입점 (3 step × 2 wrong choice) |
| 5 게이트 재시도 | 2회 (1차 → 2개 게이트 reject → 재작성 → 1개 게이트 잔여 → 3차 재검수 → 전 게이트 통과) |
| 최종 노드 분포 | explain 24 / check 6 / diagnose 12 / summary 3 / exit 3 |
| 무결성 테스트 | review-remedial-flows.test.ts 6 PASS / review-content-map.test.ts 7 PASS |

---

## 게이트별 코멘트 요약

### ✅ 수학 교사 (1차 통과)
- 0 blockers, 0 minors
- 22 equations 추출 → 100% sympy 통과
- `(−2)² = 4` vs `−2² = −4`, `g(−3) = (−3)² = 9`, `f(−1) = 1 − 3 − 1 = −3` 등 전부 정확

### ✅ 외형 검수자 (1차 통과)
- 4개 기준 (한글/분량/구조/톤) 모두 PASS
- 0 issues

### ✅ sympy (1차 통과)
- 22/22 등식 ok=true
- 결정론적 수식 검증 완료

### ✅ 수포자 학생 (3차 통과)
- 1차: 19 confused (reject) — 함수 표기·수학 용어 미정의
- 2차: 2 confused (reject) — terminology 통일 누락 ("항별로" 잔재)
- 3차: 0 confused (approve)
- **3차 통과 이유**: 1차 후 함수 표기 gloss 추가, "항"→"덩어리"/"치환"→"x 자리에 값을 넣기"/"검산"→"한 줄씩 다시 짚기" 등 18개 노드 풀어쓰기. 2차 후 잔여 "항별로" 2건 마저 통일.

### ✅ 보완 흐름 검수자 (2차 통과)
- 1차: 8 issues (reject) — pinpoint `secondaryNextNodeId`가 `summary`로 직행 (약점 해소 검증 누락) × 7건 + 분기 의미 부재 × 1건
- 2차: 0 issues (approve)
- **2차 통과 이유**: 12개 pinpoint 노드의 `secondaryNextNodeId`를 sibling pinpoint 또는 check로 변경 → "모르겠어요" 학생도 retry 경로로 들어감. `calc_step3_C_diagnose` body의 결론 제시 제거.

---

## 발견된 시스템 이슈

### 1. content-author 페르소나 prompt 누락 — 함수 표기/수학 용어 가이드

1차 작성에서 6등급 학생에게 막막한 표현(`f(x)`, `항`, `치환`, `연산 우선순위`)이 그대로 들어감. 페르소나가 "친근한 존댓말"은 보장하지만 "용어 풀어쓰기"는 가이드 안 함.

**조치 제안**: `content-author.md` §C 톤 절에 다음 한 줄 추가:
> 수학 용어가 등장하면 즉시 풀어쓰거나 한 번에 정의. 예: `f(x)` → "f(x) = ... 같은 식 (x 자리에 값을 넣어 결과를 구하는 식)이에요". 항, 합산, 상수, 치환 등도 마찬가지.

### 2. content-author 페르소나 prompt 누락 — secondaryNextNodeId 패턴 가이드

1차에서 pinpoint 노드의 `secondaryNextNodeId`를 무심코 `summary`로 직행하게 만듦 → "모르겠어요" 학생이 검증 없이 종료됨.

**조치 제안**: `content-author.md` §B에 deep 흐름의 retry 경로 명시:
> pinpoint 노드의 `secondaryNextNodeId` = sibling pinpoint 또는 check (재시도). summary로 직행 금지 — 학생이 모르겠다고 한 직후 약점 해소 검증 없이 끝나면 안 됨.

### 3. terminology 일관성 — 한 약점 내 동의어 통일

문서 곳곳에 "항" 과 "덩어리"가 혼재해 2차 reject 야기. 한 약점 내에서 같은 개념은 하나의 표현으로 통일해야 함.

**조치 제안**: content-author.md에 "한 weaknessId 내에선 동의어 통일" 한 줄 추가, 또는 별도 게이트로 동의어 충돌 검수.

---

## §0 분류 정책 검증

- **`calc_repeated_error` 분류**: deep ✅
- **분류 기준 검증**:
  - 약점 desc 키워드("실수")만 보면 shallow 후보로 보이지만, 실제 검수 결과 deep이 적절
  - 1차 1-shot으로 작성했다면 학생이 같은 실수 사유로 또 빠질 가능성 — diagnose가 사유 분기 가능
  - 6 진입점 × 사유별 분기가 의미 있음 (단순 실수 vs 개념 부재 vs 시간 압박 등)
- **본 배치 분류 가이드 갱신**:
  - 단순 "실수"라도 사유가 여러 가지면 deep
  - 사유가 단일하다면 shallow (단순 부호 빠뜨림 같은 mechanical error)
  - 시범 1개로는 단정 어려움 — 본 배치 진입 시 2~3개 더 시범 권장

---

## 토큰 추정 갱신 (본 스펙 §7.6)

### 실측 (calc_repeated_error)

| 항목 | 토큰 (대략) |
|---|---|
| Task 1~4 (코드 작업) | ~200K |
| Task 5 (ThinkingStep 감사) | ~30K |
| Task 6 (키워드 + 매핑) | ~120K |
| Task 7 (deep 흐름 작성, 1차) | (controller 직접 작성) |
| Task 7 (수정 1, 2) | ~50K + ~60K |
| Task 8 (1차 5 게이트) | ~250K |
| Task 8 (2차 재작성 + 재검수) | ~150K |
| Task 8 (3차 terminology 수정 + 재검수) | ~80K |
| Task 9 (등록 + 테스트) | ~130K |
| **합계 (대략)** | **~1.07M 토큰** |

### deep 약점 1개 평균 추정

- 본 시범: ~1.0~1.1M (initial 작성이 controller 직접이라 일부 절약)
- subagent 전체 작성 + 평균 1.5회 게이트 재시도 가정: **~1.3~1.5M/약점**
- 본 스펙 §7.6 deep 추정 "~1.5M" 가설 검증됨

### 53개 본 배치 (deep 비율 가정)

- 전부 deep (보수적): ~80M
- 절반 shallow (380K) + 절반 deep (1.5M): ~50M
- Claude Code 한도 도달 빈도: deep 1회당 한도 일부, 약 5~8 약점마다 한 번 자연 정지 예상

---

## 다음 단계 결정

### (a) 본 배치 진입 가능
사유: 5 게이트 + 자동 교정 시스템이 작동함을 입증. 시범 결과 deep 1.5M 토큰 추정도 합리적.

### (b) 시범 1~2개 추가 권장
사유: §0 분류 정책 검증을 위해 다른 약점(개념 오해 계열 / 단순 실수 계열) 시범하면 분류 기준 정밀화 가능.
- 후보: `min_value_read_confusion` (개념 오해) — deep으로 분류 검증
- 후보: `radical_simplification_error` (계산 실수) — shallow 후보 검증

### (c) 기존 시범 2개 (formula_understanding, discriminant_calculation) 재작성
사유: 현재 1-shot 상태. 이번 시범 결과 deep 효과가 입증됐다면 두 약점도 분류 후 (deep 분류 시) 재작성.
- 결정: 분류 기준 확정 (전체 약점 분류 후) 다음에.

---

## 추천 다음 단계

1. **본 스펙 §0.2 분류 기준에 본 시범 결과 반영** (시범 1개로 분류 기준 가설 검증)
2. **content-author.md 갱신** (위 시스템 이슈 1, 2, 3에 대응)
3. **시범 1~2개 추가** (옵션 b 권장) — 분류 기준 정밀화
4. **본 배치 진입** — 키워드 일괄 작성 → 55 약점 배치

---

## 시범 산출물

- 보완 흐름: `data/remedial-flows/calc_repeated_error.ts` (48 노드, registered)
- 게이트 결과: `scripts/remedial-pipeline/pilot/gate-results/{math-teacher,struggling-student,appearance-reviewer,remedial-flow-reviewer,sympy}.json`
- ThinkingStep audit: `scripts/remedial-pipeline/pilot/thinkingstep-review-result.json`
- 매핑: `scripts/remedial-pipeline/intent-weakness-map.json` (calc_repeated_error: 48건)

---

## 커밋 로그 (시범 관련)

```
221fa23 test(gates): struggling-student final re-review of calc_repeated_error
dc9c119 fix(remedial): unify 항별→덩어리별 terminology in step3
e034567 test(gates): remedial-flow-reviewer re-review of calc_repeated_error
19e7e6c test(gates): struggling-student re-review of calc_repeated_error
7abb882 fix(remedial): apply gate feedback to calc_repeated_error
(sympy + 4 gates 1차 커밋들)
611cc37 feat(remedial): draft calc_repeated_error deep flow (pre-gates)
86b216e feat(remedial): add calc_repeated_error keywords + mapping
4c753e2 test(thinkingstep): audit calc_repeated_error — approved without edits
2579313 feat(review-session): wire DiagnoseNode and SummaryNode into renderer
795384f feat(review-session): add RemedialSummaryCard UI
c5b0fe4 feat(review-session): add RemedialDiagnoseCard UI
e723923 feat(remedial): add DiagnoseNode and SummaryNode types for deep flow
79db3f6 feat(remedial): register calc_repeated_error deep flow
```

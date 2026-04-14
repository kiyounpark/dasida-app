# 진단 플로우 — 상위 4개 풀이법 추가 (1단계) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `diagnosisTree`에 미등록된 4개 풀이법(sequence, log_exp, conic, limit)을 추가해 선택 버튼 없는 780문제 중 640문제(82%)를 해결한다.

**Architecture:** 코드 로직 변경 없음. 3개 데이터 파일에 엔트리 추가만으로 완성. g3_ 약점 ID는 `checkPromptByWeakness`에 미등록이므로 `hasCheckNode = false` → explain → final 직접 연결 (g2 메서드와 동일한 짧은 흐름).

**Tech Stack:** TypeScript, Expo/React Native

---

## 변경 파일 목록

| 파일 | 변경 유형 | 변경 내용 |
|------|---------|---------|
| `data/diagnosisTree.ts` | Modify | SolveMethodId union + methodOptions + diagnosisTree 4개 추가 |
| `data/detailedDiagnosisFlows.ts` | Modify | methodFallbackWeakness에 4개 추가 |
| `data/diagnosis-method-routing.ts` | Modify | diagnosisMethodRoutingCatalog에 4개 추가 |

---

### Task 1: diagnosisTree.ts — SolveMethodId + methodOptions + diagnosisTree 추가

**Files:**
- Modify: `data/diagnosisTree.ts:3-19` (SolveMethodId union)
- Modify: `data/diagnosisTree.ts:38-55` (methodOptions 배열)
- Modify: `data/diagnosisTree.ts` (diagnosisTree Record 끝에 추가)

- [ ] **Step 1: SolveMethodId union에 4개 추가**

`data/diagnosisTree.ts`의 `SolveMethodId` 타입 끝 `| 'counting';` 바로 앞에 4개 추가:

```typescript
export type SolveMethodId =
  | 'cps'
  | 'vertex'
  | 'diff'
  | 'unknown'
  | 'factoring'
  | 'quadratic'
  | 'radical'
  | 'polynomial'
  | 'complex_number'
  | 'remainder_theorem'
  | 'set'
  | 'proposition'
  | 'trig'
  | 'integral'
  | 'linear_eq'
  | 'counting'
  | 'sequence'
  | 'log_exp'
  | 'conic'
  | 'limit';
```

- [ ] **Step 2: methodOptions 배열에 4개 추가**

`data/diagnosisTree.ts`의 `methodOptions` 배열에서 `{ id: 'unknown', labelKo: '잘 모르겠어' },` 바로 앞에 4개 추가:

```typescript
  { id: 'sequence', labelKo: '수열' },
  { id: 'log_exp', labelKo: '지수·로그' },
  { id: 'conic', labelKo: '이차곡선' },
  { id: 'limit', labelKo: '극한' },
```

- [ ] **Step 3: diagnosisTree Record에 4개 추가**

`data/diagnosisTree.ts`의 `diagnosisTree` Record 닫는 `};` 바로 앞에 추가:

```typescript
  sequence: {
    methodId: 'sequence',
    prompt: '수열 문제에서 어디가 가장 막혔나요?',
    choices: [
      {
        id: 'seq_general',
        text: '일반항 aₙ 공식(등차·등비)을 어디에 써야 할지 몰랐어요.',
        weaknessId: 'g3_sequence',
      },
      {
        id: 'seq_sum',
        text: '합 Sₙ 공식 적용 방법에서 막혔어요.',
        weaknessId: 'g3_sequence',
      },
      {
        id: 'seq_recurrence',
        text: '점화식을 세우거나 일반항으로 바꾸는 방법이 어려웠어요.',
        weaknessId: 'g3_sequence',
      },
    ],
  },
  log_exp: {
    methodId: 'log_exp',
    prompt: '지수·로그 문제에서 어디서 막혔나요?',
    choices: [
      {
        id: 'log_law',
        text: '로그 성질(덧셈·뺄셈·지수 변환) 적용이 어려웠어요.',
        weaknessId: 'g3_log_exp',
      },
      {
        id: 'exp_law',
        text: '지수 법칙 변환이나 밑 통일이 어려웠어요.',
        weaknessId: 'g3_log_exp',
      },
      {
        id: 'log_eq',
        text: '지수방정식·로그방정식으로 변환해서 푸는 흐름이 헷갈렸어요.',
        weaknessId: 'g3_log_exp',
      },
    ],
  },
  conic: {
    methodId: 'conic',
    prompt: '이차곡선 문제에서 어디가 어려웠나요?',
    choices: [
      {
        id: 'conic_std',
        text: '포물선·타원·쌍곡선 표준형을 어떻게 쓰는지 몰랐어요.',
        weaknessId: 'g3_conic',
      },
      {
        id: 'conic_focus',
        text: '초점이나 점근선 공식이 기억나지 않았어요.',
        weaknessId: 'g3_conic',
      },
      {
        id: 'conic_setup',
        text: '조건을 이차곡선 식으로 세우는 과정이 어려웠어요.',
        weaknessId: 'g3_conic',
      },
    ],
  },
  limit: {
    methodId: 'limit',
    prompt: '극한 문제에서 어디서 막혔나요?',
    choices: [
      {
        id: 'lim_zero',
        text: '0/0 꼴이 나왔을 때 어떻게 처리할지 몰랐어요.',
        weaknessId: 'g3_limit',
      },
      {
        id: 'lim_factor',
        text: '인수분해로 공통인수를 약분하는 과정이 막혔어요.',
        weaknessId: 'g3_limit',
      },
      {
        id: 'lim_inf',
        text: '∞/∞ 꼴에서 최고차항으로 나누는 처리가 어려웠어요.',
        weaknessId: 'g3_limit',
      },
    ],
  },
```

- [ ] **Step 4: TypeScript 타입 체크**

```bash
npx tsc --noEmit 2>&1 | head -20
```

예상 결과: 에러 없음 (빈 출력). `SolveMethodId`를 `Record` 키로 쓰는 모든 곳에서 exhaustive 에러가 발생한다면 Task 2·3 완료 후 해결됨.

- [ ] **Step 5: 커밋**

```bash
git add data/diagnosisTree.ts
git commit -m "feat(diagnosis): sequence/log_exp/conic/limit SolveMethodId + 진단 플로우 추가"
```

---

### Task 2: detailedDiagnosisFlows.ts — methodFallbackWeakness 4개 추가

**Files:**
- Modify: `data/detailedDiagnosisFlows.ts:81-98` (methodFallbackWeakness)

- [ ] **Step 1: methodFallbackWeakness에 4개 추가**

`data/detailedDiagnosisFlows.ts`의 `methodFallbackWeakness` Record에서 `linear_eq: 'g2_inequality_range',` 다음에 추가:

```typescript
const methodFallbackWeakness: Record<SolveMethodId, WeaknessId> = {
  cps: 'formula_understanding',
  vertex: 'vertex_formula_memorization',
  diff: 'derivative_calculation',
  unknown: 'basic_concept_needed',
  factoring: 'factoring_pattern_recall',
  quadratic: 'quadratic_formula_memorization',
  radical: 'radical_simplification_error',
  polynomial: 'expansion_sign_error',
  complex_number: 'imaginary_unit_confusion',
  remainder_theorem: 'remainder_substitution_error',
  counting: 'counting_method_confusion',
  set: 'g2_set_operation',
  proposition: 'g2_prop_contrapositive',
  trig: 'g2_trig_unit_circle',
  integral: 'g2_integral_basic',
  linear_eq: 'g2_inequality_range',
  sequence: 'g3_sequence',
  log_exp: 'g3_log_exp',
  conic: 'g3_conic',
  limit: 'g3_limit',
};
```

- [ ] **Step 2: TypeScript 타입 체크**

```bash
npx tsc --noEmit 2>&1 | head -20
```

예상 결과: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add data/detailedDiagnosisFlows.ts
git commit -m "feat(diagnosis): methodFallbackWeakness에 sequence/log_exp/conic/limit 추가"
```

---

### Task 3: diagnosis-method-routing.ts — 라우팅 카탈로그 4개 추가

**Files:**
- Modify: `data/diagnosis-method-routing.ts:178-189` (linear_eq 다음에 추가)

- [ ] **Step 1: diagnosisMethodRoutingCatalog에 4개 추가**

`data/diagnosis-method-routing.ts`의 `linear_eq` 엔트리 다음, 닫는 `};` 바로 앞에 추가:

```typescript
  sequence: {
    id: 'sequence',
    labelKo: '수열',
    summary: '등차·등비수열 일반항·합 공식 또는 점화식으로 푸는 방식',
    keywords: ['수열', '등차', '등비', '점화식', '일반항', '합 공식', 'Sₙ', '시그마'],
    exampleUtterances: [
      '등차수열 일반항으로 aₙ 구했어요',
      '점화식으로 일반항 유도했어요',
      '합 공식 Sₙ 써서 계산했어요',
    ],
    followupLabel: '수열 공식을 적용함',
  },
  log_exp: {
    id: 'log_exp',
    labelKo: '지수·로그',
    summary: '지수·로그 성질을 이용해 방정식·부등식을 푸는 방식',
    keywords: ['지수', '로그', 'log', '밑', '지수법칙', '로그 성질', '방정식', '상용로그'],
    exampleUtterances: [
      '로그 성질로 식을 변환했어요',
      '지수법칙으로 밑을 통일했어요',
      '양변에 로그 취해서 지수방정식 풀었어요',
    ],
    followupLabel: '지수·로그 성질을 활용함',
  },
  conic: {
    id: 'conic',
    labelKo: '이차곡선',
    summary: '포물선·타원·쌍곡선 표준형과 초점·점근선을 이용하는 방식',
    keywords: ['포물선', '타원', '쌍곡선', '초점', '점근선', '이차곡선', '표준형', '준선'],
    exampleUtterances: [
      '타원 표준형으로 초점 구했어요',
      '쌍곡선 점근선 공식 썼어요',
      '포물선 표준형으로 꼭짓점 찾았어요',
    ],
    followupLabel: '이차곡선 표준형을 활용함',
  },
  limit: {
    id: 'limit',
    labelKo: '극한',
    summary: '0/0·∞/∞ 부정형을 인수분해·유리화로 처리하는 방식',
    keywords: ['극한', 'lim', '0/0', '무한대', '인수분해', '부정형', '최고차항', '유리화'],
    exampleUtterances: [
      '0/0 꼴을 인수분해로 약분했어요',
      '∞/∞ 꼴에서 최고차항으로 나눴어요',
      '분자 유리화해서 극한값 구했어요',
    ],
    followupLabel: '극한값을 계산함',
  },
```

- [ ] **Step 2: TypeScript 타입 체크**

```bash
npx tsc --noEmit 2>&1 | head -20
```

예상 결과: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add data/diagnosis-method-routing.ts
git commit -m "feat(diagnosis): diagnosisMethodRoutingCatalog에 sequence/log_exp/conic/limit 추가"
```

---

## ⛔ 사용자 확인 게이트

**이 지점에서 반드시 사용자에게 검토를 요청하세요.**

Task 1·2·3 완료 후 사용자에게 다음을 보여주고 승인을 받아야 합니다:

1. 추가된 선택지 텍스트 4개 세트 (sequence / log_exp / conic / limit)
2. 각 methodId별 prompt 문구가 자연스러운지 확인

```
선택지 내용 검토 요청:

[sequence] "수열 문제에서 어디가 가장 막혔나요?"
① 일반항 aₙ 공식(등차·등비)을 어디에 써야 할지 몰랐어요.
② 합 Sₙ 공식 적용 방법에서 막혔어요.
③ 점화식을 세우거나 일반항으로 바꾸는 방법이 어려웠어요.

[log_exp] "지수·로그 문제에서 어디서 막혔나요?"
① 로그 성질(덧셈·뺄셈·지수 변환) 적용이 어려웠어요.
② 지수 법칙 변환이나 밑 통일이 어려웠어요.
③ 지수방정식·로그방정식으로 변환해서 푸는 흐름이 헷갈렸어요.

[conic] "이차곡선 문제에서 어디가 어려웠나요?"
① 포물선·타원·쌍곡선 표준형을 어떻게 쓰는지 몰랐어요.
② 초점이나 점근선 공식이 기억나지 않았어요.
③ 조건을 이차곡선 식으로 세우는 과정이 어려웠어요.

[limit] "극한 문제에서 어디서 막혔나요?"
① 0/0 꼴이 나왔을 때 어떻게 처리할지 몰랐어요.
② 인수분해로 공통인수를 약분하는 과정이 막혔어요.
③ ∞/∞ 꼴에서 최고차항으로 나누는 처리가 어려웠어요.

문구 수정이 필요하면 말씀해 주세요. 승인하시면 최종 검증 + push를 진행합니다.
```

**사용자 승인 후에만 Task 4로 진행하세요.**

---

### Task 4: 최종 검증 + push

**Files:** 없음 (검증 및 배포만)

- [ ] **Step 1: 전체 TypeScript 검증**

```bash
npx tsc --noEmit 2>&1
```

예상 결과: 출력 없음 (에러 0개).

- [ ] **Step 2: 커버리지 확인 스크립트 실행**

```bash
python3 -c "
import json, glob

defined_methods = {'cps','vertex','diff','unknown','factoring','quadratic','radical','polynomial','complex_number','remainder_theorem','counting','set','proposition','trig','integral','linear_eq','sequence','log_exp','conic','limit'}
method_counts = {}
for f in glob.glob('data/exam/**/*.json', recursive=True):
    try:
        data = json.load(open(f))
        problems = data if isinstance(data, list) else data.get('problems', [])
        for p in problems:
            for m in (p.get('diagnosisMethods') or []):
                method_counts[m] = method_counts.get(m, 0) + 1
    except: pass

missing = {k:v for k,v in method_counts.items() if k not in defined_methods}
covered = sum(v for k,v in method_counts.items() if k in defined_methods)
total = sum(method_counts.values())
print(f'커버: {covered}/{total} ({covered/total*100:.0f}%)')
print(f'미커버 methodId: {len(missing)}개 ({sum(missing.values())}문제)')
"
```

예상 결과:
```
커버: 1570/1710 (92%)
미커버 methodId: 10개 (140문제)
```

- [ ] **Step 3: push**

```bash
git push origin main
```

- [ ] **Step 4: 완료 알림**

```bash
npm run notify:done -- "진단 플로우 1단계 완료: sequence/log_exp/conic/limit 추가, 1570/1710문제 커버(92%)"
```

---

### Task 5: 2단계 작업 안내

**이 태스크는 코드 작업 없음. 사용자에게 다음 단계를 안내합니다.**

- [ ] **Step 1: 사용자에게 2단계 안내**

1단계 완료 후 사용자에게 다음을 전달하세요:

```
✅ 1단계 완료: 640문제(82%) 커버 달성

━━━ 2단계: 나머지 10개 methodId ━━━
남은 미커버: 140문제 (전체의 8%)

추가 대상 (문제 수 순):
  vector          37문제
  probability     20문제
  space_geometry  19문제
  function        17문제
  statistics      16문제
  geometry        10문제
  permutation      7문제
  sequence_limit   6문제
  integral_advanced 5문제
  diff_advanced    3문제

2단계 시작 전 확인 필요:
  - function, geometry의 적절한 WeaknessId 매핑 검토
  - vector, space_geometry의 기하 영역 진단 플로우 설계

준비되시면 새 브레인스토밍 세션에서 /superpowers:brainstorming 으로
2단계 스펙 작성을 시작하세요.
```

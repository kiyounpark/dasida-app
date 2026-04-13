# 진단 플로우 2단계 — 나머지 10개 풀이법 추가 (100% 커버) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 10개 methodId(vector/probability/space_geometry/function/statistics/geometry/permutation/sequence_limit/integral_advanced/diff_advanced)를 추가해 진단 선택 버튼 커버리지를 92% → 100%(1723/1723문제)로 완성한다.

**Architecture:** 코드 로직 변경 없음. 4개 데이터 파일에 엔트리 추가만으로 완성. Task 1(diagnosisMap.ts)이 신규 WeaknessId를 정의하므로 반드시 먼저 완료해야 한다. 이후 Task 2·3·4는 서로 다른 파일을 수정하므로 병렬 실행 가능.

**Tech Stack:** TypeScript, React Native/Expo

---

## 실행 순서

```
Task 1 (diagnosisMap.ts) → [Task 2 || Task 3 || Task 4] → Task 5 (검증+push)
```

Task 2·3·4는 병렬 실행 가능 (각각 독립적인 파일).

---

## 변경 파일 목록

| 파일 | Task | 변경 내용 |
|------|------|---------|
| `data/diagnosisMap.ts` | Task 1 | WeaknessId union + weaknessOrder + diagnosisMap Record에 g1_geometry, g3_function 추가 |
| `data/diagnosisTree.ts` | Task 2 | SolveMethodId union + methodOptions + diagnosisTree 10개 추가 |
| `data/detailedDiagnosisFlows.ts` | Task 3 | methodFallbackWeakness 10개 추가 |
| `data/diagnosis-method-routing.ts` | Task 4 | diagnosisMethodRoutingCatalog 10개 추가 |

---

### Task 1: diagnosisMap.ts — 신규 WeaknessId 2개 추가

**Files:**
- Modify: `data/diagnosisMap.ts`

> ⚠️ 이 Task가 완료되어야 Task 2·3·4 실행 가능. TypeScript가 g1_geometry, g3_function을 WeaknessId로 인식해야 다른 파일의 컴파일 에러가 사라진다.

- [ ] **Step 1: WeaknessId union에 2개 추가**

`data/diagnosisMap.ts` 61번째 줄 `| 'g3_space_geometry';`를 아래로 교체:

```typescript
  | 'g3_space_geometry'
  // 고1 기하 특화
  | 'g1_geometry'
  // 함수 분석
  | 'g3_function';
```

- [ ] **Step 2: weaknessOrder 배열에 2개 추가**

`data/diagnosisMap.ts`의 `weaknessOrder` 배열에서 `'g3_space_geometry',` 다음에 추가:

```typescript
  'g3_space_geometry',
  'g1_geometry',
  'g3_function',
```

- [ ] **Step 3: diagnosisMap Record에 2개 추가**

`data/diagnosisMap.ts`의 `g3_space_geometry` 항목 닫는 `},` 다음, 최종 `};` 앞에 추가:

```typescript
  // ─── 고1 기하 특화 ───────────────────────────────────────────────
  g1_geometry: {
    id: 'g1_geometry',
    labelKo: '평면기하',
    topicLabel: '도형',
    desc: '피타고라스 정리나 삼각비를 이용한 변의 길이·넓이 계산에서 실수가 있었습니다.',
    tip: '직각삼각형을 찾거나 보조선으로 만들어 a²+b²=c²을 적용하거나, sinθ=대변/빗변으로 길이를 구하세요.',
  },
  // ─── 함수 분석 ───────────────────────────────────────────────────
  g3_function: {
    id: 'g3_function',
    labelKo: '함수 분석',
    topicLabel: '함수',
    desc: '역함수·합성함수 계산이나 전사·단사 함수 조건 판단에서 오류가 있었습니다.',
    tip: '역함수: y=f(x)를 x에 대해 풀어 x=f⁻¹(y). 합성함수 (f∘g)(x)=f(g(x))는 안쪽부터 계산하세요.',
  },
```

- [ ] **Step 4: TypeScript 검증**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | grep "diagnosisMap" | head -10
```

예상 결과: diagnosisMap.ts 관련 에러 없음. 다른 파일 에러는 Task 2·3·4 완료 후 해소됨.

- [ ] **Step 5: 커밋**

```bash
cd /Users/baggiyun/dev/dasida-app
git add data/diagnosisMap.ts
git commit -m "feat(diagnosis): g1_geometry, g3_function WeaknessId 추가"
```

---

### Task 2: diagnosisTree.ts — SolveMethodId + methodOptions + diagnosisTree 10개 추가

**Files:**
- Modify: `data/diagnosisTree.ts`

> Task 1 완료 후 실행. Task 3·4와 병렬 실행 가능.

- [ ] **Step 1: SolveMethodId union에 10개 추가**

`data/diagnosisTree.ts`의 `| 'limit';` 다음에 추가:

```typescript
  | 'limit'
  | 'vector'
  | 'probability'
  | 'space_geometry'
  | 'function'
  | 'statistics'
  | 'geometry'
  | 'permutation'
  | 'sequence_limit'
  | 'integral_advanced'
  | 'diff_advanced';
```

- [ ] **Step 2: methodOptions 배열에 10개 추가**

`{ id: 'unknown', labelKo: '잘 모르겠어' }` 바로 앞에 추가:

```typescript
  { id: 'vector', labelKo: '벡터' },
  { id: 'probability', labelKo: '확률' },
  { id: 'space_geometry', labelKo: '공간기하' },
  { id: 'function', labelKo: '함수' },
  { id: 'statistics', labelKo: '통계' },
  { id: 'geometry', labelKo: '평면기하' },
  { id: 'permutation', labelKo: '순열·조합' },
  { id: 'sequence_limit', labelKo: '수열의 극한' },
  { id: 'integral_advanced', labelKo: '심화 적분' },
  { id: 'diff_advanced', labelKo: '심화 미분' },
```

- [ ] **Step 3: diagnosisTree Record에 10개 추가**

`diagnosisTree` Record 닫는 `};` 바로 앞에 추가:

```typescript
  vector: {
    methodId: 'vector',
    prompt: '벡터 문제에서 어디가 어려웠나요?',
    choices: [
      { id: 'vec_calc', text: '두 벡터의 덧셈·뺄셈·크기 계산이 어려웠어요.', weaknessId: 'g3_vector' },
      { id: 'vec_dot', text: '내적 계산이나 공식 적용이 막혔어요.', weaknessId: 'g3_vector' },
      { id: 'vec_setup', text: '벡터로 도형 조건을 식으로 세우는 과정이 어려웠어요.', weaknessId: 'g3_vector' },
    ],
  },
  probability: {
    methodId: 'probability',
    prompt: '확률 문제에서 어디가 막혔나요?',
    choices: [
      { id: 'prob_conditional', text: '조건부확률 P(A|B) 공식 적용이 헷갈렸어요.', weaknessId: 'g3_probability' },
      { id: 'prob_independent', text: '독립·종속 사건 판단이나 곱의 법칙이 어려웠어요.', weaknessId: 'g3_probability' },
      { id: 'prob_complement', text: '여사건을 활용해 계산하는 방법을 몰랐어요.', weaknessId: 'g3_probability' },
    ],
  },
  space_geometry: {
    methodId: 'space_geometry',
    prompt: '공간기하 문제에서 어디가 어려웠나요?',
    choices: [
      { id: 'sg_projection', text: '정사영이나 두 평면이 이루는 각 계산이 어려웠어요.', weaknessId: 'g3_space_geometry' },
      { id: 'sg_relation', text: '직선과 평면의 위치 관계 파악이 헷갈렸어요.', weaknessId: 'g3_space_geometry' },
      { id: 'sg_coord', text: '공간도형을 좌표로 설정하는 방법이 어려웠어요.', weaknessId: 'g3_space_geometry' },
    ],
  },
  function: {
    methodId: 'function',
    prompt: '함수 문제에서 어디가 어려웠나요?',
    choices: [
      { id: 'fn_inverse', text: '역함수나 합성함수를 구하는 방법이 어려웠어요.', weaknessId: 'g3_function' },
      { id: 'fn_condition', text: '전사·단사 조건 판단이 헷갈렸어요.', weaknessId: 'g3_function' },
      { id: 'fn_graph', text: '그래프에서 조건을 읽어내는 과정이 어려웠어요.', weaknessId: 'g3_function' },
    ],
  },
  statistics: {
    methodId: 'statistics',
    prompt: '통계 문제에서 어디가 막혔나요?',
    choices: [
      { id: 'stat_normalize', text: '정규분포 표준화 Z=(X-μ)/σ 과정이 어려웠어요.', weaknessId: 'g3_statistics' },
      { id: 'stat_binomial', text: '이항분포 공식(평균 np, 분산 npq) 적용이 막혔어요.', weaknessId: 'g3_statistics' },
      { id: 'stat_table', text: '표준정규분포표에서 확률값을 읽는 방법이 헷갈렸어요.', weaknessId: 'g3_statistics' },
    ],
  },
  geometry: {
    methodId: 'geometry',
    prompt: '도형 문제에서 어디가 어려웠나요?',
    choices: [
      { id: 'geo_pythagorean', text: '피타고라스 정리를 어떤 삼각형에 적용할지 몰랐어요.', weaknessId: 'g1_geometry' },
      { id: 'geo_auxiliary', text: '보조선을 어디에 그어야 할지 몰랐어요.', weaknessId: 'g1_geometry' },
      { id: 'geo_trig', text: '삼각비로 변의 길이를 구하는 방법이 어려웠어요.', weaknessId: 'g1_geometry' },
    ],
  },
  permutation: {
    methodId: 'permutation',
    prompt: '순열·조합 문제에서 어디가 막혔나요?',
    choices: [
      { id: 'perm_choice', text: '순열과 조합 중 어느 것을 써야 할지 판단이 어려웠어요.', weaknessId: 'g3_counting' },
      { id: 'perm_restrict', text: '중복 허용·제한 조건 처리가 어려웠어요.', weaknessId: 'g3_counting' },
      { id: 'perm_special', text: '원순열이나 같은 것이 있는 순열 공식이 헷갈렸어요.', weaknessId: 'g3_counting' },
    ],
  },
  sequence_limit: {
    methodId: 'sequence_limit',
    prompt: '수열의 극한 문제에서 어디가 막혔나요?',
    choices: [
      { id: 'sl_converge', text: '수열이 수렴하는지 발산하는지 판단이 어려웠어요.', weaknessId: 'g3_limit' },
      { id: 'sl_inf', text: '∞/∞ 꼴에서 극한값을 구하는 처리가 막혔어요.', weaknessId: 'g3_limit' },
      { id: 'sl_geom', text: '등비수열 극한 조건(|r|<1이면 수렴)이 헷갈렸어요.', weaknessId: 'g3_limit' },
    ],
  },
  integral_advanced: {
    methodId: 'integral_advanced',
    prompt: '적분 문제에서 어디가 어려웠나요?',
    choices: [
      { id: 'ia_substitution', text: '치환적분·부분적분을 어디에 써야 할지 몰랐어요.', weaknessId: 'g3_integral' },
      { id: 'ia_area', text: '정적분으로 넓이 계산할 때 절댓값 처리가 어려웠어요.', weaknessId: 'g3_integral' },
      { id: 'ia_ftc', text: '∫f(t)dt를 미분하는 관계식 활용이 막혔어요.', weaknessId: 'g3_integral' },
    ],
  },
  diff_advanced: {
    methodId: 'diff_advanced',
    prompt: '미분 문제에서 어디가 어려웠나요?',
    choices: [
      { id: 'da_chain', text: '합성함수 미분(chain rule) 적용이 어려웠어요.', weaknessId: 'g3_diff' },
      { id: 'da_extremum', text: '극값·최솟값을 미분으로 찾는 과정이 막혔어요.', weaknessId: 'g3_diff' },
      { id: 'da_tangent', text: '접선의 방정식 구하는 방법이 헷갈렸어요.', weaknessId: 'g3_diff' },
    ],
  },
```

- [ ] **Step 4: TypeScript 검증**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | grep "diagnosisTree" | head -10
```

예상 결과: diagnosisTree.ts 관련 에러 없음.

- [ ] **Step 5: 커밋**

```bash
cd /Users/baggiyun/dev/dasida-app
git add data/diagnosisTree.ts
git commit -m "feat(diagnosis): 10개 SolveMethodId + 진단 플로우 추가 (2단계)"
```

---

### Task 3: detailedDiagnosisFlows.ts — methodFallbackWeakness 10개 추가

**Files:**
- Modify: `data/detailedDiagnosisFlows.ts`

> Task 1 완료 후 실행. Task 2·4와 병렬 실행 가능.

- [ ] **Step 1: methodFallbackWeakness에 10개 추가**

`data/detailedDiagnosisFlows.ts`의 `methodFallbackWeakness` Record에서 `limit: 'g3_limit',` 다음에 추가:

```typescript
  vector: 'g3_vector',
  probability: 'g3_probability',
  space_geometry: 'g3_space_geometry',
  function: 'g3_function',
  statistics: 'g3_statistics',
  geometry: 'g1_geometry',
  permutation: 'g3_counting',
  sequence_limit: 'g3_limit',
  integral_advanced: 'g3_integral',
  diff_advanced: 'g3_diff',
```

- [ ] **Step 2: TypeScript 검증**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | grep "detailedDiagnosisFlows" | head -10
```

예상 결과: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
cd /Users/baggiyun/dev/dasida-app
git add data/detailedDiagnosisFlows.ts
git commit -m "feat(diagnosis): methodFallbackWeakness 10개 추가 (2단계)"
```

---

### Task 4: diagnosis-method-routing.ts — 라우팅 카탈로그 10개 추가

**Files:**
- Modify: `data/diagnosis-method-routing.ts`

> Task 1 완료 후 실행. Task 2·3와 병렬 실행 가능.

- [ ] **Step 1: diagnosisMethodRoutingCatalog에 10개 추가**

`data/diagnosis-method-routing.ts`의 `limit` 항목 닫는 `},` 다음, 최종 `};` 바로 앞에 추가:

```typescript
  vector: {
    id: 'vector',
    labelKo: '벡터',
    summary: '벡터의 덧셈·내적·크기 또는 도형 조건을 벡터식으로 세우는 방식',
    keywords: ['벡터', '내적', '크기', '방향', '단위벡터', '위치벡터', '성분'],
    exampleUtterances: [
      '두 벡터 내적으로 각도를 구했어요',
      '위치벡터로 중점 좌표를 구했어요',
      '벡터의 크기를 계산해서 거리를 구했어요',
    ],
    followupLabel: '벡터 연산을 활용함',
  },
  probability: {
    id: 'probability',
    labelKo: '확률',
    summary: '조건부확률·독립사건·여사건을 이용해 확률을 계산하는 방식',
    keywords: ['확률', '조건부확률', '독립', '여사건', '경우의 수', 'P(A)'],
    exampleUtterances: [
      '조건부확률 공식으로 P(A|B) 구했어요',
      '여사건으로 1-P(Aᶜ) 계산했어요',
      '독립사건이라 곱의 법칙을 썼어요',
    ],
    followupLabel: '확률 공식을 적용함',
  },
  space_geometry: {
    id: 'space_geometry',
    labelKo: '공간기하',
    summary: '공간에서 직선·평면의 위치 관계나 정사영을 이용하는 방식',
    keywords: ['공간', '정사영', '평면', '직선', '이면각', '수선', '좌표공간'],
    exampleUtterances: [
      '정사영 넓이 공식으로 구했어요',
      '두 평면이 이루는 각도를 구했어요',
      '공간 좌표로 설정해서 거리를 구했어요',
    ],
    followupLabel: '공간기하 성질을 활용함',
  },
  function: {
    id: 'function',
    labelKo: '함수',
    summary: '역함수·합성함수 또는 전사·단사 조건을 분석하는 방식',
    keywords: ['역함수', '합성함수', '전사', '단사', '정의역', '치역', '함수 조건'],
    exampleUtterances: [
      '역함수를 구해서 f⁻¹(x) 계산했어요',
      '합성함수 (f∘g)(x) 풀었어요',
      '전사함수 조건으로 치역을 확인했어요',
    ],
    followupLabel: '함수 성질을 분석함',
  },
  statistics: {
    id: 'statistics',
    labelKo: '통계',
    summary: '정규분포 표준화 또는 이항분포 공식을 이용하는 방식',
    keywords: ['정규분포', '이항분포', '표준화', '평균', '분산', '표준편차', '확률변수'],
    exampleUtterances: [
      'Z=(X-μ)/σ로 표준화했어요',
      '이항분포 B(n,p)에서 평균 np 구했어요',
      '표준정규분포표에서 확률값을 읽었어요',
    ],
    followupLabel: '통계 분포를 활용함',
  },
  geometry: {
    id: 'geometry',
    labelKo: '평면기하',
    summary: '피타고라스 정리나 삼각비를 이용해 변의 길이·넓이를 구하는 방식',
    keywords: ['피타고라스', '삼각비', '보조선', '직각삼각형', 'sin', 'cos', 'tan', '넓이'],
    exampleUtterances: [
      '피타고라스 정리로 빗변을 구했어요',
      '삼각비 sinθ로 변의 길이를 구했어요',
      '보조선 그어서 직각삼각형 만들었어요',
    ],
    followupLabel: '도형 성질을 활용함',
  },
  permutation: {
    id: 'permutation',
    labelKo: '순열·조합',
    summary: '순열 P(n,r) 또는 조합 C(n,r)을 이용해 경우의 수를 세는 방식',
    keywords: ['순열', '조합', '중복', '원순열', 'P(n,r)', 'C(n,r)', '나열'],
    exampleUtterances: [
      '순열 P(n,r)로 경우의 수를 구했어요',
      '조합 C(n,r) 공식을 써서 선택했어요',
      '원순열 (n-1)! 공식을 사용했어요',
    ],
    followupLabel: '순열·조합을 적용함',
  },
  sequence_limit: {
    id: 'sequence_limit',
    labelKo: '수열의 극한',
    summary: '수열의 수렴·발산 판단 또는 ∞/∞ 꼴 극한값을 계산하는 방식',
    keywords: ['수열의 극한', '수렴', '발산', '등비수열', 'lim', '극한값', '무한등비급수'],
    exampleUtterances: [
      '수열의 극한값 lim aₙ을 구했어요',
      '등비수열 |r|<1 수렴 조건 확인했어요',
      '∞/∞ 꼴로 최고차항으로 나눴어요',
    ],
    followupLabel: '수열의 극한을 계산함',
  },
  integral_advanced: {
    id: 'integral_advanced',
    labelKo: '심화 적분',
    summary: '치환적분·부분적분 또는 정적분-미분 관계식을 이용하는 방식',
    keywords: ['치환적분', '부분적분', '정적분', '넓이', '미적분 관계', '절댓값'],
    exampleUtterances: [
      '치환 u=g(x)로 적분을 변환했어요',
      '정적분으로 두 곡선 사이 넓이를 구했어요',
      '∫₀ˣf(t)dt를 미분해서 풀었어요',
    ],
    followupLabel: '심화 적분을 활용함',
  },
  diff_advanced: {
    id: 'diff_advanced',
    labelKo: '심화 미분',
    summary: '합성함수 미분(chain rule) 또는 극값·접선을 구하는 방식',
    keywords: ['합성함수 미분', 'chain rule', '극값', '최솟값', '접선', '도함수'],
    exampleUtterances: [
      'chain rule로 합성함수를 미분했어요',
      "f'(x)=0 만들어 극값을 찾았어요",
      '접선의 기울기로 방정식을 구했어요',
    ],
    followupLabel: '심화 미분을 활용함',
  },
```

- [ ] **Step 2: TypeScript 검증**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | grep "diagnosis-method-routing" | head -10
```

예상 결과: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
cd /Users/baggiyun/dev/dasida-app
git add data/diagnosis-method-routing.ts
git commit -m "feat(diagnosis): diagnosisMethodRoutingCatalog 10개 추가 (2단계)"
```

---

### Task 5: 최종 검증 + push

**Files:** 없음 (검증 및 배포만)

- [ ] **Step 1: 전체 TypeScript 검증**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1
```

예상 결과: 출력 없음 (에러 0개).

- [ ] **Step 2: 100% 커버리지 확인**

```bash
cd /Users/baggiyun/dev/dasida-app && python3 -c "
import json, glob

defined_methods = {'cps','vertex','diff','unknown','factoring','quadratic','radical','polynomial','complex_number','remainder_theorem','counting','set','proposition','trig','integral','linear_eq','sequence','log_exp','conic','limit','vector','probability','space_geometry','function','statistics','geometry','permutation','sequence_limit','integral_advanced','diff_advanced'}
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
if missing:
    print(f'미커버: {missing}')
else:
    print('미커버 없음 ✅')
"
```

예상 결과:
```
커버: 1723/1723 (100%)
미커버 없음 ✅
```

- [ ] **Step 3: push**

```bash
cd /Users/baggiyun/dev/dasida-app && git push origin main
```

- [ ] **Step 4: 완료 알림**

```bash
cd /Users/baggiyun/dev/dasida-app && npm run notify:done -- "진단 플로우 2단계 완료: 10개 methodId 추가, 1723/1723문제 100% 커버"
```

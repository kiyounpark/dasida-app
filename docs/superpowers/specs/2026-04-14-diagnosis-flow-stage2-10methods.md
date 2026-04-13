# Spec: 진단 플로우 — 나머지 10개 풀이법 추가 (2단계)

**작성일**: 2026-04-14
**범위**: vector, probability, space_geometry, function, statistics, geometry, permutation, sequence_limit, integral_advanced, diff_advanced
**목표**: 선택 버튼 없는 나머지 140문제 커버 → 전체 1723/1723 (100%)

---

## 배경

1단계(sequence/log_exp/conic/limit)로 92% 커버 달성. 나머지 10개 methodId(140문제)를 추가해 100%를 달성한다.

---

## 변경 파일 (4개)

| 파일 | 변경 내용 |
|------|---------|
| `data/diagnosisMap.ts` | **신규** WeaknessId 2개 추가: `g1_geometry`, `g3_function` |
| `data/diagnosisTree.ts` | SolveMethodId union + methodOptions + diagnosisTree 10개 추가 |
| `data/detailedDiagnosisFlows.ts` | methodFallbackWeakness 10개 추가 |
| `data/diagnosis-method-routing.ts` | diagnosisMethodRoutingCatalog 10개 추가 |

---

## 신규 WeaknessId 정의

### `g1_geometry`

```typescript
g1_geometry: {
  id: 'g1_geometry',
  labelKo: '평면기하',
  topicLabel: '도형',
  desc: '피타고라스 정리나 삼각비를 이용한 변의 길이·넓이 계산에서 실수가 있었습니다.',
  tip: '직각삼각형을 찾거나 보조선으로 만들어 a²+b²=c²을 적용하거나, sinθ=대변/빗변으로 길이를 구하세요.',
}
```

### `g3_function`

```typescript
g3_function: {
  id: 'g3_function',
  labelKo: '함수 분석',
  topicLabel: '함수',
  desc: '역함수·합성함수 계산이나 전사·단사 함수 조건 판단에서 오류가 있었습니다.',
  tip: '역함수: y=f(x)를 x에 대해 풀어 x=f⁻¹(y). 합성함수 (f∘g)(x)=f(g(x))는 안쪽부터 계산하세요.',
}
```

두 ID 모두 `WeaknessId` union, `weaknessOrder` 배열, `diagnosisMap` Record에 추가한다.

---

## WeaknessId 매핑

| methodId | 문제 수 | WeaknessId | 신규 여부 |
|----------|--------|-----------|---------|
| vector | 37 | `g3_vector` | 기존 |
| probability | 20 | `g3_probability` | 기존 |
| space_geometry | 19 | `g3_space_geometry` | 기존 |
| function | 17 | `g3_function` | **신규** |
| statistics | 16 | `g3_statistics` | 기존 |
| geometry | 10 | `g1_geometry` | **신규** |
| permutation | 7 | `g3_counting` | 기존 |
| sequence_limit | 6 | `g3_limit` | 기존 |
| integral_advanced | 5 | `g3_integral` | 기존 |
| diff_advanced | 3 | `g3_diff` | 기존 |

---

## 플로우 동작 방식

1단계와 동일: g3_/g1_ 약점 ID는 `checkPromptByWeakness`에 미등록 → `hasCheckNode = false` → 선택 → explain → final 직접 연결.

---

## 진단 플로우 설계 (10개)

### 1. `vector` — 벡터 (37문제)

```
prompt: '벡터 문제에서 어디가 어려웠나요?'
fallbackWeaknessId: 'g3_vector'
```

| choice id | 선택지 텍스트 | weaknessId |
|-----------|-------------|------------|
| `vec_calc` | 두 벡터의 덧셈·뺄셈·크기 계산이 어려웠어요. | `g3_vector` |
| `vec_dot` | 내적 계산이나 공식 적용이 막혔어요. | `g3_vector` |
| `vec_setup` | 벡터로 도형 조건을 식으로 세우는 과정이 어려웠어요. | `g3_vector` |

**라우팅 키워드**: 벡터, 내적, 크기, 방향, 단위벡터, 위치벡터, 성분
**followupLabel**: '벡터 연산을 활용함'

---

### 2. `probability` — 확률 (20문제)

```
prompt: '확률 문제에서 어디가 막혔나요?'
fallbackWeaknessId: 'g3_probability'
```

| choice id | 선택지 텍스트 | weaknessId |
|-----------|-------------|------------|
| `prob_conditional` | 조건부확률 P(A\|B) 공식 적용이 헷갈렸어요. | `g3_probability` |
| `prob_independent` | 독립·종속 사건 판단이나 곱의 법칙이 어려웠어요. | `g3_probability` |
| `prob_complement` | 여사건을 활용해 계산하는 방법을 몰랐어요. | `g3_probability` |

**라우팅 키워드**: 확률, 조건부확률, 독립, 여사건, 경우의 수, P(A)
**followupLabel**: '확률 공식을 적용함'

---

### 3. `space_geometry` — 공간기하 (19문제)

```
prompt: '공간기하 문제에서 어디가 어려웠나요?'
fallbackWeaknessId: 'g3_space_geometry'
```

| choice id | 선택지 텍스트 | weaknessId |
|-----------|-------------|------------|
| `sg_projection` | 정사영이나 두 평면이 이루는 각 계산이 어려웠어요. | `g3_space_geometry` |
| `sg_relation` | 직선과 평면의 위치 관계 파악이 헷갈렸어요. | `g3_space_geometry` |
| `sg_coord` | 공간도형을 좌표로 설정하는 방법이 어려웠어요. | `g3_space_geometry` |

**라우팅 키워드**: 공간, 정사영, 평면, 직선, 이면각, 수선, 좌표공간
**followupLabel**: '공간기하 성질을 활용함'

---

### 4. `function` — 함수 (17문제)

```
prompt: '함수 문제에서 어디가 어려웠나요?'
fallbackWeaknessId: 'g3_function'
```

| choice id | 선택지 텍스트 | weaknessId |
|-----------|-------------|------------|
| `fn_inverse` | 역함수나 합성함수를 구하는 방법이 어려웠어요. | `g3_function` |
| `fn_condition` | 전사·단사 조건 판단이 헷갈렸어요. | `g3_function` |
| `fn_graph` | 그래프에서 조건을 읽어내는 과정이 어려웠어요. | `g3_function` |

**라우팅 키워드**: 역함수, 합성함수, 전사, 단사, 정의역, 치역, 함수 조건
**followupLabel**: '함수 성질을 분석함'

---

### 5. `statistics` — 통계 (16문제)

```
prompt: '통계 문제에서 어디가 막혔나요?'
fallbackWeaknessId: 'g3_statistics'
```

| choice id | 선택지 텍스트 | weaknessId |
|-----------|-------------|------------|
| `stat_normalize` | 정규분포 표준화 Z=(X-μ)/σ 과정이 어려웠어요. | `g3_statistics` |
| `stat_binomial` | 이항분포 공식(평균 np, 분산 npq) 적용이 막혔어요. | `g3_statistics` |
| `stat_table` | 표준정규분포표에서 확률값을 읽는 방법이 헷갈렸어요. | `g3_statistics` |

**라우팅 키워드**: 정규분포, 이항분포, 표준화, 평균, 분산, 표준편차, 확률변수
**followupLabel**: '통계 분포를 활용함'

---

### 6. `geometry` — 평면기하 (10문제)

```
prompt: '도형 문제에서 어디가 어려웠나요?'
fallbackWeaknessId: 'g1_geometry'
```

| choice id | 선택지 텍스트 | weaknessId |
|-----------|-------------|------------|
| `geo_pythagorean` | 피타고라스 정리를 어떤 삼각형에 적용할지 몰랐어요. | `g1_geometry` |
| `geo_auxiliary` | 보조선을 어디에 그어야 할지 몰랐어요. | `g1_geometry` |
| `geo_trig` | 삼각비로 변의 길이를 구하는 방법이 어려웠어요. | `g1_geometry` |

**라우팅 키워드**: 피타고라스, 삼각비, 보조선, 직각삼각형, sin, cos, tan, 넓이
**followupLabel**: '도형 성질을 활용함'

---

### 7. `permutation` — 순열·조합 (7문제)

```
prompt: '순열·조합 문제에서 어디가 막혔나요?'
fallbackWeaknessId: 'g3_counting'
```

| choice id | 선택지 텍스트 | weaknessId |
|-----------|-------------|------------|
| `perm_choice` | 순열과 조합 중 어느 것을 써야 할지 판단이 어려웠어요. | `g3_counting` |
| `perm_restrict` | 중복 허용·제한 조건 처리가 어려웠어요. | `g3_counting` |
| `perm_special` | 원순열이나 같은 것이 있는 순열 공식이 헷갈렸어요. | `g3_counting` |

**라우팅 키워드**: 순열, 조합, 중복, 원순열, P(n,r), C(n,r), 나열
**followupLabel**: '순열·조합을 적용함'

---

### 8. `sequence_limit` — 수열의 극한 (6문제)

```
prompt: '수열의 극한 문제에서 어디가 막혔나요?'
fallbackWeaknessId: 'g3_limit'
```

| choice id | 선택지 텍스트 | weaknessId |
|-----------|-------------|------------|
| `sl_converge` | 수열이 수렴하는지 발산하는지 판단이 어려웠어요. | `g3_limit` |
| `sl_inf` | ∞/∞ 꼴에서 극한값을 구하는 처리가 막혔어요. | `g3_limit` |
| `sl_geom` | 등비수열 극한 조건(\|r\|<1이면 수렴)이 헷갈렸어요. | `g3_limit` |

**라우팅 키워드**: 수열의 극한, 수렴, 발산, 등비수열, lim, 극한값, 무한등비급수
**followupLabel**: '수열의 극한을 계산함'

---

### 9. `integral_advanced` — 심화 적분 (5문제)

```
prompt: '적분 문제에서 어디가 어려웠나요?'
fallbackWeaknessId: 'g3_integral'
```

| choice id | 선택지 텍스트 | weaknessId |
|-----------|-------------|------------|
| `ia_substitution` | 치환적분·부분적분을 어디에 써야 할지 몰랐어요. | `g3_integral` |
| `ia_area` | 정적분으로 넓이 계산할 때 절댓값 처리가 어려웠어요. | `g3_integral` |
| `ia_ftc` | ∫f(t)dt를 미분하는 관계식 활용이 막혔어요. | `g3_integral` |

**라우팅 키워드**: 치환적분, 부분적분, 정적분, 넓이, 미적분 관계, 절댓값
**followupLabel**: '심화 적분을 활용함'

---

### 10. `diff_advanced` — 심화 미분 (3문제)

```
prompt: '미분 문제에서 어디가 어려웠나요?'
fallbackWeaknessId: 'g3_diff'
```

| choice id | 선택지 텍스트 | weaknessId |
|-----------|-------------|------------|
| `da_chain` | 합성함수 미분(chain rule) 적용이 어려웠어요. | `g3_diff` |
| `da_extremum` | 극값·최솟값을 미분으로 찾는 과정이 막혔어요. | `g3_diff` |
| `da_tangent` | 접선의 방정식 구하는 방법이 헷갈렸어요. | `g3_diff` |

**라우팅 키워드**: 합성함수 미분, chain rule, 극값, 최솟값, 접선, 도함수
**followupLabel**: '심화 미분을 활용함'

---

## 검증 기준

- `npx tsc --noEmit` 에러 없음
- `WeaknessId` union에 `g1_geometry`, `g3_function` 추가 후 타입 체크 통과
- `SolveMethodId` union 및 모든 Record 타입 exhaustive check 통과
- 커버리지 스크립트: 1723/1723 (100%) 확인

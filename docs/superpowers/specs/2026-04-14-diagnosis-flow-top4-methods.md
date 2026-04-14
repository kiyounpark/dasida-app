# Spec: 진단 플로우 — 상위 4개 풀이법 추가 (1단계)

**작성일**: 2026-04-14  
**범위**: sequence, log_exp, conic, limit  
**목표**: 선택 버튼 없는 780문제 중 640문제(82%) 커버

---

## 배경

모의고사 오답 분석 화면에서 일부 문제는 약점 선택 버튼이 없고 텍스트 입력창만 표시된다.
원인: `diagnosisTree.ts`에 등록되지 않은 `SolveMethodId`를 가진 문제들.

전체 1710문제 중 780문제(45%)가 영향을 받으며, 상위 4개 methodId만 추가해도 82%가 해결된다.

---

## 변경 파일 (3개)

| 파일 | 변경 내용 |
|------|---------|
| `data/diagnosisTree.ts` | `SolveMethodId` union + `methodOptions` + `diagnosisTree` 4개 추가 |
| `data/detailedDiagnosisFlows.ts` | `methodFallbackWeakness`에 4개 추가 |
| `data/diagnosis-method-routing.ts` | `diagnosisMethodRoutingCatalog`에 4개 추가 |

`data/diagnosisMap.ts` — **변경 없음** (g3_sequence, g3_log_exp, g3_conic, g3_limit 이미 정의됨)

---

## 플로우 동작 방식

g3_ 약점 ID는 `checkPromptByWeakness`에 미등록 → `hasCheckNode = false`  
→ 선택 → explain → final 직접 연결 (g2_ 메서드와 동일한 짧은 흐름)

---

## 진단 플로우 설계

### 1. `sequence` — 수열 (201문제)

```
SolveMethodId: 'sequence'
labelKo: '수열'
prompt: '수열 문제에서 어디가 가장 막혔나요?'
fallbackWeaknessId: 'g3_sequence'
```

| choice id | 선택지 텍스트 | weaknessId |
|-----------|-------------|------------|
| `seq_general` | 일반항 aₙ 공식(등차·등비)을 어디에 써야 할지 몰랐어요. | `g3_sequence` |
| `seq_sum` | 합 Sₙ 공식 적용 방법에서 막혔어요. | `g3_sequence` |
| `seq_recurrence` | 점화식을 세우거나 일반항으로 바꾸는 방법이 어려웠어요. | `g3_sequence` |

**라우팅 키워드**: 수열, 등차, 등비, 점화식, 일반항, 합 공식, Sₙ  
**followupLabel**: '수열 공식을 적용함'

---

### 2. `log_exp` — 지수·로그 (191문제)

```
SolveMethodId: 'log_exp'
labelKo: '지수·로그'
prompt: '지수·로그 문제에서 어디서 막혔나요?'
fallbackWeaknessId: 'g3_log_exp'
```

| choice id | 선택지 텍스트 | weaknessId |
|-----------|-------------|------------|
| `log_law` | 로그 성질(덧셈·뺄셈·지수 변환) 적용이 어려웠어요. | `g3_log_exp` |
| `exp_law` | 지수 법칙 변환이나 밑 통일이 어려웠어요. | `g3_log_exp` |
| `log_eq` | 지수방정식·로그방정식으로 변환해서 푸는 흐름이 헷갈렸어요. | `g3_log_exp` |

**라우팅 키워드**: 지수, 로그, log, 밑, 지수법칙, 로그 성질, 방정식  
**followupLabel**: '지수·로그 성질을 활용함'

---

### 3. `conic` — 이차곡선 (137문제)

```
SolveMethodId: 'conic'
labelKo: '이차곡선'
prompt: '이차곡선 문제에서 어디가 어려웠나요?'
fallbackWeaknessId: 'g3_conic'
```

| choice id | 선택지 텍스트 | weaknessId |
|-----------|-------------|------------|
| `conic_std` | 포물선·타원·쌍곡선 표준형을 어떻게 쓰는지 몰랐어요. | `g3_conic` |
| `conic_focus` | 초점이나 점근선 공식이 기억나지 않았어요. | `g3_conic` |
| `conic_setup` | 조건을 이차곡선 식으로 세우는 과정이 어려웠어요. | `g3_conic` |

**라우팅 키워드**: 포물선, 타원, 쌍곡선, 초점, 점근선, 이차곡선, 표준형  
**followupLabel**: '이차곡선 표준형을 활용함'

---

### 4. `limit` — 극한 (111문제)

```
SolveMethodId: 'limit'
labelKo: '극한'
prompt: '극한 문제에서 어디서 막혔나요?'
fallbackWeaknessId: 'g3_limit'
```

| choice id | 선택지 텍스트 | weaknessId |
|-----------|-------------|------------|
| `lim_zero` | 0/0 꼴이 나왔을 때 어떻게 처리할지 몰랐어요. | `g3_limit` |
| `lim_factor` | 인수분해로 공통인수를 약분하는 과정이 막혔어요. | `g3_limit` |
| `lim_inf` | ∞/∞ 꼴에서 최고차항으로 나누는 처리가 어려웠어요. | `g3_limit` |

**라우팅 키워드**: 극한, lim, 0/0, 무한대, 인수분해, 부정형, 최고차항  
**followupLabel**: '극한값을 계산함'

---

## 검증 기준

- `npx tsc --noEmit` 에러 없음
- `SolveMethodId` union 타입에 4개 추가 후 TypeScript exhaustive check 통과
- `methodFallbackWeakness` Record에 4개 모두 추가 (누락 시 런타임 에러)
- `diagnosisMethodRoutingCatalog` Record에 4개 모두 추가

---

## 2단계 예고

이 스펙 완료 후 나머지 10개 methodId 추가:  
`vector`(37), `probability`(20), `space_geometry`(19), `function`(17),  
`statistics`(16), `geometry`(10), `permutation`(7), `sequence_limit`(6),  
`integral_advanced`(5), `diff_advanced`(3) → 나머지 140문제 100% 커버

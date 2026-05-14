# Multi-Pilot 종합 검토 — 시범 3개 결과

**기간**: 2026-05-13 ~ 2026-05-14
**시범 약점**: 3개 (deep 2개 + shallow 1개)
**상태**: 모두 5 게이트 통과 + ThinkingStep wiring 완료

---

## 시범 결과표

| Pilot | 깊이 | 노드 | 학생 게이트 재시도 | 흐름 게이트 재시도 | ThinkingStep audit | 최종 상태 |
|---|---|---|---|---|---|---|
| `calc_repeated_error` | deep | 48 | 3차 통과 | 2차 통과 | approve (audit) | ✅ |
| `min_value_read_confusion` | deep | 48 | 2차 통과 | 2차 통과 | reject (자동교정 1회 후 approve) | ✅ |
| `radical_simplification_error` | shallow | 24 | **4차 통과 (계획 한도 초과)** | 2차 통과 | reject (자동교정 1회 후 approve) | ✅ |

---

## 토큰 사용 실측

| Pilot | 누적 토큰 (대략) | 게이트 재시도 |
|---|---|---|
| calc_repeated_error | ~1.07M | 2회 (학생+흐름) |
| min_value_read_confusion | ~1.4M | 1회 (학생+흐름 한 번에) |
| radical_simplification_error | ~1.5M | 2회 (학생만 추가) |

**합계**: 약 4M 토큰 / 3개 약점 = 평균 1.3M/약점

---

## §0 분류 정책 검증 (1차 결론)

### deep 약점 특징
- calc_repeated_error: 절차 약점, 사유 분기 의미 있음 (rationalization vs habit vs misconception)
- min_value_read_confusion: 개념 오해 약점, 사유 분기 강력함 (역할 혼동 vs 위치/값 혼동)
- **공통**: 48 노드 deep 구조에서 진단(diagnose) → 사유별 explain → check → diagnose2 → pinpoint → retry 패턴이 학생 사고 흐름과 맞음

### shallow 약점 특징
- radical_simplification_error: 단순 절차 약점 1-shot 적합
- 노드 24개에서 explain → check → remedy → check 재시도 패턴이 충분
- **단**: 학생 게이트가 4차까지 갔다는 점은 ⚠️ — shallow도 deep 못지않게 풀어쓰기 비용이 듦

### 분류 가이드 갱신 권장

§0.2 기준 정밀화:
- "실수" 키워드라도 사유가 단일하면 shallow (radical), 다양하면 deep (calc는 deep로 검증됨)
- "오해" 키워드는 deep (min_value 검증)
- shallow도 §C.7 풀어쓰기 가이드를 deep만큼 엄격 적용 필요

---

## 시스템 이슈 발견 (시범 2~3에서 추가)

### 이전 발견 (calc_repeated_error 시범에서)
1. content-author 수학 용어 풀어쓰기 가이드 누락 → §C.7 추가 완료
2. content-author pinpoint retry 경로 누락 → §B 추가 완료
3. terminology 통일 누락 → §C.8 추가 완료

### 신규 발견 (min_value + radical 시범에서)
4. **선행지식 추상화 한계**: shallow 약점에서 "소수", "소인수분해", "약분" 등 선행 개념이 단순 등장만으로는 6등급에게 부족 → content-author.md §C.7에 "선행 개념도 한 줄 정의 동봉" 가이드 추가 권장
5. **math-teacher의 equationsToVerify 추출 과적합**: 조건부 식((x-a)²+b=b는 x=a에서만 성립)을 sympy에 보내 false fail 발생 → math-teacher.md에 "조건부 등식 제외" 한 줄 보강 필요
6. **3 retry 상한 부족 가능성**: shallow radical은 4차에서야 통과. 본 배치 시 retry 한도 4회로 상향 또는 2-pass 작성(1pass = draft, 2pass = re-author with persona §C.7 mindset) 검토

---

## 본 배치 진입 권장

### 53개 약점 분류 사전작업
1. 약점별 1차 분류 (shallow/deep) — §0.2 갱신 기준 적용
2. 모호한 약점은 deep 우선 (안전 선택)
3. 시범 3개 결과로 검증된 분류 가이드:
   - "혼동", "오해" → deep
   - 단순 "실수" → shallow (단 풀어쓰기 비중 ↑)
   - "암기 부족", "공식 빠뜨림" → shallow

### 키워드 일괄 작성
- 53개 약점 키워드 작성 (~1.5시간 추정)
- 키워드 검수 게이트 (이전 합의했던 게이트 A) 필요 여부 재검토 — 시범 3개에서 키워드 품질 큰 문제 없었음 → **선택적**

### 예상 토큰 예산

| 시나리오 | 약점 평균 | 53개 토큰 |
|---|---|---|
| 전부 deep (1.4M) | 1.4M | ~74M |
| 절반씩 (deep 1.4M + shallow 1.0M) | 1.2M | ~64M |
| 전부 shallow (1.0M) | 1.0M | ~53M |

Claude Code 한도 도달 추정: 평균 5~7약점마다 자연 정지.

### 배치 전 추천 작업 (선택)

- [ ] content-author.md §C.7에 "선행 개념 정의 동봉" 추가
- [ ] math-teacher.md "조건부 식 제외" 보강
- [ ] (선택) 키워드 검수 게이트 A 페르소나 작성
- [ ] 53개 분류 작업

---

## 시범 산출물

### 보완 흐름 (3개)
- `data/remedial-flows/calc_repeated_error.ts` (48 노드)
- `data/remedial-flows/min_value_read_confusion.ts` (48 노드)
- `data/remedial-flows/radical_simplification_error.ts` (24 노드)

### 게이트 결과 (15개 JSON, 3 pilot × 5 gate)
- `scripts/remedial-pipeline/pilot/gate-results/*.json` (calc_repeated_error)
- `scripts/remedial-pipeline/pilot/min_value-gates/*.json`
- `scripts/remedial-pipeline/pilot/radical-gates/*.json`

### ThinkingStep audit
- `scripts/remedial-pipeline/pilot/thinkingstep-review-result.json` (calc — approve)
- `scripts/remedial-pipeline/pilot/min_value_read_confusion-thinkingstep-review.json` (재검수 후 approve)
- `scripts/remedial-pipeline/pilot/radical_simplification_error-thinkingstep-review.json` (재검수 후 approve)

### 매핑
- `scripts/remedial-pipeline/intent-weakness-map.json` (calc 48건 + min_value 114건 + radical 16건)

---

## 결정 필요

### (a) 본 배치 즉시 진입
- 53개 약점 분류 → 키워드 → 보완 흐름 작성 → 게이트 → 등록 → wiring
- 추정 토큰: 53~74M (다회차 분할 필수)
- 추정 기간: 한 세션 ≈ 5~7 약점 처리 → 총 8~11 세션

### (b) content-author / math-teacher 추가 갱신 후 (a)
- 발견된 시스템 이슈 2개(선행 개념 정의, 조건부 식 제외) 반영
- 추정 추가 시간: 30분
- 본 배치 1차 시도 통과율 ↑ 예상

### (c) 시범 추가 (예: 1~2개 더)
- 더 다양한 약점 검증
- 비용 ↑, 새 정보 ↓ (이미 deep×2 + shallow×1 검증됨)
- **추천 안함**: 3개 시범으로 시스템 검증은 충분

---

## 한 줄 결론

**5 게이트 + 자동 교정 시스템이 deep / shallow 양 형식에서 작동함을 검증했고, 본 배치 진입 가능. (b) 옵션이 안전하지만 (a)도 무리 없음.**

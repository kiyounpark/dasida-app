# Spec: G3 복습 콘텐츠 추가

**작성일**: 2026-04-15  
**범위**: `data/review-content-map.ts`  
**목표**: G3 10개 약점 × 3 ThinkingStep 추가 → 고3 복습 세션 정상 동작

---

## 배경

`review-content-map.ts`에 G3 약점(`g3_*`)이 없어 고3 사용자가 복습 세션에 진입하면 `steps = []`로 화면이 동작하지 않는다. 고3 전체 플로우(진단 → 약점 분석 → 복습 → 모의고사) 실기기 검증을 위해 10개 약점 콘텐츠를 추가한다.

---

## 변경 파일

| 파일 | 변경 내용 |
|------|---------|
| `data/review-content-map.ts` | G3 10개 약점 항목 추가 |

---

## 추가 약점 목록

| 약점 ID | 라벨 | heroPrompt 방향 |
|---------|------|----------------|
| `g3_diff` | 미분 계산 | 각 항을 독립적으로 미분하는 순서 |
| `g3_integral` | 적분 계산 | ∫xⁿdx 기본 공식 확인 |
| `g3_sequence` | 수열 계산 | 등차/등비 판단 → 합 공식 |
| `g3_log_exp` | 지수·로그 | 지수법칙 → 로그 성질 → 밑 변환 |
| `g3_trig` | 삼각함수 | 대표각 값 → 항등식 → 각도 변환 |
| `g3_limit` | 극한 계산 | 0/0 꼴 인수분해 → ∞/∞ → 대입 |
| `g3_conic` | 이차곡선 | 표준형 구분 → 초점 → 점근선 |
| `g3_counting` | 경우의 수 | 순서 유무 판단 → P/C 계산 → 중복 |
| `g3_probability` | 확률 계산 | 여사건 → 조건부확률 → 독립 판단 |
| `g3_statistics` | 통계 | 평균·분산 → Z 표준화 → 정규분포표 |

---

## ThinkingStep 구조 (각 약점 공통)

```typescript
{
  heroPrompt: string,           // 핵심 개념을 묻는 안내 문장
  thinkingSteps: [
    {
      title: string,            // 단계 제목
      body: string,             // 개념 설명
      example?: string,         // 예시 (선택)
      choices: [                // 객관식 3지선다
        { text: string, correct: boolean },  // 정답 1개
        { text: string, correct: boolean },  // 오답 2개
        { text: string, correct: boolean },
      ],
    },
    // × 3 스텝
  ],
}
```

---

## 스텝 상세 설계

### g3_diff — 미분 계산

- **heroPrompt**: "각 항을 독립적으로 미분하는 순서가 기억나나요?"
- Step 1: 항별 미분 규칙 — `xⁿ → nxⁿ⁻¹`, 상수항 → 0
- Step 2: 합성함수 체인룰 — `f(g(x))' = f'(g(x))·g'(x)`
- Step 3: 곱의 미분 — `(fg)' = f'g + fg'`

### g3_integral — 적분 계산

- **heroPrompt**: "∫xⁿdx 기본 공식부터 확인해볼게요."
- Step 1: 부정적분 기본 공식 — `∫xⁿdx = xⁿ⁺¹/(n+1) + C`
- Step 2: 정적분 계산 — `[F(x)]ₐᵇ = F(b) - F(a)`
- Step 3: 넓이 계산 시 부호 처리 — x축 아래 구간은 절댓값

### g3_sequence — 수열 계산

- **heroPrompt**: "등차인지 등비인지 먼저 판단하는 흐름이 떠오르나요?"
- Step 1: 등차수열 일반항 — `aₙ = a₁ + (n-1)d`
- Step 2: 등비수열 일반항 — `aₙ = a₁·rⁿ⁻¹`
- Step 3: 합 공식 — 등차 `Sₙ = n/2(a₁+aₙ)`, 등비 `Sₙ = a₁(rⁿ-1)/(r-1)`

### g3_log_exp — 지수·로그 계산

- **heroPrompt**: "지수법칙과 로그 성질 중 어느 것을 먼저 확인하나요?"
- Step 1: 지수법칙 — `aˣ·aʸ = aˣ⁺ʸ`, `(aˣ)ʸ = aˣʸ`
- Step 2: 로그 성질 — `logₐbc = logₐb + logₐc`, `logₐ(b/c) = logₐb - logₐc`
- Step 3: 밑 변환 공식 — `logₐb = log b / log a`

### g3_trig — 삼각함수 계산

- **heroPrompt**: "단위원에서 sin·cos 값을 읽는 흐름을 다시 볼게요."
- Step 1: 대표각 값 — 0°/30°/45°/60°/90°의 sin·cos·tan
- Step 2: 삼각함수 항등식 — `sin²θ + cos²θ = 1`, `tanθ = sinθ/cosθ`
- Step 3: 각도 변환 — `sin(90°-θ) = cosθ`, `sin(180°-θ) = sinθ`

### g3_limit — 극한 계산

- **heroPrompt**: "0/0 꼴을 만났을 때 첫 번째 할 일이 뭔지 기억나나요?"
- Step 1: 0/0 꼴 처리 — 분자·분모 인수분해 후 약분
- Step 2: ∞/∞ 꼴 처리 — 최고차항으로 분자·분모 나누기
- Step 3: 극한값 대입 — 부정형 해소 후 직접 대입

### g3_conic — 이차곡선

- **heroPrompt**: "포물선·타원·쌍곡선 표준형을 구분하는 기준을 확인할게요."
- Step 1: 표준형 구분 — `y²=4px` / `x²/a²+y²/b²=1` / `x²/a²-y²/b²=1`
- Step 2: 초점 좌표 — 포물선 `(p,0)`, 타원 `(±c,0) c²=a²-b²`
- Step 3: 쌍곡선 점근선 — `y = ±(b/a)x`

### g3_counting — 경우의 수·순열·조합

- **heroPrompt**: "순열과 조합 중 어느 것을 쓸지 먼저 판단하는 법을 볼게요."
- Step 1: 순서 유무 판단 — 순서 중요 → 순열, 순서 무관 → 조합
- Step 2: P(n,r) vs C(n,r) — `P=n!/(n-r)!`, `C=n!/r!(n-r)!`
- Step 3: 중복 처리 — 중복 순열 `nᵣ`, 중복 조합 `H(n,r) = C(n+r-1,r)`

### g3_probability — 확률 계산

- **heroPrompt**: "조건부확률 P(A|B)를 구하는 순서가 기억나나요?"
- Step 1: 여사건 활용 — `P(Aᶜ) = 1 - P(A)`
- Step 2: 조건부확률 공식 — `P(A|B) = P(A∩B) / P(B)`
- Step 3: 독립 사건 판단 — `P(A∩B) = P(A)·P(B)` 이면 독립

### g3_statistics — 통계 (정규분포·이항분포)

- **heroPrompt**: "표준화 Z=(X-μ)/σ 공식을 적용하는 흐름을 볼게요."
- Step 1: 평균·분산 확인 — 이항분포 `B(n,p)` → 평균 `np`, 분산 `npq`
- Step 2: Z 표준화 — `Z = (X-μ)/σ`
- Step 3: 정규분포표 읽기 — `P(0≤Z≤z)` 값으로 확률 계산

---

## 검증 기준

- `npx tsc --noEmit` 에러 없음
- 고3 계정으로 진단 → 복습 세션 진입 시 ThinkingStep 3개 정상 표시
- 각 스텝 객관식 선택 → AI 피드백 채팅 진입 정상 동작
- `getReviewThinkingSteps('g3_diff')` 등 10개 약점 모두 length > 0 반환

# Spec: 진단 플로우 — 최종 버튼 버그 수정 + 확인 문제 13개 추가

**작성일**: 2026-04-14  
**범위**: `use-exam-diagnosis.ts`, `detailedDiagnosisFlows.ts`  
**목표**: 최종 카드 버튼 비활성화 버그 수정 + g3_/g1_ 약점 13개에 확인 문제 추가

---

## 배경

진단 플로우에서 두 가지 문제가 동시에 발생하고 있음:

1. **버그**: `advanceDraft`에서 final 노드를 `interactive: false`로 렌더링 → "이 약점으로 정리하기" 버튼이 항상 비활성화 → 세션이 완료되지 않고 멈춤
2. **UX 결함**: Stage 1/2에서 추가한 13개 메서드(sequence, log_exp, conic, limit 등)의 약점이 `checkPromptByWeakness`에 미등록 → `hasCheckNode = false` → explain 이후 확인 문제 없이 final로 바로 이동

---

## 변경 파일 (2개)

| 파일 | 변경 내용 |
|------|---------|
| `features/quiz/exam/hooks/use-exam-diagnosis.ts` | `advanceDraft` 1줄 수정 |
| `data/detailedDiagnosisFlows.ts` | `checkPromptByWeakness` 13개 항목 추가 |

---

## 수정 1: 최종 버튼 버그

**파일**: `features/quiz/exam/hooks/use-exam-diagnosis.ts:220`

```typescript
// Before
interactive: node.kind !== 'final',

// After
interactive: true,
```

**이유**: 새로 추가되는 카드는 항상 활성화되어야 함. 이전 카드 잠금은 별도 로직(`prev.map` freeze)이 처리함.

---

## 수정 2: 확인 문제 13개 추가

**파일**: `data/detailedDiagnosisFlows.ts` — `checkPromptByWeakness` Record에 추가

### 1. `g3_sequence` — 수열

```typescript
g3_sequence: {
  title: '수열 공식 확인',
  prompt: '등차수열 {aₙ}에서 a₁=2, 공차 d=3일 때 a₅는?',
  options: [
    { id: 'correct', text: '14', isCorrect: true },
    { id: 'wrong1', text: '12', isCorrect: false },
    { id: 'wrong2', text: '17', isCorrect: false },
  ],
},
```

*풀이: a₅ = 2 + (5-1)×3 = 14*

---

### 2. `g3_log_exp` — 지수·로그

```typescript
g3_log_exp: {
  title: '로그 계산 확인',
  prompt: 'log₂8의 값은?',
  options: [
    { id: 'correct', text: '3', isCorrect: true },
    { id: 'wrong1', text: '4', isCorrect: false },
    { id: 'wrong2', text: '2', isCorrect: false },
  ],
},
```

*풀이: log₂8 = log₂2³ = 3*

---

### 3. `g3_conic` — 이차곡선

```typescript
g3_conic: {
  title: '이차곡선 초점 확인',
  prompt: '포물선 y²=8x의 초점의 x좌표는?',
  options: [
    { id: 'correct', text: '2', isCorrect: true },
    { id: 'wrong1', text: '4', isCorrect: false },
    { id: 'wrong2', text: '8', isCorrect: false },
  ],
},
```

*풀이: y²=4px에서 4p=8, p=2. 초점 (2, 0)*

---

### 4. `g3_limit` — 극한

```typescript
g3_limit: {
  title: '극한값 확인',
  prompt: 'lim(x→∞) (2x+1)/x의 값은?',
  options: [
    { id: 'correct', text: '2', isCorrect: true },
    { id: 'wrong1', text: '1', isCorrect: false },
    { id: 'wrong2', text: '∞', isCorrect: false },
  ],
},
```

*풀이: lim(2x+1)/x = lim(2+1/x) = 2*

---

### 5. `g3_vector` — 벡터

```typescript
g3_vector: {
  title: '벡터 내적 확인',
  prompt: '벡터 a=(3,4), b=(1,0)일 때 a·b는?',
  options: [
    { id: 'correct', text: '3', isCorrect: true },
    { id: 'wrong1', text: '7', isCorrect: false },
    { id: 'wrong2', text: '4', isCorrect: false },
  ],
},
```

*풀이: a·b = 3×1 + 4×0 = 3*

---

### 6. `g3_probability` — 확률

```typescript
g3_probability: {
  title: '조건부확률 확인',
  prompt: 'P(A)=0.4, P(A∩B)=0.2일 때 P(B|A)는?',
  options: [
    { id: 'correct', text: '0.5', isCorrect: true },
    { id: 'wrong1', text: '0.2', isCorrect: false },
    { id: 'wrong2', text: '0.8', isCorrect: false },
  ],
},
```

*풀이: P(B|A) = P(A∩B)/P(A) = 0.2/0.4 = 0.5*

---

### 7. `g3_space_geometry` — 공간기하

```typescript
g3_space_geometry: {
  title: '정사영 길이 확인',
  prompt: '길이 4인 선분이 평면에 45°로 기울어져 있을 때 정사영의 길이는?',
  options: [
    { id: 'correct', text: '2√2', isCorrect: true },
    { id: 'wrong1', text: '4', isCorrect: false },
    { id: 'wrong2', text: '2', isCorrect: false },
  ],
},
```

*풀이: 4×cos45° = 4×(√2/2) = 2√2*

---

### 8. `g3_function` — 함수

```typescript
g3_function: {
  title: '역함수 확인',
  prompt: 'f(x)=3x-1일 때 f⁻¹(5)는?',
  options: [
    { id: 'correct', text: '2', isCorrect: true },
    { id: 'wrong1', text: '14', isCorrect: false },
    { id: 'wrong2', text: '6', isCorrect: false },
  ],
},
```

*풀이: y=3x-1 → x=(y+1)/3 → f⁻¹(5) = (5+1)/3 = 2*

---

### 9. `g3_statistics` — 통계

```typescript
g3_statistics: {
  title: '정규분포 표준화 확인',
  prompt: 'X~N(50, 4²)일 때 P(X≤58)을 구하려면 표준화 Z는?',
  options: [
    { id: 'correct', text: 'Z=2', isCorrect: true },
    { id: 'wrong1', text: 'Z=1.5', isCorrect: false },
    { id: 'wrong2', text: 'Z=8', isCorrect: false },
  ],
},
```

*풀이: Z = (58-50)/4 = 2*

---

### 10. `g1_geometry` — 평면기하

```typescript
g1_geometry: {
  title: '피타고라스 정리 확인',
  prompt: '직각삼각형에서 두 변이 3, 4일 때 빗변의 길이는?',
  options: [
    { id: 'correct', text: '5', isCorrect: true },
    { id: 'wrong1', text: '7', isCorrect: false },
    { id: 'wrong2', text: '√7', isCorrect: false },
  ],
},
```

*풀이: √(9+16) = √25 = 5*

---

### 11. `g3_counting` — 순열·조합

```typescript
g3_counting: {
  title: '순열·조합 구분 확인',
  prompt: '5명 중 대표 2명을 뽑을 때 (순서 무관) 경우의 수는?',
  options: [
    { id: 'correct', text: '10', isCorrect: true },
    { id: 'wrong1', text: '20', isCorrect: false },
    { id: 'wrong2', text: '5', isCorrect: false },
  ],
},
```

*풀이: C(5,2) = 5!/(2!×3!) = 10*

---

### 12. `g3_integral` — 적분

```typescript
g3_integral: {
  title: '정적분 계산 확인',
  prompt: '∫₀² 2x dx의 값은?',
  options: [
    { id: 'correct', text: '4', isCorrect: true },
    { id: 'wrong1', text: '2', isCorrect: false },
    { id: 'wrong2', text: '8', isCorrect: false },
  ],
},
```

*풀이: [x²]₀² = 4 - 0 = 4*

---

### 13. `g3_diff` — 미분

```typescript
g3_diff: {
  title: '합성함수 미분 확인',
  prompt: 'f(x)=(2x+1)³을 미분하면?',
  options: [
    { id: 'correct', text: '6(2x+1)²', isCorrect: true },
    { id: 'wrong1', text: '3(2x+1)²', isCorrect: false },
    { id: 'wrong2', text: '2(2x+1)³', isCorrect: false },
  ],
},
```

*풀이: chain rule → 3(2x+1)² × 2 = 6(2x+1)²*

---

## 검증 기준

- `npx tsc --noEmit` 에러 없음
- 13개 약점 모두 `checkPromptByWeakness`에 등록 → `hasCheckNode = true`
- 기존 확인 문제 있는 메서드 동작 변화 없음
- final 노드 `interactive: true` → "이 약점으로 정리하기" 버튼 활성화

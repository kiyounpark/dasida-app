# 약점 연습 "완료하기" 버튼 노출 시점 개선

**날짜:** 2026-04-25
**상태:** 설계 완료

---

## 문제 정의

약점 기반 연습(`약점 기반 연습`) 화면에서 첫 문제 한 개만 풀어도 하단의 `약점 연습 완료하기` 버튼이 즉시 노출된다. 결과적으로 같은 시점에 두 개의 주요 CTA가 화면에 동시에 떠 있는 어색한 상태가 된다:

- 답 선택 + `정답 확인` (현재 문제 풀이용)
- `약점 연습 완료하기` (졸업/세션 종료용)

진행도 카운터(`2/3`)가 "끝까지 풀고 나서 완료된다"는 메시지를 주는데, 중간에 완료 버튼이 떠 있으면 진행도가 무의미해진다.

### 재현 시나리오

1. 약점 연습 진입 → 1번 문제 정답 → "다음 약점 문제" 클릭
2. 2번 문제 화면 진입 → 답 선택 UI(상단 `정답 확인`) **그리고 동시에** 하단에 `약점 연습 완료하기` 동시 노출 (❌ 어색)
3. 사용자 시선 분산, "지금 풀어야 하나? 그만 풀고 나가야 하나?" 혼동

---

## 근본 원인

[`features/quiz/hooks/use-practice-screen.ts:445`](../../../../features/quiz/hooks/use-practice-screen.ts)의 `canGraduate` 조건이 너무 느슨하다.

```ts
canGraduate: activeMode === 'weakness' && solvedCount > 0 && !profile?.practiceGraduatedAt
```

`solvedCount > 0`(1문제 이상 풀이 완료)만으로 졸업 버튼이 뜬다. 사용자는 마지막 문제까지 다 풀고 나서 졸업하길 기대하는데, 그 의도를 코드가 따라가지 못한다.

---

## 설계

### 동작 정의

| 시점 | 변경 전 | 변경 후 |
|---|---|---|
| 1문제 풀이 완료 (1/3 완료) | 졸업 바 노출 | **비노출** |
| 2문제 풀이 완료 (2/3 완료) | 졸업 바 노출 | **비노출** |
| 마지막 문제 풀이 완료 (3/3 완료) | 졸업 바 노출 | 졸업 바 노출 (그대로) |
| 중도 백버튼 이탈 (2/3에서 종료) | 모달 → 허브 | 모달 → 허브 (그대로) |
| 재진입 시 | 처음부터 (1/3) | 처음부터 (1/3, 그대로) |

중도 이탈은 헤더 `<` 백버튼으로만 가능하다. 별도의 조기 졸업 CTA는 두지 않는다.

### 변경 방법

`canGraduate` 조건을 `solvedCount >= questionCount`로 강화한다.

```ts
// 변경 전
canGraduate: activeMode === 'weakness' && solvedCount > 0 && !profile?.practiceGraduatedAt

// 변경 후
canGraduate:
  activeMode === 'weakness' &&
  questionCount > 0 &&
  solvedCount >= questionCount &&
  !profile?.practiceGraduatedAt
```

`solvedCount`는 `onContinue` 시점에 증가하므로, 마지막 문제의 피드백 단계에서 "연습 완료" 버튼을 누른 직후에 `canGraduate`가 `true`가 된다.

`questionCount > 0` 가드는 빈 큐 진입(예: 약점이 없는 상태)에서 0/0 케이스 노출을 방지한다.

### 화면 흐름 (변경 후)

```
1번 문제 진입
  → 답 선택 → 정답 확인 → 피드백 → "다음 약점 문제"
  → solvedCount = 1, canGraduate = false (졸업 바 비노출)
2번 문제 진입
  → 답 선택 → 정답 확인 → 피드백 → "다음 약점 문제"
  → solvedCount = 2, canGraduate = false (졸업 바 비노출)
3번(마지막) 문제 진입
  → 답 선택 → 정답 확인 → 피드백 → "연습 완료"
  → solvedCount = 3, canGraduate = true (졸업 바 노출)
  → 사용자가 졸업 바 탭 → graduateToPractice() → 허브 이동
```

---

## 백엔드 영향 (확인 완료, 변경 없음)

학습 기록 저장 측면은 이미 견고하게 구현되어 있어 추가 변경이 필요 없다.

| 항목 | 동작 | 변경 |
|---|---|---|
| per-problem 학습 기록 | `onContinue` 시점에 `recordAttempt`로 저장 (AsyncStorage/Firebase). 정답/오답, `firstSelectedIndex`, `finalSelectedIndex`, `wrongAttempts`, `usedCoaching`, 타임스탬프, weaknessId 포함. | 그대로 |
| 중도 이탈 모달 | "푼 문제는 저장돼요 / 현재 문제는 저장 안 돼요"로 정확히 안내 | 그대로 |
| `practiceGraduatedAt` | 졸업 시 SET. `if (profile.practiceGraduatedAt) return` 가드 존재 | 그대로 |
| `pendingPracticeStartedAt` | 진입 시 SET, 정상 종료 시 CLEAR. 진단 시각 기준 stale 처리 | 그대로 |
| 스페이스드 리피티션 | day1→day3→day7→day30 자동 스케줄링 | 그대로 |

재진입 시 같은 문제를 다시 풀더라도 `attemptId`는 `weakness-practice-{weaknessId}-{problemId}-{startedAtKey}` 형식으로 매번 달라지므로 중복 누적 저장된다(현행 정책 유지).

---

## 영향 범위

### 변경 파일
- `features/quiz/hooks/use-practice-screen.ts`: `canGraduate` 조건 한 줄 수정

### 변경 없음 (검증 완료)
- `features/learner/current-learner-controller.ts` — `graduateToPractice()` 그대로
- `features/quiz/components/graduate-floating-bar.tsx` — 컴포넌트 그대로
- `features/quiz/components/quiz-practice-screen-view.tsx` — `canGraduate` prop만 받아 분기
- `app/(tabs)/_layout.tsx` — `practiceGraduatedAt`만 참조 → 졸업 시점이 늦춰져도 결과 동일
- `features/learning/home-journey-state.ts` — `practiceGraduatedAt` / `pendingPracticeStartedAt`만 참조 → 영향 없음
- `features/quiz/hooks/use-step-complete-screen.ts`, `features/quiz/hooks/use-quiz-hub-screen.ts` — `graduateToPractice` 호출하지만 별도 화면 흐름

---

## 엣지 케이스

| 케이스 | 처리 |
|---|---|
| `questionCount === 0` (큐가 빈 상태에서 진입) | `canGraduate: false` (`questionCount > 0` 가드로 보호) |
| 마지막 문제까지 풀이 완료 후 졸업 바를 누르지 않고 백버튼으로 이탈 | `practiceGraduatedAt` 미세팅. 다음 진입 시 큐가 비어있지 않다면 다시 졸업 가능 (현행 동작 유지). 단, `canGraduate` 조건상 처음 진입 직후엔 `solvedCount = 0`이므로 졸업 바가 일단 사라졌다가 다시 풀이 완료 시 재노출됨. |
| `activeMode === 'review'` 또는 `'challenge'` | `canGraduate: false` (기존 가드 그대로) |
| 이미 `practiceGraduatedAt`이 세팅된 사용자 재진입 | `canGraduate: false` (기존 가드 그대로) |
| `solvedCount`가 `questionCount`와 같은데 마지막 피드백이 표시 중 (continue 미클릭 상태) | `solvedCount`는 `onContinue` 시점에 증가하므로, "연습 완료" 버튼 누르기 전엔 `solvedCount = questionCount - 1`. 즉 졸업 바는 마지막 continue 직후에야 노출된다. 의도된 동작. |

---

## 테스트 계획

- 약점 연습 진입 → 1번 정답 → "다음 약점 문제" → 졸업 바 비노출 확인
- 2번 정답 → "다음 약점 문제" → 졸업 바 비노출 확인
- 3번(마지막) 정답 → "연습 완료" 클릭 → 졸업 바 노출 확인
- 졸업 바 탭 → `practiceGraduatedAt` SET, 허브로 이동, `pendingPracticeStartedAt` CLEAR
- 2번째 문제 풀이 직후 백버튼 → 모달 노출 → "허브로" → 다시 진입 시 1번부터 시작 확인
- 마지막 문제까지 풀고 졸업 바 안 누르고 백버튼 → 정상 종료 (모달 + `practiceGraduatedAt` 미세팅)

---

## 향후 별도 작업 (이번 스펙 범위 아님)

- 카드 안 ①②③④⑤가 시각적으로 탭 가능해 보이지만 실제로는 하단 버튼만 인터랙티브한 점
- 카드 아래 빈 공간 (ScrollView `flex: 1`)
- 마지막 문제 풀이 완료 후 졸업 바 안 누르고 이탈했을 때의 안내 UX 강화 (필요 시)

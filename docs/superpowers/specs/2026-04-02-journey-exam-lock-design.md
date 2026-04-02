# 여정 보드 모의고사 직행 경로 제거 설계

**날짜:** 2026-04-02  
**범위:** `QuizHubScreen` (pre-graduation 뷰)에서 모의고사 직행 경로 완전 제거

---

## 배경

`feat/mock-exam-graduation` 구현으로 `practiceGraduatedAt`이 설정되면 퀴즈 탭 루트가 `MockExamIntroScreen`으로 전환된다. 그러나 졸업 전(`QuizHubScreen` 표시 중)에도 여정 보드의 step 4(완벽 마스터)에 도달하면 CTA가 "대표 세트 열기" → `/quiz/exams`로 직접 이동하는 경로가 남아 있다.

의도한 학습 여정은 다음과 같다:

```
진단 → 분석 → 약점 연습 → [약점 연습 완료하기] → 모의고사
```

졸업 버튼을 거치지 않고 모의고사에 진입하는 경로를 제거해, 졸업 전환의 의미를 보존한다.

---

## 목표

1. `QuizHubScreen` 안 여정 보드에서 `'open_exam'` CTA 액션을 완전히 제거한다.
2. `exam` 단계는 항상 `'pending'` 상태로 표시 — 목적지 미리보기 역할만 한다.
3. 복습을 모두 마친 상태에서 여정 보드 CTA는 약점 연습 화면으로 유도한다 (거기서 졸업 버튼 누르도록).

---

## 상태 분기

| 현재 단계 | 조건 | CTA 라벨 | CTA 액션 |
|---|---|---|---|
| `diagnostic` | 진단 전 | 첫 진단 시작하기 | `start_diagnostic` |
| `analysis` | 진단 완료, 분석 미확인 | 약점 결과 보기 | `open_result` |
| `review` | 복습 N개 남음 | 복습 N개 시작하기 | `open_review` |
| `review` | 복습 완료 (dueCount=0) | 약점 연습 시작하기 | `open_review` |
| ~~`exam`~~ | ~~졸업 전~~ | ~~대표 세트 열기~~ | ~~`open_exam`~~ (제거) |

`exam` 단계 상태: 항상 `'pending'` (현재 단계가 `review`이면 `pending`, 그 이전이면 `locked`)

---

## 변경 파일

### 1. `features/learning/home-journey-state.ts`

**`JourneyCtaAction` 타입:**
```ts
export type JourneyCtaAction =
  | 'start_diagnostic'
  | 'open_result'
  | 'open_review';
// 'open_exam' 제거
```

**`getCurrentStep()`:**
- `'exam'` 반환 조건 완전 제거
- 최대 `'review'`까지만 반환

변경 전:
```ts
if (
  summary.featuredExamState.status !== 'not_started' ||
  (hasLatestDiagnostic && hasReviewAfterLatestDiagnostic && !hasDueReviews)
) {
  return 'exam';
}
```

변경 후: 위 블록 전체 삭제

**`getStepStatus()`:**
- `currentStep`이 최대 `'review'`이므로 `exam`은 항상 `'pending'` 반환
- 기존 `if (currentStep === 'exam')` 블록 삭제

**`getCtaState()`:**
- `exam` 케이스 블록 삭제
- `review` 케이스에서 `dueCount === 0`일 때 라벨 변경:

```ts
if (currentStep === 'review') {
  const dueCount = summary.dueReviewTasks?.length ?? 0;
  if (dueCount === 0) {
    return {
      ctaAction: 'open_review',
      ctaLabel: '약점 연습 시작하기',
      ctaBody: '약점 연습을 마치면 모의고사가 열립니다.',
    };
  }
  return {
    ctaAction: 'open_review',
    ctaLabel: dueCount > 1 ? `복습 ${dueCount}개 시작하기` : '복습 시작하기',
    ctaBody: ...,
  };
}
```

**`getCurrentBubbleText()`:**
- `'exam'` 케이스 삭제

**`getCurrentStepBody()`:**
- `'exam'` 케이스 삭제

---

### 2. `features/quiz/hooks/use-quiz-hub-screen.ts`

**`UseQuizHubScreenResult` 타입:**
- `onOpenExams` 제거

**`onOpenPractice()` 수정:**

변경 전:
```ts
const onOpenPractice = () => {
  if (!homeState || homeState.hero !== 'review' || homeState.todayReviewCount === 0) {
    return;
  }
  router.push({ pathname: '/quiz/practice', params: { mode: 'review' } });
};
```

변경 후:
```ts
const onOpenPractice = () => {
  if (!homeState) return;

  if (homeState.todayReviewCount > 0) {
    router.push({ pathname: '/quiz/practice', params: { mode: 'review' } });
    return;
  }

  router.push({ pathname: '/quiz/practice', params: { mode: 'weakness' } });
};
```

**`onPressJourneyCta()` 수정:**
- `'open_exam'` 케이스 제거

변경 전:
```ts
case 'open_exam':
  onOpenExams();
  return;
```

변경 후: 해당 케이스 삭제

**`onOpenExams` 함수 및 반환값에서 제거**

---

## 검증 체크리스트

- [ ] 진단 전 — 여정 보드 CTA "첫 진단 시작하기" 정상 동작
- [ ] 분석 단계 — CTA "약점 결과 보기" 정상 동작
- [ ] 복습 N개 남음 — CTA "복습 N개 시작하기" → 복습 화면
- [ ] 복습 완료 (dueCount=0) — CTA "약점 연습 완료하기" → 약점 연습 화면
- [ ] 약점 연습 화면에서 "약점 연습 완료하기" 버튼 → `MockExamIntroScreen` 전환
- [ ] 여정 보드 step 4 노드 상태: 항상 `pending` (진입 불가)
- [ ] 앱 어디에도 `/quiz/exams` 직행 경로가 여정 보드에서 호출되지 않음
- [ ] `npm run typecheck`, `npm run lint` 통과

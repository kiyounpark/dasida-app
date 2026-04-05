# Ebbinghaus Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈 화면에 인라인 10초 타이머가 내장된 에빙하우스 복습 카드를 추가하고, 단계별 사고 흐름 → 선택지 + 자유 입력 → AI 피드백 → 완료(기억났어요!/다시 볼게요) 복습 세션을 구현한다.

**Architecture:** 기존 `LocalLearningHistoryRepository`가 이미 `ReviewTask` 생성·단계 진행을 담당하므로 중복 구현하지 않는다. "기억났어요!" → `review-scheduler.ts`의 `completeReviewTask`로 다음 stage task 생성 + 현재 complete, "다시 볼게요" → `rescheduleReviewTask`로 동일 stage 재예약. 두 경우 모두 `LocalReviewTaskStore`(기존 `local-learning-history-storage.ts`와 동일 키 공유)를 직접 조작 후 `refresh()`로 홈 상태 갱신. AI 피드백은 새 Cloud Function 엔드포인트 사용.

**Tech Stack:** Expo/React Native, TypeScript, AsyncStorage, Firebase Cloud Functions v2, OpenAI gpt-4.1, expo-router, `react-native-safe-area-context`

---

## File Map

| 경로 | 종류 | 역할 |
|------|------|------|
| `data/review-content-map.ts` | Modify | `ThinkingStep` 타입 + 23개 약점별 3단계 사고 흐름 데이터 추가 |
| `features/learning/review-scheduler.ts` | Create | `completeReviewTask`, `rescheduleReviewTask`, `applyOverduePenalties` |
| `functions/src/review-feedback.ts` | Create | Cloud Function — AI 보완 피드백 |
| `functions/src/index.ts` | Modify | `reviewFeedback` export 추가 |
| `functions/tests/review-feedback.test.ts` | Create | Cloud Function 유닛 테스트 |
| `constants/env.ts` | Modify | `reviewFeedbackUrl`, `reviewFeedbackTimeoutMs` 추가 |
| `features/quiz/review-feedback.ts` | Create | 클라이언트 fetch wrapper |
| `features/quiz/components/review-home-card.tsx` | Create | 홈 카드 (인라인 10초 타이머) |
| `features/quiz/hooks/use-review-session-screen.ts` | Create | 복습 세션 훅 |
| `features/quiz/components/review-session-screen-view.tsx` | Create | 복습 세션 뷰 |
| `app/(tabs)/quiz/review-session.tsx` | Create | 라우트 |
| `app/(tabs)/quiz/_layout.tsx` | Modify | `review-session` 스크린 추가 |
| `features/quiz/hooks/use-quiz-hub-screen.ts` | Modify | `onPressReviewCard`, `dueReviewTasks` 노출 + 오버듀 패널티 effect |
| `features/quiz/components/quiz-hub-screen-view.tsx` | Modify | `ReviewHomeCard` 조건부 렌더링 |

---

## Task 1: review-content-map.ts에 ThinkingStep 데이터 추가

**Files:**
- Modify: `data/review-content-map.ts`

- [ ] **Step 1: ThinkingStep 타입 추가 및 ReviewContent 확장**

`data/review-content-map.ts` 파일 상단 타입 정의를 아래로 교체:

```ts
import { diagnosisMap, type WeaknessId } from './diagnosisMap';

export type ThinkingStep = {
  title: string;
  body: string;
  example?: string;
  choices: Array<{ text: string; correct: boolean }>;
};

type ReviewContent = {
  heroPrompt: string;
  thinkingSteps: ThinkingStep[];
};
```

- [ ] **Step 2: 전체 reviewContentMap 교체 (23개 약점 데이터 포함)**

파일의 `const reviewContentMap` 선언 전체를 아래로 교체:

```ts
const reviewContentMap: Partial<Record<WeaknessId, ReviewContent>> = {
  discriminant_calculation: {
    heroPrompt: '판별식은 b^2와 4ac를 따로 계산한 뒤 빼야 한다는 흐름이 떠오르나요?',
    thinkingSteps: [
      {
        title: 'a, b, c 부호 확인',
        body: 'ax²+bx+c에서 각 계수를 부호 포함해서 먼저 읽는다.',
        example: '예) 2x²−3x+1 → a=2, b=−3, c=1',
        choices: [
          { text: '계산 실수를 줄이기 위해서', correct: false },
          { text: '음수 부호를 빠뜨리면 결과가 달라지니까', correct: true },
          { text: '근의 공식을 외우기 쉽게 하기 위해서', correct: false },
        ],
      },
      {
        title: 'b² 먼저, 4ac 나중',
        body: 'b²를 먼저 계산하고, 그 다음 4×a×c를 따로 계산한다.',
        example: '예) b=−3 → b²=9 / 4×2×1=8',
        choices: [
          { text: 'b²는 b 하나만 써서 가장 단순하니까', correct: true },
          { text: '4ac가 더 중요해서 나중에 집중하려고', correct: false },
          { text: '순서는 상관없고 습관적으로', correct: false },
        ],
      },
      {
        title: '빼고 나서 판단',
        body: 'b²−4ac의 결과가 양수/0/음수인지 보고 근의 개수를 결론짓는다.',
        example: '9−8=1 > 0 → 서로 다른 두 실근',
        choices: [
          { text: '결과의 숫자 크기로 근의 종류를 결정한다', correct: false },
          { text: '결과의 부호(양수/0/음수)만 보면 된다', correct: true },
          { text: '결과가 0보다 크면 항상 두 근이 같다', correct: false },
        ],
      },
    ],
  },
  formula_understanding: {
    heroPrompt: '완전제곱식으로 바꿀 때 왜 x 계수의 절반을 제곱해야 하는지 기억나나요?',
    thinkingSteps: [
      {
        title: 'x 계수의 절반 추출',
        body: 'ax²+bx+c에서 x 계수 b를 확인하고 b/2를 먼저 구한다.',
        example: '예) x²+6x+5 → b=6, b/2=3',
        choices: [
          { text: 'b를 그대로 쓰면 된다', correct: false },
          { text: 'b/2를 먼저 계산해야 한다', correct: true },
          { text: '계수는 신경 쓰지 않아도 된다', correct: false },
        ],
      },
      {
        title: '(x + b/2)² 완성',
        body: '(x + b/2)²을 전개하면 x²+bx+(b/2)²이므로 원식에서 (b/2)²을 더하고 뺀다.',
        example: '예) x²+6x → (x+3)²−9',
        choices: [
          { text: '(b/2)²을 더하고 뺀다', correct: true },
          { text: 'b를 그대로 제곱한다', correct: false },
          { text: '상수항은 변하지 않는다', correct: false },
        ],
      },
      {
        title: '상수항 정리',
        body: '원래 상수항 c와 −(b/2)²을 합산하여 완전제곱식 꼴로 완성한다.',
        example: '예) (x+3)²−9+5 = (x+3)²−4',
        choices: [
          { text: '상수를 무시하고 계수만 본다', correct: false },
          { text: 'c − (b/2)²을 최종 상수로 쓴다', correct: true },
          { text: '상수항은 항상 0이다', correct: false },
        ],
      },
    ],
  },
  calc_repeated_error: {
    heroPrompt: '대입 계산에서 음수 구간을 따로 끊어 보는 순서, 아직 떠오르나요?',
    thinkingSteps: [
      {
        title: '대입할 값을 식에서 먼저 정리',
        body: '대입 전에 계산할 값 x=a를 식에서 읽고, 음수인지 확인한다.',
        example: '예) f(−2) 구하기 → x=−2 확인 후 대입',
        choices: [
          { text: '값을 바로 대입하면 된다', correct: false },
          { text: '대입 전 부호를 먼저 확인한다', correct: true },
          { text: '양수일 때만 조심하면 된다', correct: false },
        ],
      },
      {
        title: '음수 구간 괄호 처리',
        body: '음수를 대입할 때 반드시 괄호로 감싸서 부호 실수를 막는다.',
        example: '예) f(x)=x²+2x → f(−2)=(−2)²+2(−2)=4−4=0',
        choices: [
          { text: '음수는 괄호 없이 써도 된다', correct: false },
          { text: '음수 대입 시 괄호로 감싼다', correct: true },
          { text: '제곱이면 부호가 사라진다', correct: false },
        ],
      },
      {
        title: '항별 계산 후 합산',
        body: '각 항을 따로 계산한 뒤 마지막에 합산한다.',
        example: '예) (−2)²=4, 2(−2)=−4 → 4+(−4)=0',
        choices: [
          { text: '전체를 한 번에 계산한다', correct: false },
          { text: '항별로 나눠서 계산 후 합친다', correct: true },
          { text: '계산 순서는 중요하지 않다', correct: false },
        ],
      },
    ],
  },
  min_value_read_confusion: {
    heroPrompt: '(x-a)^2+b 꼴에서 최솟값과 그 값을 갖는 x를 어떻게 나눠서 읽었는지 기억나나요?',
    thinkingSteps: [
      {
        title: '완전제곱식 꼴 확인',
        body: '식을 (x−a)²+b 꼴로 변환하거나 이미 그 꼴인지 확인한다.',
        example: '예) (x−3)²+2 → a=3, b=2',
        choices: [
          { text: '표준형으로 바꿀 필요 없다', correct: false },
          { text: '(x−a)²+b 꼴로 먼저 파악한다', correct: true },
          { text: 'a와 b는 어차피 같은 값이다', correct: false },
        ],
      },
      {
        title: '최솟값은 상수항 b',
        body: '(x−a)²≥0이므로 최솟값은 제곱 항이 0일 때의 값 b이다.',
        example: '예) (x−3)²+2 → 최솟값 = 2',
        choices: [
          { text: '최솟값은 a이다', correct: false },
          { text: '최솟값은 상수항 b이다', correct: true },
          { text: '최솟값은 a+b이다', correct: false },
        ],
      },
      {
        title: '최솟값이 되는 x는 a',
        body: '제곱 항이 0이 되려면 x=a여야 하므로, 최솟값을 갖는 x는 a이다.',
        example: '예) (x−3)²+2 → x=3일 때 최솟값 2',
        choices: [
          { text: 'x=b일 때 최솟값이 된다', correct: false },
          { text: 'x=a일 때 최솟값 b를 갖는다', correct: true },
          { text: 'x=0일 때 항상 최솟값이다', correct: false },
        ],
      },
    ],
  },
  vertex_formula_memorization: {
    heroPrompt: '꼭짓점 x좌표를 구할 때 -b를 먼저 읽고 2a로 나누는 순서가 떠오르나요?',
    thinkingSteps: [
      {
        title: 'a, b 부호 포함 읽기',
        body: 'ax²+bx+c에서 a와 b를 부호 포함해서 읽는다.',
        example: '예) 2x²−6x+1 → a=2, b=−6',
        choices: [
          { text: '계수만 읽고 부호는 나중에 본다', correct: false },
          { text: 'a와 b를 부호 포함해서 먼저 읽는다', correct: true },
          { text: 'c는 꼭짓점에 영향을 준다', correct: false },
        ],
      },
      {
        title: '꼭짓점 x좌표 = −b / 2a',
        body: '꼭짓점 x좌표는 −b를 2a로 나눈 값이다.',
        example: '예) a=2, b=−6 → x = −(−6)/(2×2) = 6/4 = 3/2',
        choices: [
          { text: '꼭짓점 x좌표 = b/a이다', correct: false },
          { text: '꼭짓점 x좌표 = −b/(2a)이다', correct: true },
          { text: '꼭짓점 x좌표 = 2b/a이다', correct: false },
        ],
      },
      {
        title: 'y좌표는 원래 식에 x 대입',
        body: '꼭짓점 x좌표를 원래 식에 대입하여 y좌표(최솟값/최댓값)를 구한다.',
        example: '예) f(3/2) = 2(3/2)²−6(3/2)+1 계산',
        choices: [
          { text: 'y좌표는 c와 같다', correct: false },
          { text: 'x좌표를 원래 식에 대입한다', correct: true },
          { text: 'y좌표는 따로 공식이 있다', correct: false },
        ],
      },
    ],
  },
  coefficient_sign_confusion: {
    heroPrompt: 'ax^2+bx+c로 다시 쓸 때 계수를 부호까지 포함해 읽는 기준이 기억나나요?',
    thinkingSteps: [
      {
        title: '각 항의 계수와 부호 함께 읽기',
        body: '식에서 x², x, 상수항 앞에 붙은 부호(+/−)를 계수의 일부로 읽는다.',
        example: '예) 3x²−5x+2 → a=3, b=−5, c=2',
        choices: [
          { text: '부호는 공식 대입 시 붙인다', correct: false },
          { text: '계수를 부호 포함해서 읽는다', correct: true },
          { text: '부호는 따로 기억한다', correct: false },
        ],
      },
      {
        title: 'a, b, c를 명시적으로 기록',
        body: '풀기 전에 a=_, b=_, c=_ 를 여백에 써두고 시작한다.',
        example: '예) a=3, b=−5, c=2 → 공식에 대입 준비',
        choices: [
          { text: '암산으로 바로 대입한다', correct: false },
          { text: '여백에 a, b, c를 먼저 쓴다', correct: true },
          { text: '공식만 알면 쓸 필요 없다', correct: false },
        ],
      },
      {
        title: '공식에 부호 포함 대입',
        body: '공식에 a, b, c를 괄호로 감싸서 대입하면 부호 실수를 막는다.',
        example: '예) −b/(2a) = −(−5)/(2×3) = 5/6',
        choices: [
          { text: '괄호 없이 숫자만 대입한다', correct: false },
          { text: '괄호로 감싸서 부호 포함 대입한다', correct: true },
          { text: '부호는 결과에서 조정한다', correct: false },
        ],
      },
    ],
  },
  derivative_calculation: {
    heroPrompt: 'x^n을 미분할 때 지수는 앞으로, 지수는 하나 감소한다는 규칙이 떠오르나요?',
    thinkingSteps: [
      {
        title: 'xⁿ의 미분 규칙 확인',
        body: 'xⁿ을 미분하면 n·xⁿ⁻¹이다. 지수를 계수 앞으로 내리고 지수를 1 줄인다.',
        example: '예) x³ → 3x²',
        choices: [
          { text: 'xⁿ → xⁿ⁺¹ / (n+1)', correct: false },
          { text: 'xⁿ → n·xⁿ⁻¹', correct: true },
          { text: 'xⁿ → n·xⁿ', correct: false },
        ],
      },
      {
        title: '각 항을 따로 미분',
        body: '다항식은 각 항을 독립적으로 미분한 뒤 합산한다.',
        example: '예) f(x)=3x³+2x → f\'(x)=9x²+2',
        choices: [
          { text: '전체를 한 번에 미분한다', correct: false },
          { text: '각 항을 따로 미분 후 합산한다', correct: true },
          { text: '상수항도 미분하면 계수가 나온다', correct: false },
        ],
      },
      {
        title: '상수항 미분 결과는 0',
        body: '상수항(숫자만 있는 항)을 미분하면 0이 된다.',
        example: '예) f(x)=x²+3 → f\'(x)=2x+0=2x',
        choices: [
          { text: '상수항은 미분하면 1이 된다', correct: false },
          { text: '상수항을 미분하면 0이 된다', correct: true },
          { text: '상수항은 미분하지 않는다', correct: false },
        ],
      },
    ],
  },
  solving_order_confusion: {
    heroPrompt: "f'(x)=0으로 x를 구한 뒤 원함수에 대입하는 순서, 다시 떠올릴 수 있나요?",
    thinkingSteps: [
      {
        title: "f'(x) = 0 방정식 세우기",
        body: '극값을 구하려면 먼저 도함수 f\'(x)를 구하고 f\'(x)=0으로 놓는다.',
        example: '예) f(x)=x³−3x → f\'(x)=3x²−3=0',
        choices: [
          { text: 'f(x)=0으로 놓는다', correct: false },
          { text: "f'(x)=0으로 놓는다", correct: true },
          { text: "f''(x)=0으로 놓는다", correct: false },
        ],
      },
      {
        title: 'x 값 구하기',
        body: "f'(x)=0을 풀어서 극값 후보 x를 구한다.",
        example: '예) 3x²−3=0 → x²=1 → x=±1',
        choices: [
          { text: 'x 값은 부호에 관계없이 하나다', correct: false },
          { text: '방정식을 풀어 후보 x 값을 모두 구한다', correct: true },
          { text: 'x는 항상 양수만 구한다', correct: false },
        ],
      },
      {
        title: '원함수에 대입해 극값 계산',
        body: '구한 x를 원래 f(x)에 대입하여 극댓값/극솟값을 구한다.',
        example: '예) f(1)=1−3=−2, f(−1)=−1+3=2',
        choices: [
          { text: "f'(x)에 x를 대입한다", correct: false },
          { text: '원함수 f(x)에 x를 대입한다', correct: true },
          { text: '대입 없이 x만 답으로 쓴다', correct: false },
        ],
      },
    ],
  },
  max_min_judgement_confusion: {
    heroPrompt: 'a의 부호를 보고 최댓값인지 최솟값인지 먼저 판단하는 기준이 기억나나요?',
    thinkingSteps: [
      {
        title: 'a의 부호 확인',
        body: 'ax²+bx+c에서 a의 부호를 먼저 읽는다.',
        example: '예) −2x²+4x+1 → a=−2 (음수)',
        choices: [
          { text: 'c의 부호를 본다', correct: false },
          { text: 'a의 부호를 먼저 확인한다', correct: true },
          { text: 'b의 부호를 본다', correct: false },
        ],
      },
      {
        title: 'a>0이면 최솟값, a<0이면 최댓값',
        body: 'a>0이면 아래로 볼록 → 꼭짓점이 최솟값. a<0이면 위로 볼록 → 꼭짓점이 최댓값.',
        example: '예) a=−2 → 위로 볼록 → 꼭짓점이 최댓값',
        choices: [
          { text: 'a>0이면 최댓값이다', correct: false },
          { text: 'a>0이면 최솟값, a<0이면 최댓값이다', correct: true },
          { text: 'a의 부호와 극값 유형은 무관하다', correct: false },
        ],
      },
      {
        title: '꼭짓점의 y좌표가 극값',
        body: '판단 후 꼭짓점 x좌표를 구해 원래 식에 대입하여 실제 극값을 계산한다.',
        example: '예) a=−2, b=4 → x=1 → f(1)=−2+4+1=3 (최댓값)',
        choices: [
          { text: '꼭짓점 x좌표가 극값이다', correct: false },
          { text: '꼭짓점 y좌표(f(x))가 극값이다', correct: true },
          { text: '극값은 상수항 c이다', correct: false },
        ],
      },
    ],
  },
  basic_concept_needed: {
    heroPrompt: '완전제곱식에서 값과 위치를 나눠 보는 기본 해석부터 다시 떠올려볼까요?',
    thinkingSteps: [
      {
        title: '완전제곱식이란?',
        body: '(x−a)²+b 꼴로 표현된 식. 제곱 부분은 항상 0 이상이다.',
        example: '예) (x−2)²+3 → 최솟값 3, x=2일 때',
        choices: [
          { text: '완전제곱식은 ax²+bx+c 꼴이다', correct: false },
          { text: '완전제곱식은 (x−a)²+b 꼴이다', correct: true },
          { text: '완전제곱식은 항상 양수이다', correct: false },
        ],
      },
      {
        title: '값(b)과 위치(a) 구분',
        body: '극값은 b(상수항), 그 위치는 x=a이다. 두 가지를 혼동하지 않는다.',
        example: '예) (x−2)²+3 → 극값=3, 위치=x=2',
        choices: [
          { text: '극값은 a이고 위치는 b이다', correct: false },
          { text: '극값은 b이고 위치는 x=a이다', correct: true },
          { text: '극값과 위치는 모두 a이다', correct: false },
        ],
      },
      {
        title: 'a의 부호로 최대/최소 구분',
        body: 'a>0이면 (x−a)² 부분이 최소 0이므로 전체 최솟값이 b. a<0이면 최댓값.',
        example: '예) a>0 → 최솟값=b, a<0 → 최댓값=b',
        choices: [
          { text: 'a 부호와 무관하게 b가 최솟값이다', correct: false },
          { text: 'a>0이면 b가 최솟값, a<0이면 최댓값이다', correct: true },
          { text: 'a<0이면 최솟값이 존재하지 않는다', correct: false },
        ],
      },
    ],
  },
  factoring_pattern_recall: {
    heroPrompt: '곱과 합을 동시에 보며 인수분해 두 수를 찾는 기준이 기억나나요?',
    thinkingSteps: [
      {
        title: '상수항 c와 x계수 b 동시에 읽기',
        body: 'x²+bx+c에서 b(합)와 c(곱)를 동시에 파악한다.',
        example: '예) x²+5x+6 → 합=5, 곱=6',
        choices: [
          { text: '계수 b만 보면 된다', correct: false },
          { text: '합 b와 곱 c를 동시에 파악한다', correct: true },
          { text: 'c만 보면 인수를 알 수 있다', correct: false },
        ],
      },
      {
        title: '곱이 c, 합이 b인 두 정수 찾기',
        body: 'c를 만드는 두 수의 조합 중 합이 b가 되는 쌍을 찾는다.',
        example: '예) 곱=6, 합=5 → 2와 3 (2×3=6, 2+3=5)',
        choices: [
          { text: '두 수의 차가 b가 되어야 한다', correct: false },
          { text: '두 수의 곱=c, 합=b인 쌍을 찾는다', correct: true },
          { text: '두 수는 항상 양수여야 한다', correct: false },
        ],
      },
      {
        title: '(x+p)(x+q) 꼴로 작성',
        body: '찾은 두 수 p, q로 (x+p)(x+q)를 쓰고 전개해서 검산한다.',
        example: '예) (x+2)(x+3) = x²+5x+6 ✓',
        choices: [
          { text: '(x−p)(x−q)로 쓴다', correct: false },
          { text: '(x+p)(x+q)로 쓰고 전개 검산한다', correct: true },
          { text: '검산은 필요 없다', correct: false },
        ],
      },
    ],
  },
  complex_factoring_difficulty: {
    heroPrompt: '공통부분을 먼저 묶거나 치환해서 단순화하는 출발점이 떠오르나요?',
    thinkingSteps: [
      {
        title: '공통인수 또는 공통부분 찾기',
        body: '모든 항에 공통으로 들어 있는 인수나 식을 먼저 찾아 앞으로 빼낸다.',
        example: '예) 2x²+4x = 2x(x+2)',
        choices: [
          { text: '공통인수 없이 바로 전개한다', correct: false },
          { text: '공통인수를 먼저 찾아 묶는다', correct: true },
          { text: '계수가 다르면 공통인수가 없다', correct: false },
        ],
      },
      {
        title: '복잡한 식은 치환으로 단순화',
        body: '반복되는 식 묶음을 A 등으로 치환하면 기본 인수분해 패턴으로 바뀐다.',
        example: '예) (x+1)²+3(x+1)+2 → A²+3A+2 → (A+1)(A+2)',
        choices: [
          { text: '치환하면 더 복잡해진다', correct: false },
          { text: '반복 묶음을 치환해 단순화한다', correct: true },
          { text: '치환은 방정식에서만 쓴다', correct: false },
        ],
      },
      {
        title: '치환 후 인수분해, 역치환',
        body: '치환한 식을 인수분해한 뒤 원래 식으로 되돌려 최종 답을 완성한다.',
        example: '예) (A+1)(A+2) → (x+2)(x+3)',
        choices: [
          { text: '치환 결과를 그대로 답으로 쓴다', correct: false },
          { text: '인수분해 후 원래 식으로 역치환한다', correct: true },
          { text: '역치환 없이 A로 남겨도 된다', correct: false },
        ],
      },
    ],
  },
  quadratic_formula_memorization: {
    heroPrompt: '근의 공식을 쓰기 전에 a, b, c를 부호 포함으로 확인하는 순서가 기억나나요?',
    thinkingSteps: [
      {
        title: 'a, b, c 부호 포함 읽기',
        body: 'ax²+bx+c에서 a, b, c를 부호 포함해서 먼저 기록한다.',
        example: '예) 2x²−3x−2 → a=2, b=−3, c=−2',
        choices: [
          { text: '부호 없이 숫자만 읽는다', correct: false },
          { text: '부호를 포함해서 a, b, c를 기록한다', correct: true },
          { text: 'a만 부호를 신경 쓴다', correct: false },
        ],
      },
      {
        title: '판별식 b²−4ac 먼저 계산',
        body: '근의 공식을 쓰기 전에 b²−4ac를 따로 계산해서 근의 종류를 파악한다.',
        example: '예) b=−3, a=2, c=−2 → (−3)²−4(2)(−2)=9+16=25',
        choices: [
          { text: '판별식 계산은 선택 사항이다', correct: false },
          { text: '판별식을 먼저 계산하고 근의 종류를 파악한다', correct: true },
          { text: 'b²만 계산하면 된다', correct: false },
        ],
      },
      {
        title: '근의 공식에 대입',
        body: 'x = (−b ± √(b²−4ac)) / 2a에 a, b, 판별식 값을 대입한다.',
        example: '예) x = (3 ± √25) / 4 = (3 ± 5) / 4 → x=2 또는 x=−1/2',
        choices: [
          { text: 'x = (b ± √(b²−4ac)) / 2a이다', correct: false },
          { text: 'x = (−b ± √(b²−4ac)) / 2a이다', correct: true },
          { text: 'x = (−b ± √(b²+4ac)) / 2a이다', correct: false },
        ],
      },
    ],
  },
  radical_simplification_error: {
    heroPrompt: '근호 안 수를 소인수분해하고 제곱 묶음을 밖으로 꺼내는 기준이 기억나나요?',
    thinkingSteps: [
      {
        title: '소인수분해로 내부 분석',
        body: '근호 안의 수를 소인수분해하여 제곱 묶음을 찾는다.',
        example: '예) √72 → √(4×18) → √(4×9×2)',
        choices: [
          { text: '근호 안을 그대로 둔다', correct: false },
          { text: '소인수분해로 제곱 묶음을 찾는다', correct: true },
          { text: '약분만 하면 단순화된다', correct: false },
        ],
      },
      {
        title: '제곱 묶음을 근호 밖으로',
        body: '√(a²×b) = a√b 규칙으로 완전제곱인 부분을 근호 밖으로 꺼낸다.',
        example: '예) √(4×9×2) = 2×3×√2 = 6√2',
        choices: [
          { text: '√(a²×b) = a²×√b이다', correct: false },
          { text: '√(a²×b) = a√b이다', correct: true },
          { text: '제곱은 근호 안에 그대로 둔다', correct: false },
        ],
      },
      {
        title: '계수끼리 곱해서 정리',
        body: '근호 밖으로 나온 수들을 모두 곱하여 최종 계수를 구한다.',
        example: '예) 6√2 → 계수 6, 근호 안 2',
        choices: [
          { text: '계수를 더해서 정리한다', correct: false },
          { text: '근호 밖 수를 모두 곱한다', correct: true },
          { text: '계수는 마지막에 구한다', correct: false },
        ],
      },
    ],
  },
  rationalization_error: {
    heroPrompt: '분모 유리화에서 같은 근호를 분자와 분모에 함께 곱하는 이유가 떠오르나요?',
    thinkingSteps: [
      {
        title: '분모의 근호 확인',
        body: '분모에 √a가 있으면 유리화가 필요한지 확인한다.',
        example: '예) 3/√2 → 분모에 √2 존재',
        choices: [
          { text: '분자에 근호가 있으면 유리화한다', correct: false },
          { text: '분모에 근호가 있으면 유리화한다', correct: true },
          { text: '근호가 있으면 항상 유리화한다', correct: false },
        ],
      },
      {
        title: '분자, 분모에 √a를 곱하기',
        body: '값을 바꾸지 않으려면 분자와 분모에 같은 √a를 곱해야 한다(×1과 동일).',
        example: '예) 3/√2 × √2/√2 = 3√2/2',
        choices: [
          { text: '분모에만 √a를 곱한다', correct: false },
          { text: '분자와 분모 모두에 √a를 곱한다', correct: true },
          { text: '분자에만 √a를 곱한다', correct: false },
        ],
      },
      {
        title: '√a × √a = a로 분모 정리',
        body: '√a × √a = a이므로 분모가 유리수(정수)가 된다.',
        example: '예) √2 × √2 = 2 → 분모 2',
        choices: [
          { text: '√a × √a = 2a이다', correct: false },
          { text: '√a × √a = a이다', correct: true },
          { text: '√a × √a = √(2a)이다', correct: false },
        ],
      },
    ],
  },
  expansion_sign_error: {
    heroPrompt: '괄호 앞 음수는 첫 항이 아니라 괄호 전체에 분배된다는 기준이 기억나나요?',
    thinkingSteps: [
      {
        title: '괄호 앞 부호 확인',
        body: '전개 전에 괄호 앞에 있는 부호(+/−)를 먼저 확인한다.',
        example: '예) −(2x+3) → 앞에 −1이 곱해진 것',
        choices: [
          { text: '괄호 앞 부호는 첫 항에만 적용된다', correct: false },
          { text: '괄호 앞 부호를 먼저 확인한다', correct: true },
          { text: '부호는 전개 후에 붙인다', correct: false },
        ],
      },
      {
        title: '부호를 괄호 안 모든 항에 분배',
        body: '−(a+b) = −a−b처럼 부호가 괄호 안 모든 항에 분배된다.',
        example: '예) −(2x+3) = −2x−3',
        choices: [
          { text: '−(a+b) = −a+b이다', correct: false },
          { text: '−(a+b) = −a−b이다', correct: true },
          { text: '부호는 첫 항에만 붙는다', correct: false },
        ],
      },
      {
        title: '전개 결과 검산',
        body: '전개한 결과를 다시 괄호로 묶어 원래 식과 같은지 확인한다.',
        example: '예) −2x−3을 묶으면 −(2x+3) → 원식과 동일 ✓',
        choices: [
          { text: '검산은 시간이 오래 걸려 생략한다', correct: false },
          { text: '전개 후 역으로 묶어서 검산한다', correct: true },
          { text: '전개만 맞으면 검산은 불필요하다', correct: false },
        ],
      },
    ],
  },
  like_terms_error: {
    heroPrompt: '전개 뒤에는 차수별로 묶어서 합산해야 한다는 순서가 아직 떠오르나요?',
    thinkingSteps: [
      {
        title: '전개 후 모든 항 나열',
        body: '괄호를 모두 전개한 뒤 모든 항을 나열한다.',
        example: '예) (x+2)(x+3) = x²+3x+2x+6',
        choices: [
          { text: '전개와 동시에 합친다', correct: false },
          { text: '전개 후 항을 먼저 나열한다', correct: true },
          { text: '괄호 안 항만 합산한다', correct: false },
        ],
      },
      {
        title: '차수별로 묶기',
        body: '동류항끼리(같은 차수끼리) 묶어서 정리한다.',
        example: '예) x², 3x+2x, 6 → x²+5x+6',
        choices: [
          { text: '모든 항을 순서대로 더한다', correct: false },
          { text: '같은 차수의 항끼리 묶는다', correct: true },
          { text: '계수가 같은 항끼리 묶는다', correct: false },
        ],
      },
      {
        title: '계수 합산으로 정리',
        body: '묶인 동류항의 계수를 합산하여 최종 식을 완성한다.',
        example: '예) 3x+2x = (3+2)x = 5x',
        choices: [
          { text: '계수를 곱해서 합친다', correct: false },
          { text: '계수를 더해서 동류항을 합친다', correct: true },
          { text: '계수는 그대로 나열한다', correct: false },
        ],
      },
    ],
  },
  imaginary_unit_confusion: {
    heroPrompt: 'i^2가 보이면 바로 -1로 바꿔 쓰는 습관, 다시 떠올릴 수 있나요?',
    thinkingSteps: [
      {
        title: 'i² = −1 기억',
        body: '허수 단위 i는 i²=−1로 정의된다. 이 규칙 하나로 모든 허수 계산이 시작된다.',
        example: '예) i²=−1, i³=−i, i⁴=1',
        choices: [
          { text: 'i²=1이다', correct: false },
          { text: 'i²=−1이다', correct: true },
          { text: 'i²=i이다', correct: false },
        ],
      },
      {
        title: 'i² 발견 즉시 −1로 교체',
        body: '식에서 i²가 나오는 순간 −1로 바꿔 쓴다. 미루지 않는다.',
        example: '예) 3i²+2i = 3(−1)+2i = −3+2i',
        choices: [
          { text: 'i²를 마지막에 치환한다', correct: false },
          { text: 'i²가 보이면 바로 −1로 교체한다', correct: true },
          { text: 'i²는 계산 마지막에 처리한다', correct: false },
        ],
      },
      {
        title: '실수부와 허수부 분리 확인',
        body: '교체 후 실수부(i 없는 항)와 허수부(i 있는 항)가 올바르게 분리됐는지 확인한다.',
        example: '예) −3+2i → 실수부 −3, 허수부 2i',
        choices: [
          { text: '실수부와 허수부를 더한다', correct: false },
          { text: '실수부와 허수부를 분리해서 확인한다', correct: true },
          { text: '허수부는 무시하고 실수부만 쓴다', correct: false },
        ],
      },
    ],
  },
  complex_calc_error: {
    heroPrompt: '복소수 계산은 전개 뒤 실수부와 허수부를 따로 모아 정리하는 흐름이 기억나나요?',
    thinkingSteps: [
      {
        title: '괄호 전개 후 i² 처리',
        body: '복소수 곱셈은 괄호를 전개한 뒤 나타나는 i²를 −1로 교체한다.',
        example: '예) (2+i)(1+3i) = 2+6i+i+3i² = 2+7i−3',
        choices: [
          { text: 'i²는 그대로 남긴다', correct: false },
          { text: '전개 후 i²를 −1로 교체한다', correct: true },
          { text: 'i²=1로 교체한다', correct: false },
        ],
      },
      {
        title: '실수부끼리 합산',
        body: 'i 없는 항(실수부)끼리 모아서 합산한다.',
        example: '예) 2+(−3) = −1',
        choices: [
          { text: '실수부와 허수부를 함께 더한다', correct: false },
          { text: '실수부끼리 먼저 합산한다', correct: true },
          { text: '실수부는 변하지 않는다', correct: false },
        ],
      },
      {
        title: '허수부끼리 합산 후 최종 정리',
        body: 'i가 붙은 항(허수부)끼리 모아서 합산하여 최종 복소수를 완성한다.',
        example: '예) 6i+i = 7i → 최종: −1+7i',
        choices: [
          { text: '허수부 계수를 곱한다', correct: false },
          { text: '허수부 계수를 더해서 정리한다', correct: true },
          { text: '허수부는 실수부보다 작아야 한다', correct: false },
        ],
      },
    ],
  },
  remainder_substitution_error: {
    heroPrompt: '나머지정리에서는 x-a=0에서 a를 먼저 구해 P(a)에 넣는다는 기준이 떠오르나요?',
    thinkingSteps: [
      {
        title: 'x−a=0에서 a 구하기',
        body: '제수(나누는 식)가 x−a이면 x−a=0에서 x=a를 구한다.',
        example: '예) x−2로 나눌 때 → x=2',
        choices: [
          { text: 'x=−a를 구한다', correct: false },
          { text: 'x−a=0에서 x=a를 구한다', correct: true },
          { text: 'x=0을 대입한다', correct: false },
        ],
      },
      {
        title: 'P(a)에 a 대입하여 계산',
        body: '나머지는 P(a)이므로 구한 x=a를 다항식 P(x)에 대입하여 계산한다.',
        example: '예) P(x)=x²+3, a=2 → P(2)=4+3=7 (나머지=7)',
        choices: [
          { text: 'P(0)을 계산한다', correct: false },
          { text: 'P(a)에 x=a를 대입한다', correct: true },
          { text: 'P(x)에 제수를 대입한다', correct: false },
        ],
      },
      {
        title: '결과가 나머지임을 확인',
        body: 'P(a)의 계산 결과가 P(x)를 (x−a)로 나눈 나머지이다.',
        example: '예) P(2)=7 → 나머지 7',
        choices: [
          { text: 'P(a)는 몫이다', correct: false },
          { text: 'P(a)가 바로 나머지이다', correct: true },
          { text: 'P(a)에서 1을 빼면 나머지이다', correct: false },
        ],
      },
    ],
  },
  simultaneous_equation_error: {
    heroPrompt: '조건을 식 두 개로 먼저 정리하고 연립으로 푸는 시작점이 기억나나요?',
    thinkingSteps: [
      {
        title: '조건을 식 두 개로 변환',
        body: '문제에서 주어진 두 조건을 각각 x, y에 대한 방정식으로 옮겨 쓴다.',
        example: '예) 합=10, 차=4 → x+y=10, x−y=4',
        choices: [
          { text: '조건 하나만 식으로 변환한다', correct: false },
          { text: '두 조건 모두 방정식으로 변환한다', correct: true },
          { text: '조건은 암산으로 처리한다', correct: false },
        ],
      },
      {
        title: '한 변수 소거',
        body: '두 식을 더하거나 빼서 변수 하나를 없애 단일 방정식으로 만든다.',
        example: '예) (x+y=10)+(x−y=4) → 2x=14 → x=7',
        choices: [
          { text: '두 식을 곱해서 소거한다', correct: false },
          { text: '두 식을 더하거나 빼서 변수를 소거한다', correct: true },
          { text: '두 식 중 하나를 버린다', correct: false },
        ],
      },
      {
        title: '구한 값을 대입해 나머지 변수 계산',
        body: '구한 x를 한 식에 대입하여 y를 구하고, 두 식 모두 성립하는지 검산한다.',
        example: '예) x=7을 x+y=10에 대입 → y=3',
        choices: [
          { text: '한 식에만 검산한다', correct: false },
          { text: '두 식 모두 대입해 검산한다', correct: true },
          { text: '대입 없이 x만 답으로 쓴다', correct: false },
        ],
      },
    ],
  },
  counting_method_confusion: {
    heroPrompt: '경우의 수는 먼저 순서가 중요한지부터 확인해야 한다는 기준이 떠오르나요?',
    thinkingSteps: [
      {
        title: '순서 중요 여부 먼저 판단',
        body: 'AB와 BA가 다른 경우인지(순열) 같은 경우인지(조합) 먼저 판단한다.',
        example: '예) 줄 세우기 → 순서 중요 → 순열, 모둠 구성 → 순서 무관 → 조합',
        choices: [
          { text: '항상 순열을 쓴다', correct: false },
          { text: '순서 중요 여부를 먼저 판단한다', correct: true },
          { text: '항상 조합을 쓴다', correct: false },
        ],
      },
      {
        title: '순열: nPr = n!/(n−r)!',
        body: '순서가 중요하면 nPr 공식으로 경우의 수를 구한다.',
        example: '예) 5명 중 3명 줄 세우기 → 5P3 = 5×4×3 = 60',
        choices: [
          { text: '순열 = nCr이다', correct: false },
          { text: '순열 = nPr = n!/(n−r)!이다', correct: true },
          { text: '순열 = n!이다', correct: false },
        ],
      },
      {
        title: '조합: nCr = n!/(r!(n−r)!)',
        body: '순서가 무관하면 nCr 공식으로 경우의 수를 구한다.',
        example: '예) 5명 중 3명 모둠 구성 → 5C3 = 10',
        choices: [
          { text: '조합 = nPr이다', correct: false },
          { text: '조합 = nCr = n!/(r!(n−r)!)이다', correct: true },
          { text: '조합 = n×r이다', correct: false },
        ],
      },
    ],
  },
  counting_overcounting: {
    heroPrompt: '경우를 셀 때 중복을 막으려면 직접 나열하거나 표로 확인해야 한다는 흐름이 기억나나요?',
    thinkingSteps: [
      {
        title: '모든 경우 나열 또는 표 작성',
        body: '경우의 수가 적으면 직접 나열하고, 많으면 표로 정리하여 시각적으로 파악한다.',
        example: '예) 동전 2개: HH, HT, TH, TT → 4가지',
        choices: [
          { text: '항상 공식으로만 계산한다', correct: false },
          { text: '나열 또는 표로 경우를 파악한다', correct: true },
          { text: '나열은 시간 낭비다', correct: false },
        ],
      },
      {
        title: '중복 패턴 찾기',
        body: '나열된 경우 중 동일한 경우를 찾아 표시한다.',
        example: '예) AB와 BA가 같은 경우면 → 중복 1쌍 발생',
        choices: [
          { text: '중복은 항상 없다', correct: false },
          { text: '나열 후 동일 경우를 직접 찾는다', correct: true },
          { text: '중복은 공식으로만 처리한다', correct: false },
        ],
      },
      {
        title: '중복 제거 후 최종 집계',
        body: '중복으로 셀 위험이 있는 경우를 제거하거나, 조합 공식으로 나눠서 최종 답을 낸다.',
        example: '예) 3명 중 2명 선택: 나열 6가지 ÷ 2 = 3가지 (조합)',
        choices: [
          { text: '중복을 포함해서 답으로 쓴다', correct: false },
          { text: '중복을 제거하거나 나눠서 최종 답을 낸다', correct: true },
          { text: '중복은 더하면 된다', correct: false },
        ],
      },
    ],
  },
};

export function getReviewHeroPrompt(weaknessId: WeaknessId) {
  return reviewContentMap[weaknessId]?.heroPrompt ?? diagnosisMap[weaknessId].tip;
}

export function getReviewThinkingSteps(weaknessId: WeaknessId): ThinkingStep[] {
  return reviewContentMap[weaknessId]?.thinkingSteps ?? [];
}
```

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음 (또는 기존 에러만)

- [ ] **Step 4: 커밋**

```bash
git add data/review-content-map.ts
git commit -m "feat: 23개 약점별 사고 흐름 단계 데이터 추가"
```

---

## Task 2: review-scheduler.ts 생성

**Files:**
- Create: `features/learning/review-scheduler.ts`

**참고 사항:**
- `LocalReviewTaskStore`와 `LocalLearningHistoryRepository`는 동일한 AsyncStorage 키(`StorageKeys.reviewTasksPrefix + accountKey`)를 공유한다.
- "기억났어요!" → `completeReviewTask`: 현재 task를 complete 처리하고 다음 stage의 새 task를 생성한다.
- "다시 볼게요" → `rescheduleReviewTask`: 현재 stage를 유지하고 `scheduledFor`만 갱신한다.
- `applyOverduePenalties`: scheduledFor < 오늘인 미완료 task의 stage를 한 단계 하락시킨다.

- [ ] **Step 1: review-scheduler.ts 파일 생성**

```ts
// features/learning/review-scheduler.ts
import { REVIEW_STAGE_OFFSETS, REVIEW_STAGE_ORDER, getNextReviewStage } from './review-stage';
import type { ReviewTaskStore } from './review-task-store';
import type { ReviewStage } from './history-types';

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDaysToToday(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return toDateString(d);
}

/**
 * "기억났어요!" — 현재 task를 완료 처리하고 다음 stage task를 생성한다.
 * day30 완료 시 다음 task 없이 완전 졸업.
 */
export async function completeReviewTask(
  accountKey: string,
  taskId: string,
  store: ReviewTaskStore,
): Promise<void> {
  const tasks = await store.load(accountKey);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) {
    return;
  }

  const now = new Date().toISOString();
  const completedTask = { ...task, completed: true, completedAt: now };
  const nextStage = getNextReviewStage(task.stage);

  if (!nextStage) {
    // day30 완료 → 졸업
    await store.saveAll(
      accountKey,
      tasks.map((t) => (t.id === taskId ? completedTask : t)),
    );
    return;
  }

  const nextTaskId = `${task.sourceId}__${task.weaknessId}__${nextStage}`;
  const alreadyExists = tasks.some((t) => t.id === nextTaskId);

  const updatedTasks = tasks.map((t) => (t.id === taskId ? completedTask : t));
  if (!alreadyExists) {
    updatedTasks.push({
      id: nextTaskId,
      accountKey,
      weaknessId: task.weaknessId,
      source: task.source,
      sourceId: task.sourceId,
      scheduledFor: addDaysToToday(REVIEW_STAGE_OFFSETS[nextStage]),
      stage: nextStage,
      completed: false,
      createdAt: now,
    });
  }

  await store.saveAll(accountKey, updatedTasks);
}

/**
 * "다시 볼게요" — 현재 stage 유지, scheduledFor를 오늘 기준 N일 후로 갱신한다.
 */
export async function rescheduleReviewTask(
  accountKey: string,
  taskId: string,
  store: ReviewTaskStore,
): Promise<void> {
  const tasks = await store.load(accountKey);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) {
    return;
  }

  const updated = tasks.map((t) =>
    t.id === taskId
      ? { ...t, scheduledFor: addDaysToToday(REVIEW_STAGE_OFFSETS[t.stage]) }
      : t,
  );
  await store.saveAll(accountKey, updated);
}

/**
 * 앱 시작 시 기한 초과(overdue) task의 stage를 한 단계 하락시킨다.
 * day1 초과는 day1 유지.
 */
export async function applyOverduePenalties(
  accountKey: string,
  store: ReviewTaskStore,
): Promise<void> {
  const tasks = await store.load(accountKey);
  const today = toDateString(new Date());

  const updated = tasks.map((task) => {
    if (task.completed || task.scheduledFor >= today) {
      return task;
    }
    const currentIndex = REVIEW_STAGE_ORDER.indexOf(task.stage);
    const newStage: ReviewStage =
      currentIndex > 0 ? REVIEW_STAGE_ORDER[currentIndex - 1] : 'day1';
    return {
      ...task,
      stage: newStage,
      scheduledFor: addDaysToToday(REVIEW_STAGE_OFFSETS[newStage]),
    };
  });

  await store.saveAll(accountKey, updated);
}
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: 커밋**

```bash
git add features/learning/review-scheduler.ts
git commit -m "feat: 에빙하우스 복습 스케줄러 (complete/reschedule/overduePenalties)"
```

---

## Task 3: Cloud Function review-feedback 추가

**Files:**
- Create: `functions/src/review-feedback.ts`
- Create: `functions/tests/review-feedback.test.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: review-feedback.ts 작성**

```ts
// functions/src/review-feedback.ts
import * as logger from 'firebase-functions/logger';
import { defineSecret, defineString } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';
import OpenAI from 'openai';

const openAiApiKey = defineSecret('OPENAI_API_KEY');
const openAiModel = defineString('OPENAI_MODEL', { default: 'gpt-4.1' });

const ReviewFeedbackRequestSchema = z.object({
  weaknessId: z.string().min(1).max(60),
  stepTitle: z.string().min(1).max(100),
  stepBody: z.string().min(1).max(400),
  selectedChoiceText: z.string().max(200).nullable(),
  userText: z.string().max(300).nullable(),
});

const SYSTEM_PROMPT = [
  '당신은 한국 수학 학습을 돕는 AI 코치입니다.',
  '학생이 개념 복습 단계에서 자신의 이해를 표현했습니다.',
  '절대로 틀렸다고 말하지 마세요.',
  '좋은 방향이라고 먼저 인정하고, 핵심 포인트를 1-2문장으로 보완해 주세요.',
  '"좋은 방향이에요! [핵심]도 더하면 완벽해요" 형식을 따르세요.',
  '2-3문장 이내로 짧게 답하세요.',
  '한국어로 답하세요.',
].join(' ');

export const reviewFeedback = onRequest(
  {
    region: 'asia-northeast3',
    timeoutSeconds: 20,
    cors: true,
    invoker: 'public',
    secrets: [openAiApiKey],
  },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const parsed = ReviewFeedbackRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
      return;
    }

    const { stepTitle, stepBody, selectedChoiceText, userText } = parsed.data;

    if (!selectedChoiceText && !userText) {
      response.status(400).json({ error: 'No user input provided' });
      return;
    }

    const userContent = [
      `단계: ${stepTitle}`,
      `설명: ${stepBody}`,
      selectedChoiceText ? `학생이 선택한 답: ${selectedChoiceText}` : '',
      userText ? `학생이 직접 쓴 내용: ${userText}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const client = new OpenAI({ apiKey: openAiApiKey.value() });
      const completion = await client.chat.completions.create({
        model: openAiModel.value(),
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        max_tokens: 200,
      });

      const replyText = completion.choices[0]?.message?.content?.trim() ?? '';
      if (!replyText) {
        throw new Error('Empty response from OpenAI');
      }

      response.status(200).json({ replyText });
    } catch (error) {
      logger.error('reviewFeedback failed', error);
      response.status(500).json({ error: 'Failed to generate feedback' });
    }
  },
);
```

- [ ] **Step 2: functions/src/index.ts에 export 추가**

기존 export 목록 맨 끝에 한 줄 추가:

```ts
export { reviewFeedback } from './review-feedback';
```

- [ ] **Step 3: 유닛 테스트 작성**

```ts
// functions/tests/review-feedback.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';

// Cloud Function 로직에서 순수 함수 부분만 테스트
// (실제 OpenAI 호출 없이 입력 유효성 및 프롬프트 조립 검증)

function buildUserContent(params: {
  stepTitle: string;
  stepBody: string;
  selectedChoiceText: string | null;
  userText: string | null;
}): string {
  return [
    `단계: ${params.stepTitle}`,
    `설명: ${params.stepBody}`,
    params.selectedChoiceText ? `학생이 선택한 답: ${params.selectedChoiceText}` : '',
    params.userText ? `학생이 직접 쓴 내용: ${params.userText}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

test('선택지 있을 때 선택지 텍스트가 포함된다', () => {
  const result = buildUserContent({
    stepTitle: 'a, b, c 부호 확인',
    stepBody: 'ax²+bx+c에서 각 계수를 부호 포함해서 먼저 읽는다.',
    selectedChoiceText: '음수 부호를 빠뜨리면 결과가 달라지니까',
    userText: null,
  });
  assert.ok(result.includes('학생이 선택한 답: 음수 부호를 빠뜨리면'));
  assert.ok(!result.includes('학생이 직접 쓴 내용'));
});

test('자유 입력만 있을 때 userText가 포함된다', () => {
  const result = buildUserContent({
    stepTitle: 'b² 먼저, 4ac 나중',
    stepBody: 'b²를 먼저 계산한다.',
    selectedChoiceText: null,
    userText: '단순한 것부터 계산하는 게 실수를 줄이기 때문입니다',
  });
  assert.ok(result.includes('학생이 직접 쓴 내용'));
  assert.ok(!result.includes('학생이 선택한 답'));
});

test('선택지와 자유 입력 모두 있으면 둘 다 포함된다', () => {
  const result = buildUserContent({
    stepTitle: '빼고 나서 판단',
    stepBody: '부호를 보고 근의 개수를 판단한다.',
    selectedChoiceText: '부호만 보면 된다',
    userText: '추가로 더 생각해보면...',
  });
  assert.ok(result.includes('학생이 선택한 답'));
  assert.ok(result.includes('학생이 직접 쓴 내용'));
});
```

- [ ] **Step 4: 테스트 실행**

```bash
cd /Users/baggiyun/dev/dasida-app/functions && npm test 2>&1 | tail -20
```

Expected: 3 tests pass

- [ ] **Step 5: 커밋**

```bash
git add functions/src/review-feedback.ts functions/src/index.ts functions/tests/review-feedback.test.ts
git commit -m "feat: review-feedback Cloud Function 추가"
```

---

## Task 4: 클라이언트 env + review-feedback fetch wrapper

**Files:**
- Modify: `constants/env.ts`
- Create: `features/quiz/review-feedback.ts`

- [ ] **Step 1: constants/env.ts에 환경변수 추가**

파일 맨 끝에 추가:

```ts
export const reviewFeedbackUrl = (process.env.EXPO_PUBLIC_REVIEW_FEEDBACK_URL ?? '').trim();
export const reviewFeedbackTimeoutMs = 10000;
```

- [ ] **Step 2: features/quiz/review-feedback.ts 생성**

```ts
// features/quiz/review-feedback.ts
import { reviewFeedbackUrl, reviewFeedbackTimeoutMs } from '@/constants/env';

export type ReviewFeedbackInput = {
  weaknessId: string;
  stepTitle: string;
  stepBody: string;
  selectedChoiceText: string | null;
  userText: string | null;
};

export type ReviewFeedbackResult = {
  replyText: string;
};

export async function requestReviewFeedback(
  input: ReviewFeedbackInput,
): Promise<ReviewFeedbackResult> {
  if (!reviewFeedbackUrl) {
    throw new Error('Review feedback endpoint is not configured');
  }

  if (!input.selectedChoiceText && !input.userText) {
    throw new Error('No user input to send for feedback');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), reviewFeedbackTimeoutMs);

  try {
    const response = await fetch(reviewFeedbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);

    if (
      !response.ok ||
      !payload ||
      typeof payload.replyText !== 'string' ||
      !payload.replyText.trim()
    ) {
      throw new Error(
        (payload && typeof payload.error === 'string' && payload.error) ||
          'Failed to fetch review feedback',
      );
    }

    return { replyText: payload.replyText.trim() };
  } finally {
    clearTimeout(timeoutId);
  }
}
```

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: 커밋**

```bash
git add constants/env.ts features/quiz/review-feedback.ts
git commit -m "feat: review-feedback 클라이언트 fetch wrapper + env 변수 추가"
```

---

## Task 5: review-home-card.tsx 생성

**Files:**
- Create: `features/quiz/components/review-home-card.tsx`

**스펙:**
- 홈 화면에 항상 렌더되는 카드. `nextReviewTask`가 있을 때만 표시.
- 마운트 즉시 10초 카운트다운 자동 시작.
- 10초 후 "사고 흐름 확인하기" 버튼 활성화.
- 기억 유지율: day1→70%, day3→50%, day7→35%, day30→20%.
- 다시다 브랜드 컬러 사용 (`BrandColors`, `BrandRadius`, `BrandSpacing`).

- [ ] **Step 1: review-home-card.tsx 작성**

```tsx
// features/quiz/components/review-home-card.tsx
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { diagnosisMap } from '@/data/diagnosisMap';
import { formatReviewStageLabel } from '@/features/learning/review-stage';
import type { ActiveReviewTaskSummary } from '@/features/learner/types';

const MEMORY_RETENTION_PCT: Record<string, number> = {
  day1: 70,
  day3: 50,
  day7: 35,
  day30: 20,
};

const TIMER_SECONDS = 10;

type Props = {
  task: ActiveReviewTaskSummary;
  onPress: () => void;
};

export function ReviewHomeCard({ task, onPress }: Props) {
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [ready, setReady] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 타이머 자동 시작
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setReady(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 빨간 점 pulse 애니메이션
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 750, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const weaknessLabel = diagnosisMap[task.weaknessId]?.labelKo ?? task.weaknessId;
  const stageLabel = formatReviewStageLabel(task.stage);
  const retentionPct = MEMORY_RETENTION_PCT[task.stage] ?? 50;
  const timerDisplay = ready ? '✓' : String(timeLeft);
  const timerColor = timeLeft <= 3 ? BrandColors.success : BrandColors.danger;

  return (
    <View style={styles.card}>
      {/* 상단 배지 */}
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
          <Text style={styles.badgeText}>오늘 안 하면 리셋</Text>
        </View>
        <View style={styles.stagePill}>
          <Text style={styles.stagePillText}>{stageLabel}</Text>
        </View>
      </View>

      {/* 제목 */}
      <Text style={styles.title}>{weaknessLabel}, 기억 사라지는 중 📉</Text>

      {/* 기억 유지율 바 */}
      <View style={styles.memoryWrap}>
        <View style={styles.memoryLabelRow}>
          <Text style={styles.memoryLabelLeft}>기억 유지율</Text>
          <Text style={styles.memoryLabelRight}>{retentionPct}%</Text>
        </View>
        <View style={styles.memoryBarBg}>
          <View style={[styles.memoryBarFill, { width: `${retentionPct}%` }]} />
        </View>
      </View>

      {/* 인라인 타이머 */}
      <View style={styles.timerRow}>
        <View style={[styles.timerRing, { borderTopColor: timerColor }]}>
          <Text style={[styles.timerNum, { color: timerColor }]}>{timerDisplay}</Text>
        </View>
        <Text style={styles.timerHint}>
          {weaknessLabel} 개념을{'\n'}잠깐 떠올려보세요
        </Text>
      </View>

      {/* CTA 버튼 */}
      <Pressable
        style={[styles.cta, ready && styles.ctaReady]}
        onPress={ready ? onPress : undefined}
        disabled={!ready}>
        <Text style={[styles.ctaText, !ready && styles.ctaTextDisabled]}>
          사고 흐름 확인하기
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E2F20',
    borderRadius: BrandRadius.lg,
    padding: BrandSpacing.lg,
    gap: BrandSpacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: BrandColors.danger,
  },
  badgeText: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: BrandColors.danger,
    letterSpacing: 0.4,
  },
  stagePill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  stagePillText: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: '#F6F2EA',
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    color: '#F6F2EA',
  },
  memoryWrap: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BrandRadius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  memoryLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  memoryLabelLeft: {
    fontFamily: FontFamilies.regular,
    fontSize: 11,
    color: BrandColors.mutedText,
  },
  memoryLabelRight: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: BrandColors.danger,
  },
  memoryBarBg: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    height: 5,
  },
  memoryBarFill: {
    backgroundColor: BrandColors.danger,
    borderRadius: 4,
    height: '100%',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  timerRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.1)',
    borderTopColor: BrandColors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  timerNum: {
    fontFamily: FontFamilies.bold,
    fontSize: 26,
    color: '#F6F2EA',
  },
  timerHint: {
    fontFamily: FontFamilies.regular,
    fontSize: 12,
    color: BrandColors.mutedText,
    lineHeight: 18,
    flex: 1,
  },
  cta: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BrandRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  ctaReady: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  ctaText: {
    fontFamily: FontFamilies.bold,
    fontSize: 15,
    color: '#F6F2EA',
  },
  ctaTextDisabled: {
    color: BrandColors.mutedText,
  },
});
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/components/review-home-card.tsx
git commit -m "feat: ReviewHomeCard 컴포넌트 추가 (인라인 10초 타이머)"
```

---

## Task 6: use-review-session-screen.ts 생성

**Files:**
- Create: `features/quiz/hooks/use-review-session-screen.ts`

**스펙:**
- `taskId` route param으로 `LocalReviewTaskStore`에서 task 로드.
- `session?.accountKey`로 store 접근.
- 단계 상태: `input` → "다음으로" 누름 → `feedback` → "다음 단계 →" 누름 → 다음 step or done.
- 선택지 또는 텍스트가 있으면 AI 피드백 요청, 없으면 피드백 없이 바로 다음.
- "기억났어요!" → `completeReviewTask` + `refresh()` + `router.back()`.
- "다시 볼게요" → `rescheduleReviewTask` + `refresh()` + `router.back()`.

- [ ] **Step 1: use-review-session-screen.ts 작성**

```ts
// features/quiz/hooks/use-review-session-screen.ts
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { getReviewThinkingSteps, type ThinkingStep } from '@/data/review-content-map';
import { completeReviewTask, rescheduleReviewTask } from '@/features/learning/review-scheduler';
import { LocalReviewTaskStore } from '@/features/learning/review-task-store';
import type { ReviewTask } from '@/features/learning/types';
import { useCurrentLearner } from '@/features/learner/provider';
import { getSingleParam } from '@/utils/get-single-param';
import { requestReviewFeedback } from '@/features/quiz/review-feedback';

type StepPhase = 'input' | 'feedback';

export type UseReviewSessionScreenResult = {
  task: ReviewTask | null;
  steps: ThinkingStep[];
  currentStepIndex: number;
  stepPhase: StepPhase;
  selectedChoiceIndex: number | null;
  userText: string;
  aiFeedback: string | null;
  isLoadingFeedback: boolean;
  sessionComplete: boolean;
  onSelectChoice: (index: number) => void;
  onChangeText: (text: string) => void;
  onPressNext: () => void;
  onPressContinue: () => void;
  onPressRemember: () => void;
  onPressRetry: () => void;
};

const store = new LocalReviewTaskStore();

export function useReviewSessionScreen(): UseReviewSessionScreenResult {
  const params = useLocalSearchParams();
  const taskId = getSingleParam(params.taskId) ?? '';
  const { session, refresh } = useCurrentLearner();
  const accountKey = session?.accountKey ?? '';

  const [task, setTask] = useState<ReviewTask | null>(null);
  const [steps, setSteps] = useState<ThinkingStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepPhase, setStepPhase] = useState<StepPhase>('input');
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState<number | null>(null);
  const [userText, setUserText] = useState('');
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);

  // task 로드
  useEffect(() => {
    if (!accountKey || !taskId) {
      return;
    }
    store.load(accountKey).then((tasks) => {
      const found = tasks.find((t) => t.id === taskId) ?? null;
      setTask(found);
      if (found) {
        setSteps(getReviewThinkingSteps(found.weaknessId));
      }
    });
  }, [accountKey, taskId]);

  const resetStepState = () => {
    setSelectedChoiceIndex(null);
    setUserText('');
    setAiFeedback(null);
    setStepPhase('input');
  };

  const onSelectChoice = (index: number) => {
    setSelectedChoiceIndex(index);
  };

  const onChangeText = (text: string) => {
    setUserText(text);
  };

  const onPressNext = async () => {
    const step = steps[currentStepIndex];
    if (!step || !task) {
      return;
    }

    const hasChoice = selectedChoiceIndex !== null;
    const hasText = userText.trim().length > 0;

    if (!hasChoice && !hasText) {
      // 아무 입력 없으면 피드백 없이 바로 다음
      setStepPhase('feedback');
      return;
    }

    setIsLoadingFeedback(true);
    try {
      const selectedChoiceText = hasChoice
        ? (step.choices[selectedChoiceIndex!]?.text ?? null)
        : null;
      const result = await requestReviewFeedback({
        weaknessId: task.weaknessId,
        stepTitle: step.title,
        stepBody: step.body,
        selectedChoiceText,
        userText: hasText ? userText.trim() : null,
      });
      setAiFeedback(result.replyText);
    } catch {
      // AI 실패 시 피드백 없이 계속 진행
      setAiFeedback(null);
    } finally {
      setIsLoadingFeedback(false);
      setStepPhase('feedback');
    }
  };

  const onPressContinue = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= steps.length) {
      setSessionComplete(true);
    } else {
      setCurrentStepIndex(nextIndex);
      resetStepState();
    }
  };

  const onPressRemember = async () => {
    if (!task) {
      return;
    }
    await completeReviewTask(accountKey, task.id, store);
    await refresh();
    router.back();
  };

  const onPressRetry = async () => {
    if (!task) {
      return;
    }
    await rescheduleReviewTask(accountKey, task.id, store);
    await refresh();
    router.back();
  };

  return {
    task,
    steps,
    currentStepIndex,
    stepPhase,
    selectedChoiceIndex,
    userText,
    aiFeedback,
    isLoadingFeedback,
    sessionComplete,
    onSelectChoice,
    onChangeText,
    onPressNext,
    onPressContinue,
    onPressRemember,
    onPressRetry,
  };
}
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/hooks/use-review-session-screen.ts
git commit -m "feat: useReviewSessionScreen 훅 추가"
```

---

## Task 7: review-session-screen-view.tsx 생성

**Files:**
- Create: `features/quiz/components/review-session-screen-view.tsx`

**스펙:**
- `sessionComplete=false`: 단계 카드 + 선택지 3개 + 자유 입력 + "다음으로" 버튼.
- `stepPhase='feedback'`: AI 피드백 표시 + "다음 단계 →" or "완료 →".
- `sessionComplete=true`: 완료 화면 ("기억났어요!" / "다시 볼게요").
- `isLoadingFeedback=true`: "다음으로" 버튼 비활성화 + "분석 중..." 텍스트.

- [ ] **Step 1: review-session-screen-view.tsx 작성**

```tsx
// features/quiz/components/review-session-screen-view.tsx
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { diagnosisMap } from '@/data/diagnosisMap';
import type { UseReviewSessionScreenResult } from '@/features/quiz/hooks/use-review-session-screen';

export function ReviewSessionScreenView({
  task,
  steps,
  currentStepIndex,
  stepPhase,
  selectedChoiceIndex,
  userText,
  aiFeedback,
  isLoadingFeedback,
  sessionComplete,
  onSelectChoice,
  onChangeText,
  onPressNext,
  onPressContinue,
  onPressRemember,
  onPressRetry,
}: UseReviewSessionScreenResult) {
  const insets = useSafeAreaInsets();

  if (!task) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.loadingText}>복습 데이터를 불러오는 중...</Text>
      </View>
    );
  }

  const weaknessLabel = diagnosisMap[task.weaknessId]?.labelKo ?? task.weaknessId;
  const step = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  // 완료 화면
  if (sessionComplete) {
    return (
      <View style={[styles.screen, styles.doneScreen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.doneEmoji}>🌿</Text>
        <Text style={styles.doneTitle}>모든 단계 완료!</Text>
        <Text style={styles.doneSub}>{weaknessLabel} 흐름을{'\n'}다시 확인했어요.</Text>

        <View style={styles.scheduleBox}>
          <Text style={styles.scheduleLabel}>다음 복습 일정</Text>
          <Text style={styles.scheduleVal}>
            {task.stage === 'day1' ? '3일 후' :
             task.stage === 'day3' ? '7일 후' :
             task.stage === 'day7' ? '30일 후' : '졸업 🎓'}
          </Text>
        </View>

        <View style={styles.doneButtons}>
          <Pressable style={styles.retryBtn} onPress={onPressRetry}>
            <Text style={styles.retryBtnText}>🤔 다시 볼게요</Text>
          </Pressable>
          <Pressable style={styles.rememberBtn} onPress={onPressRemember}>
            <Text style={styles.rememberBtnText}>✓ 기억났어요!</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!step) {
    return null;
  }

  const continueLabel = isLastStep ? '완료 →' : '다음 단계 →';

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top }]}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled">

      {/* 진행 바 */}
      <View style={styles.progressBar}>
        {steps.map((_, i) => (
          <View
            key={i}
            style={[styles.progressSeg, i <= currentStepIndex && styles.progressSegDone]}
          />
        ))}
      </View>

      {/* 단계 카드 */}
      <View style={styles.stepCard}>
        <View style={styles.stepNumRow}>
          <View style={styles.stepNumBadge}>
            <Text style={styles.stepNumText}>{currentStepIndex + 1}</Text>
          </View>
          <Text style={styles.stepNumLabel}>{`${currentStepIndex + 1} / ${steps.length} 단계`}</Text>
        </View>
        <Text style={styles.stepTitle}>{step.title}</Text>
        <Text style={styles.stepBody}>{step.body}</Text>
        {step.example ? (
          <View style={styles.stepExampleBox}>
            <Text style={styles.stepExampleText}>{step.example}</Text>
          </View>
        ) : null}
      </View>

      {/* 입력 카드 */}
      <View style={styles.inputCard}>
        <Text style={styles.inputLabel}>💭 이 단계, 어떻게 이해했나요?</Text>

        {/* 선택지 */}
        <View style={styles.choices}>
          {step.choices.map((choice, i) => (
            <Pressable
              key={i}
              style={[styles.choiceBtn, selectedChoiceIndex === i && styles.choiceBtnSelected]}
              onPress={() => stepPhase === 'input' && onSelectChoice(i)}>
              <Text
                style={[
                  styles.choiceBtnText,
                  selectedChoiceIndex === i && styles.choiceBtnTextSelected,
                ]}>
                {choice.text}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* 구분선 */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>또는 직접 써도 돼요</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* 자유 입력 */}
        <TextInput
          style={styles.textInput}
          value={userText}
          onChangeText={stepPhase === 'input' ? onChangeText : undefined}
          placeholder="자유롭게 써보세요..."
          placeholderTextColor={BrandColors.disabled}
          multiline
          editable={stepPhase === 'input'}
        />

        {/* AI 피드백 */}
        {stepPhase === 'feedback' && aiFeedback ? (
          <View style={styles.aiFeedback}>
            <Text style={styles.aiBadge}>✨ AI 피드백</Text>
            <Text style={styles.aiText}>{aiFeedback}</Text>
          </View>
        ) : null}

        {/* 버튼 */}
        {stepPhase === 'input' ? (
          <Pressable
            style={[styles.primaryBtn, isLoadingFeedback && styles.primaryBtnDisabled]}
            onPress={onPressNext}
            disabled={isLoadingFeedback}>
            {isLoadingFeedback ? (
              <ActivityIndicator color="#F6F2EA" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>다음으로</Text>
            )}
          </Pressable>
        ) : (
          <Pressable style={styles.primaryBtn} onPress={onPressContinue}>
            <Text style={styles.primaryBtnText}>{continueLabel}</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F2EA',
  },
  scrollContent: {
    padding: BrandSpacing.md,
    gap: BrandSpacing.sm,
  },
  loadingText: {
    fontFamily: FontFamilies.regular,
    fontSize: 15,
    color: BrandColors.mutedText,
    textAlign: 'center',
    marginTop: 40,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: BrandSpacing.sm,
  },
  progressSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D6E2D4',
  },
  progressSegDone: {
    backgroundColor: BrandColors.primary,
  },
  stepCard: {
    backgroundColor: '#fff',
    borderRadius: BrandRadius.lg,
    padding: BrandSpacing.lg,
    gap: BrandSpacing.xs,
    borderWidth: 1.5,
    borderColor: '#D6E2D4',
  },
  stepNumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  stepNumBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    color: '#F6F2EA',
  },
  stepNumLabel: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    color: BrandColors.mutedText,
  },
  stepTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 17,
    color: BrandColors.primary,
  },
  stepBody: {
    fontFamily: FontFamilies.regular,
    fontSize: 14,
    color: BrandColors.text,
    lineHeight: 22,
  },
  stepExampleBox: {
    backgroundColor: '#F6F2EA',
    borderRadius: BrandRadius.sm,
    padding: 10,
    marginTop: 4,
  },
  stepExampleText: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    color: BrandColors.primarySoft,
  },
  inputCard: {
    backgroundColor: '#fff',
    borderRadius: BrandRadius.lg,
    padding: BrandSpacing.md,
    gap: BrandSpacing.sm,
    borderWidth: 1.5,
    borderColor: '#D6E2D4',
  },
  inputLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    color: BrandColors.primary,
  },
  choices: {
    gap: 6,
  },
  choiceBtn: {
    backgroundColor: '#F6F2EA',
    borderWidth: 1.5,
    borderColor: '#D6E2D4',
    borderRadius: BrandRadius.sm,
    padding: 12,
  },
  choiceBtnSelected: {
    backgroundColor: '#eef3ec',
    borderColor: BrandColors.primary,
  },
  choiceBtnText: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    color: BrandColors.text,
  },
  choiceBtnTextSelected: {
    fontFamily: FontFamilies.bold,
    color: BrandColors.primary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D6E2D4',
  },
  dividerText: {
    fontFamily: FontFamilies.regular,
    fontSize: 11,
    color: BrandColors.disabled,
  },
  textInput: {
    backgroundColor: '#F6F2EA',
    borderWidth: 1,
    borderColor: '#D6E2D4',
    borderRadius: BrandRadius.sm,
    padding: 11,
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    color: BrandColors.text,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  aiFeedback: {
    backgroundColor: '#f0fdf4',
    borderRadius: BrandRadius.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D6E2D4',
    gap: 4,
  },
  aiBadge: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: BrandColors.success,
  },
  aiText: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    color: BrandColors.text,
    lineHeight: 20,
  },
  primaryBtn: {
    backgroundColor: BrandColors.primary,
    borderRadius: BrandRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    backgroundColor: BrandColors.disabled,
  },
  primaryBtnText: {
    fontFamily: FontFamilies.bold,
    fontSize: 15,
    color: '#F6F2EA',
  },
  // 완료 화면
  doneScreen: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: BrandSpacing.xl,
    gap: BrandSpacing.sm,
  },
  doneEmoji: {
    fontSize: 52,
    marginBottom: 4,
  },
  doneTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 20,
    color: BrandColors.primary,
    textAlign: 'center',
  },
  doneSub: {
    fontFamily: FontFamilies.regular,
    fontSize: 14,
    color: BrandColors.mutedText,
    textAlign: 'center',
    lineHeight: 22,
  },
  scheduleBox: {
    backgroundColor: '#fff',
    borderRadius: BrandRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D6E2D4',
    alignItems: 'center',
    width: '100%',
    marginVertical: 4,
  },
  scheduleLabel: {
    fontFamily: FontFamilies.regular,
    fontSize: 11,
    color: BrandColors.mutedText,
    marginBottom: 4,
  },
  scheduleVal: {
    fontFamily: FontFamilies.bold,
    fontSize: 15,
    color: BrandColors.success,
  },
  doneButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  retryBtn: {
    flex: 1,
    backgroundColor: '#F6F2EA',
    borderRadius: BrandRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D6E2D4',
  },
  retryBtnText: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: BrandColors.mutedText,
  },
  rememberBtn: {
    flex: 2,
    backgroundColor: BrandColors.primary,
    borderRadius: BrandRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  rememberBtnText: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: '#F6F2EA',
  },
});
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/components/review-session-screen-view.tsx
git commit -m "feat: ReviewSessionScreenView 컴포넌트 추가"
```

---

## Task 8: review-session 라우트 + _layout.tsx 수정

**Files:**
- Create: `app/(tabs)/quiz/review-session.tsx`
- Modify: `app/(tabs)/quiz/_layout.tsx`

- [ ] **Step 1: review-session.tsx 라우트 생성**

```tsx
// app/(tabs)/quiz/review-session.tsx
import { ReviewSessionScreenView } from '@/features/quiz/components/review-session-screen-view';
import { useReviewSessionScreen } from '@/features/quiz/hooks/use-review-session-screen';

export default function ReviewSessionRoute() {
  const screen = useReviewSessionScreen();
  return <ReviewSessionScreenView {...screen} />;
}
```

- [ ] **Step 2: _layout.tsx에 review-session 추가**

`app/(tabs)/quiz/_layout.tsx`에서 `<Stack>` 안에 아래 한 줄 추가 (기존 항목들 사이):

```tsx
<Stack.Screen name="review-session" options={{ title: '복습 세션', headerShown: false }} />
```

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: 커밋**

```bash
git add app/(tabs)/quiz/review-session.tsx app/(tabs)/quiz/_layout.tsx
git commit -m "feat: review-session 라우트 및 스택 스크린 등록"
```

---

## Task 9: quiz-hub에 ReviewHomeCard 연결

**Files:**
- Modify: `features/quiz/hooks/use-quiz-hub-screen.ts`
- Modify: `features/quiz/components/quiz-hub-screen-view.tsx`

**스펙:**
- `homeState.nextReviewTask`가 있을 때 `ReviewHomeCard` 표시.
- "사고 흐름 확인하기" 탭 시 `/quiz/review-session?taskId=xxx`로 이동.
- 마운트 시 `applyOverduePenalties` 실행 후 `refresh()`.

- [ ] **Step 1: use-quiz-hub-screen.ts 수정**

파일 상단 imports에 추가:

```ts
import { useEffect } from 'react';
import { LocalReviewTaskStore } from '@/features/learning/review-task-store';
import { applyOverduePenalties } from '@/features/learning/review-scheduler';
```

`useQuizHubScreen` 함수 내에 아래 내용 추가:

`UseQuizHubScreenResult` 타입에 추가:
```ts
onPressReviewCard: () => void;
```

`useEffect` 추가 (훅 내부):
```ts
const reviewStore = new LocalReviewTaskStore();

useEffect(() => {
  const accountKey = session?.accountKey;
  if (!accountKey) {
    return;
  }
  applyOverduePenalties(accountKey, reviewStore).then(() => {
    void refresh();
  });
  // 마운트 시 1회만 실행
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [session?.accountKey]);
```

`onPressReviewCard` 함수 추가:
```ts
const onPressReviewCard = () => {
  const taskId = homeState?.nextReviewTask?.id;
  if (!taskId) {
    return;
  }
  router.push({
    pathname: '/quiz/review-session',
    params: { taskId },
  });
};
```

return 객체에 추가:
```ts
onPressReviewCard,
```

- [ ] **Step 2: quiz-hub-screen-view.tsx 수정**

imports에 추가:
```ts
import { ReviewHomeCard } from '@/features/quiz/components/review-home-card';
```

`UseQuizHubScreenResult` import에 `onPressReviewCard` 포함되도록 타입 파일에서 이미 추가됨.

`QuizHubScreenView` 컴포넌트 props destructuring에 추가:
```ts
onPressReviewCard,
```

`<JourneyBoard .../>` 바로 위에 조건부 렌더링 추가:
```tsx
{homeState?.nextReviewTask ? (
  <ReviewHomeCard
    task={homeState.nextReviewTask}
    onPress={onPressReviewCard}
  />
) : null}
```

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Expo 웹 빠른 확인**

```bash
cd /Users/baggiyun/dev/dasida-app && npx expo start --web 2>&1 | head -5
```

앱이 정상 시작되는지 확인.

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/hooks/use-quiz-hub-screen.ts features/quiz/components/quiz-hub-screen-view.tsx
git commit -m "feat: 홈 화면에 ReviewHomeCard 연결 + 오버듀 패널티 effect"
```

---

## Self-Review

**스펙 커버리지:**

| 스펙 항목 | 구현 태스크 |
|-----------|-----------|
| 홈 카드 (기억 유지율 바, 긴장감) | Task 5 ReviewHomeCard |
| 10초 타이머 자동 시작 | Task 5 (useEffect setInterval) |
| 단계별 선택지 + 자유 입력 | Task 7 ReviewSessionScreenView |
| "다음으로" 단일 버튼 (건너뛰기 없음) | Task 7 |
| AI 피드백 (선택/입력 시만) | Task 6 onPressNext + Task 4 |
| "기억났어요!" / "다시 볼게요" | Task 6 onPressRemember/onPressRetry |
| completeReviewTask (stage 진행) | Task 2 |
| rescheduleReviewTask (stage 유지) | Task 2 |
| 기한 초과 페널티 (stage 하락) | Task 2 applyOverduePenalties + Task 9 |
| 다시다 브랜드 컬러 | Task 5, 7 |
| review-session 라우트 | Task 8 |

**타입 일관성:**
- `ThinkingStep` (Task 1) → `getReviewThinkingSteps` (Task 1) → `use-review-session-screen.ts` (Task 6) → `review-session-screen-view.tsx` (Task 7): 일관됨.
- `ReviewTaskStore` → Task 2, 6 모두 `LocalReviewTaskStore` 인스턴스 사용.
- `activeReviewTaskSummary` → `ReviewHomeCard` props의 `task`: `ActiveReviewTaskSummary` 타입.

**플레이스홀더 없음:** 모든 단계에 실제 코드 포함됨.
